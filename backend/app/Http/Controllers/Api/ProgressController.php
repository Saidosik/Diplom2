<?php

namespace App\Http\Controllers\Api;

use App\Enums\LessonBlockType;
use App\Enums\ProgressStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProgressResource;
use App\Models\Course;
use App\Models\LessonBlock;
use App\Models\Progress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\CourseLearningTracker;

class ProgressController extends Controller
{

    public function __construct(
        private readonly CourseLearningTracker $learningTracker,
    ) {}

    public function open(Request $request, LessonBlock $lessonBlock): ProgressResource
    {
        $this->ensureBlockIsAvailable($lessonBlock);

        $progress = DB::transaction(function () use ($request, $lessonBlock) {
            $status = $lessonBlock->type === LessonBlockType::Theory->value
                ? ProgressStatus::Passed
                : ProgressStatus::Opened;

            $progress = Progress::query()->updateOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'lesson_block_id' => $lessonBlock->id,
                ],
                [
                    'status' => $status,
                ],
            );

            $this->learningTracker->touchFromBlock($request->user(), $lessonBlock);
            $this->learningTracker->syncCompletionFromBlock($request->user(), $lessonBlock);

            return $progress;
        });

        return new ProgressResource($progress);
    }

    public function fail(Request $request, LessonBlock $lessonBlock): ProgressResource
    {
        $this->ensureBlockIsAvailable($lessonBlock);

        abort_if(
            $lessonBlock->type === LessonBlockType::Theory->value,
            422,
            'Теоретический блок нельзя пометить как ошибочный',
        );

        $progress = DB::transaction(function () use ($request, $lessonBlock) {
            $progress = Progress::query()->updateOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'lesson_block_id' => $lessonBlock->id,
                ],
                [
                    'status' => ProgressStatus::Failed,
                ],
            );

            $this->learningTracker->touchFromBlock($request->user(), $lessonBlock);
            $this->learningTracker->syncCompletionFromBlock($request->user(), $lessonBlock);

            return $progress;
        });

        return new ProgressResource($progress);
    }

    public function pass(Request $request, LessonBlock $lessonBlock): ProgressResource
    {
        $this->ensureBlockIsAvailable($lessonBlock);

        $progress = DB::transaction(function () use ($request, $lessonBlock) {
            $progress = Progress::query()->updateOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'lesson_block_id' => $lessonBlock->id,
                ],
                [
                    'status' => ProgressStatus::Passed,
                ],
            );

            $this->learningTracker->touchFromBlock($request->user(), $lessonBlock);
            $this->learningTracker->syncCompletionFromBlock($request->user(), $lessonBlock);

            return $progress;
        });

        return new ProgressResource($progress);
    }

    public function course(Request $request, Course $course): JsonResponse
    {
        abort_unless($course->isPublished(), 404);

        $course->load([
            'modules' => fn($query) => $query
                ->visible()
                ->orderBy('sort_order'),

            'modules.lessons' => fn($query) => $query
                ->visible()
                ->orderBy('sort_order'),

            'modules.lessons.lessonBlocks' => fn($query) => $query
                ->visible()
                ->orderBy('sort_order'),
        ]);

        $blockIds = $course->modules
            ->flatMap(fn($module) => $module->lessons)
            ->flatMap(fn($lesson) => $lesson->lessonBlocks)
            ->pluck('id');

        $progress = Progress::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('lesson_block_id', $blockIds)
            ->get()
            ->keyBy('lesson_block_id');

        $totalBlocks = $blockIds->count();

        $passedBlocks = $progress
            ->filter(fn(Progress $item) => $item->status === ProgressStatus::Passed)
            ->count();

        $openedBlocks = $progress
            ->filter(fn(Progress $item) => $item->status === ProgressStatus::Opened)
            ->count();

        $failedBlocks = $progress
            ->filter(fn(Progress $item) => $item->status === ProgressStatus::Failed)
            ->count();

        return response()->json([
            'data' => [
                'course_id' => $course->id,
                'total_blocks' => $totalBlocks,
                'passed_blocks' => $passedBlocks,
                'opened_blocks' => $openedBlocks,
                'failed_blocks' => $failedBlocks,
                'percent' => $totalBlocks > 0
                    ? round(($passedBlocks / $totalBlocks) * 100)
                    : 0,

                'blocks' => $blockIds->map(function (int $blockId) use ($progress) {
                    $item = $progress->get($blockId);

                    return [
                        'lesson_block_id' => $blockId,
                        'status' => $item?->status?->value ?? null,
                        'updated_at' => $item?->updated_at?->toISOString(),
                    ];
                })->values(),
            ],
        ]);
    }

    private function ensureBlockIsAvailable(LessonBlock $lessonBlock): void
    {
        $lessonBlock->loadMissing('lesson.module.course');

        abort_unless($lessonBlock->status === 'visible', 404);
        abort_unless($lessonBlock->lesson?->status === 'visible', 404);
        abort_unless($lessonBlock->lesson?->module?->status === 'visible', 404);
        abort_unless($lessonBlock->lesson?->module?->course?->isPublished(), 404);
    }
}
