<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\IssueAnswerStatus;
use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\Comment;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class AdminReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in([Report::STATUS_NEW, Report::STATUS_REVIEWED, Report::STATUS_REJECTED, 'all'])],
            'type' => ['nullable', 'string', 'max:64'],
            'reason' => ['nullable', Rule::in(Report::reasons())],
            'q' => ['nullable', 'string', 'max:160'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Report::query()->with(['user', 'reportable'])->latest();

        if (($validated['status'] ?? 'new') !== 'all') {
            $query->where('status', $validated['status'] ?? Report::STATUS_NEW);
        }

        if (! empty($validated['type'])) {
            $query->where('reportable_type', $validated['type']);
        }

        if (! empty($validated['reason'])) {
            $query->where('reason', $validated['reason']);
        }

        if (! empty($validated['q'])) {
            $search = trim($validated['q']);
            $query->where(function ($builder) use ($search) {
                $builder->where('details', 'ILIKE', "%{$search}%")
                    ->orWhereHas('user', fn ($users) => $users
                        ->where('name', 'ILIKE', "%{$search}%")
                        ->orWhere('email', 'ILIKE', "%{$search}%"));
            });
        }

        $reports = $query->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json([
            'data' => self::serializeReports(collect($reports->items())),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    public function show(int $report): JsonResponse
    {
        $model = Report::query()->with(['user', 'reportable'])->findOrFail($report);

        return response()->json(['data' => self::serializeReport($model)]);
    }

    public function update(Request $request, int $report): JsonResponse
    {
        $model = Report::query()->with(['reportable', 'user'])->findOrFail($report);

        $data = $request->validate([
            'status' => ['required', Rule::in([Report::STATUS_NEW, Report::STATUS_REVIEWED, Report::STATUS_REJECTED])],
            'action' => ['nullable', Rule::in(['none', 'hide_target', 'restore_target', 'delete_target'])],
        ]);

        $action = $data['action'] ?? 'none';

        if ($action === 'hide_target') {
            $this->hideTarget($model->reportable);
        }

        if ($action === 'restore_target') {
            $this->restoreTarget($model->reportable);
        }

        if ($action === 'delete_target') {
            $this->deleteTarget($model->reportable);
        }

        $model->update(['status' => $data['status']]);

        return response()->json(['data' => self::serializeReport($model->fresh(['user', 'reportable']))]);
    }

    private function hideTarget(mixed $target): void
    {
        if ($target instanceof Publication) {
            $target->update(['status' => PublicationStatus::Hidden->value]);
        }

        if ($target instanceof IssueQuestion) {
            $target->update(['status' => IssueQuestionStatus::Hidden->value]);
        }

        if ($target instanceof IssueAnswer) {
            $target->update(['status' => IssueAnswerStatus::Hidden->value]);
        }

        if ($target instanceof Comment) {
            $target->update(['status' => Comment::STATUS_HIDDEN]);
        }
    }

    private function restoreTarget(mixed $target): void
    {
        if ($target instanceof Publication) {
            $target->update(['status' => PublicationStatus::Published->value]);
        }

        if ($target instanceof IssueQuestion) {
            $target->update(['status' => IssueQuestionStatus::Published->value]);
        }

        if ($target instanceof IssueAnswer) {
            $target->update(['status' => IssueAnswerStatus::Published->value]);
        }

        if ($target instanceof Comment) {
            $target->update(['status' => Comment::STATUS_PUBLISHED]);
        }
    }

    private function deleteTarget(mixed $target): void
    {
        if ($target instanceof Publication || $target instanceof IssueQuestion || $target instanceof Comment || $target instanceof ChatMessage) {
            $target->delete();
        }

        if ($target instanceof IssueAnswer) {
            $target->update(['status' => IssueAnswerStatus::Hidden->value]);
        }
    }

    /**
     * @param Collection<int, Report>|EloquentCollection<int, Report> $reports
     */
    public static function serializeReports(Collection|EloquentCollection $reports): array
    {
        return $reports->map(fn (Report $report) => self::serializeReport($report))->values()->all();
    }

    public static function serializeReport(Report $report): array
    {
        return [
            'id' => $report->id,
            'status' => $report->status,
            'reason' => $report->reason,
            'details' => $report->details,
            'reportable_type' => $report->reportable_type,
            'reportable_id' => $report->reportable_id,
            'created_at' => $report->created_at?->toISOString(),
            'updated_at' => $report->updated_at?->toISOString(),
            'user' => $report->user ? AdminUserController::serializeUser($report->user) : null,
            'target' => self::targetSummary($report->reportable),
        ];
    }

    public static function targetSummary(mixed $target): ?array
    {
        if ($target instanceof Publication) {
            return [
                'type' => 'publication',
                'id' => $target->id,
                'title' => $target->title,
                'status' => $target->status?->value ?? $target->status,
                'href' => '/publications/' . $target->slug,
                'deleted_at' => $target->deleted_at?->toISOString(),
            ];
        }

        if ($target instanceof IssueQuestion) {
            return [
                'type' => 'issue_question',
                'id' => $target->id,
                'title' => $target->title,
                'status' => $target->status?->value ?? $target->status,
                'href' => '/questions/' . $target->slug,
                'deleted_at' => $target->deleted_at?->toISOString(),
            ];
        }

        if ($target instanceof IssueAnswer) {
            $question = $target->relationLoaded('question') ? $target->question : $target->question()->first();

            return [
                'type' => 'issue_answer',
                'id' => $target->id,
                'title' => $question?->title ?? 'Ответ на вопрос',
                'status' => $target->status?->value ?? $target->status,
                'href' => $question?->slug ? '/questions/' . $question->slug . '#answer-' . $target->id : '/questions',
            ];
        }

        if ($target instanceof Comment) {
            return [
                'type' => 'comment',
                'id' => $target->id,
                'title' => mb_strimwidth($target->content, 0, 90, '…'),
                'status' => $target->status,
                'href' => null,
                'deleted_at' => $target->deleted_at?->toISOString(),
            ];
        }


        if ($target instanceof User) {
            return [
                'type' => 'user',
                'id' => $target->id,
                'title' => $target->name,
                'status' => $target->deleted_at ? 'deleted' : ($target->profile_visibility ?? 'public'),
                'href' => '/users/' . $target->id,
                'deleted_at' => $target->deleted_at?->toISOString(),
            ];
        }

        if ($target instanceof ChatMessage) {
            return [
                'type' => 'chat_message',
                'id' => $target->id,
                'title' => mb_strimwidth((string) $target->body, 0, 90, '…'),
                'status' => $target->deleted_at ? 'deleted' : 'published',
                'href' => '/chats/' . $target->chat_conversation_id,
                'deleted_at' => $target->deleted_at?->toISOString(),
            ];
        }

        return null;
    }
}
