<?php

namespace App\Services;

use App\Enums\ProgressStatus;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\LessonBlock;
use App\Models\Progress;
use App\Models\User;

class CourseLearningTracker
{
    public function touchFromBlock(User $user, LessonBlock $lessonBlock): CourseEnrollment
    {
        $lessonBlock->loadMissing('lesson.module.course');

        $lesson = $lessonBlock->lesson;
        $course = $lesson?->module?->course;

        abort_unless($lesson && $course && $course->isPublished(), 404);

        $enrollment = CourseEnrollment::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'course_id' => $course->id,
            ],
            [
                'status' => 'active',
                'started_at' => now(),
            ],
        );

        $payload = [
            'last_lesson_id' => $lesson->id,
            'last_lesson_block_id' => $lessonBlock->id,
        ];

        if ($enrollment->status === 'archived') {
            $payload['status'] = 'active';
        }

        if (! $enrollment->started_at) {
            $payload['started_at'] = now();
        }

        $enrollment->update($payload);

        return $enrollment;
    }

    public function syncCompletionFromBlock(User $user, LessonBlock $lessonBlock): void
    {
        $lessonBlock->loadMissing('lesson.module.course');

        $course = $lessonBlock->lesson?->module?->course;

        if (! $course || ! $course->isPublished()) {
            return;
        }

        $this->syncCompletion($user, $course);
    }

    public function syncCompletion(User $user, Course $course): void
    {
        $course->load([
            'modules' => fn ($query) => $query
                ->visible()
                ->orderBy('sort_order'),

            'modules.lessons' => fn ($query) => $query
                ->visible()
                ->orderBy('sort_order'),

            'modules.lessons.lessonBlocks' => fn ($query) => $query
                ->visible()
                ->orderBy('sort_order'),
        ]);

        $blockIds = $course->modules
            ->flatMap(fn ($module) => $module->lessons)
            ->flatMap(fn ($lesson) => $lesson->lessonBlocks)
            ->pluck('id');

        $totalBlocks = $blockIds->count();

        if ($totalBlocks === 0) {
            return;
        }

        $passedBlocks = Progress::query()
            ->where('user_id', $user->id)
            ->whereIn('lesson_block_id', $blockIds)
            ->where('status', ProgressStatus::Passed)
            ->count();

        if ($passedBlocks < $totalBlocks) {
            return;
        }

        CourseEnrollment::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->where('status', '!=', 'completed')
            ->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
    }
}
