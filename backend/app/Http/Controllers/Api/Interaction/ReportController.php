<?php

namespace App\Http\Controllers\Api\Interaction;

use App\Enums\IssueAnswerStatus;
use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Interaction\StoreReportRequest;
use App\Http\Resources\Interaction\ReportResource;
use App\Models\Comment;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Report;
use Illuminate\Database\Eloquent\Model;

class ReportController extends Controller
{
    public function store(StoreReportRequest $request)
    {
        $data = $request->validated();
        $target = $this->resolveTarget($data['reportable_type'], (int) $data['reportable_id']);

        $report = Report::query()->firstOrCreate(
            [
                'user_id' => $request->user()->id,
                'reportable_type' => $target->getMorphClass(),
                'reportable_id' => $target->getKey(),
                'status' => Report::STATUS_NEW,
            ],
            [
                'reason' => $data['reason'],
                'details' => $data['details'] ?? null,
            ]
        );

        if (!$report->wasRecentlyCreated) {
            $report->update([
                'reason' => $data['reason'],
                'details' => $data['details'] ?? null,
            ]);
        }

        return (new ReportResource($report))
            ->response()
            ->setStatusCode($report->wasRecentlyCreated ? 201 : 200);
    }

    private function resolveTarget(string $type, int $id): Model
    {
        return match ($type) {
            'publication' => Publication::query()
                ->where('status', PublicationStatus::Published->value)
                ->findOrFail($id),
            'issue_question' => IssueQuestion::query()
                ->where('status', IssueQuestionStatus::Published->value)
                ->findOrFail($id),
            'issue_answer' => IssueAnswer::query()
                ->where('status', IssueAnswerStatus::Published->value)
                ->findOrFail($id),
            'comment' => Comment::query()
                ->published()
                ->findOrFail($id),
            default => abort(422, 'Неподдерживаемый тип объекта для жалобы.'),
        };
    }
}
