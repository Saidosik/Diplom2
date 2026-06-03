<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\CodeSnippet;
use App\Models\Comment;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Report;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'stats' => [
                'users' => [
                    'total' => User::withTrashed()->count(),
                    'active' => User::query()->count(),
                    'deleted' => User::onlyTrashed()->count(),
                    'admins' => User::query()->where('role', 'admin')->count(),
                    'online' => User::query()->where('presence_status', 'online')->count(),
                ],
                'reports' => [
                    'total' => Report::query()->count(),
                    'new' => Report::query()->where('status', Report::STATUS_NEW)->count(),
                    'reviewed' => Report::query()->where('status', Report::STATUS_REVIEWED)->count(),
                    'rejected' => Report::query()->where('status', Report::STATUS_REJECTED)->count(),
                ],
                'content' => [
                    'publications' => [
                        'total' => Publication::withTrashed()->count(),
                        'published' => Publication::query()->where('status', PublicationStatus::Published->value)->count(),
                        'hidden' => Publication::query()->where('status', PublicationStatus::Hidden->value)->count(),
                        'archived' => Publication::query()->where('status', PublicationStatus::Archived->value)->count(),
                    ],
                    'questions' => [
                        'total' => IssueQuestion::withTrashed()->count(),
                        'published' => IssueQuestion::query()->where('status', IssueQuestionStatus::Published->value)->count(),
                        'hidden' => IssueQuestion::query()->where('status', IssueQuestionStatus::Hidden->value)->count(),
                        'closed' => IssueQuestion::query()->where('status', IssueQuestionStatus::Closed->value)->count(),
                    ],
                    'answers' => [
                        'total' => IssueAnswer::query()->count(),
                        'hidden' => IssueAnswer::query()->where('status', 'hidden')->count(),
                        'ai' => IssueAnswer::query()->where('is_ai_generated', true)->count(),
                    ],
                    'comments' => [
                        'total' => Comment::withTrashed()->count(),
                        'hidden' => Comment::query()->where('status', Comment::STATUS_HIDDEN)->count(),
                    ],
                    'tags' => Tag::query()->count(),
                    'snippets' => CodeSnippet::query()->count(),
                ],
                'chats' => [
                    'conversations' => ChatConversation::withTrashed()->count(),
                    'messages' => ChatMessage::withTrashed()->count(),
                    'deleted_messages' => ChatMessage::onlyTrashed()->count(),
                ],
            ],
            'recent_reports' => AdminReportController::serializeReports(
                Report::query()
                    ->with(['user', 'reportable'])
                    ->latest()
                    ->limit(8)
                    ->get()
            ),
            'recent_users' => User::query()
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (User $user) => AdminUserController::serializeUser($user))
                ->values(),
            'popular_tags' => Tag::query()
                ->withCount(['publications', 'issueQuestions'])
                ->get()
                ->sortByDesc(fn (Tag $tag) => (int) $tag->publications_count + (int) $tag->issue_questions_count)
                ->take(8)
                ->map(fn (Tag $tag) => [
                    'id' => $tag->id,
                    'name' => $tag->name,
                    'slug' => $tag->slug,
                    'color' => $tag->color,
                    'usage_count' => (int) $tag->publications_count + (int) $tag->issue_questions_count,
                ])
                ->values(),
        ]);
    }
}
