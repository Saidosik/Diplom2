<?php

namespace App\Http\Controllers\Api\Interaction;

use App\Events\ContentCommentChanged;
use App\Enums\IssueAnswerStatus;
use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Interaction\StoreCommentRequest;
use App\Http\Requests\Interaction\UpdateCommentRequest;
use App\Http\Resources\Interaction\CommentResource;
use App\Models\Comment;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\Community\CommunityActivityService;
use Illuminate\Validation\Rule;

class CommentController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'commentable_type' => ['required', 'string', Rule::in(['publication', 'issue_question', 'issue_answer'])],
            'commentable_id' => ['required', 'integer', 'min:1'],
        ]);

        $target = $this->resolveTarget($validated['commentable_type'], (int) $validated['commentable_id']);

        $perPage = min(max((int) $request->query('per_page', 10), 1), 50);

        $comments = Comment::query()
            ->published()
            ->whereMorphedTo('commentable', $target)
            ->whereNull('parent_id')
            ->with([
                'user',
                'repliesRecursive',
            ])
            ->withCount('reports')
            ->oldest()
            ->paginate($perPage)
            ->withQueryString();

        return CommentResource::collection($comments);
    }

    public function myIndex(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 10), 1), 50);

        $comments = Comment::query()
            ->where('user_id', $request->user()->id)
            ->with(['user'])
            ->withCount('reports')
            ->latest()
            ->paginate($perPage);

        return CommentResource::collection($comments);
    }

    public function store(StoreCommentRequest $request, CommunityActivityService $community)
    {
        $data = $request->validated();
        $target = $this->resolveTarget($data['commentable_type'], (int) $data['commentable_id']);

        $parent = null;

        if (!empty($data['parent_id'])) {
            $parent = Comment::query()->published()->findOrFail((int) $data['parent_id']);

            abort_unless(
                $parent->commentable_type === $target->getMorphClass() && (int) $parent->commentable_id === (int) $target->getKey(),
                422,
                'Ответ можно оставить только к комментарию этого же материала.'
            );
        }

        $comment = new Comment([
            'user_id' => $request->user()->id,
            'parent_id' => $data['parent_id'] ?? null,
            'content' => $data['content'],
            'status' => Comment::STATUS_PUBLISHED,
        ]);

        $comment->commentable()->associate($target);
        $comment->save();

        $community->record(
            $request->user(),
            CommunityActivityService::ACTIVITY_COMMENT_CREATED,
            $comment,
            $target,
            ['comment_id' => $comment->id, 'target_type' => $target->getMorphClass(), 'target_id' => $target->getKey()],
            "{$request->user()->name} добавил комментарий",
            null,
            $community->sourceLink($comment),
            4
        );

        $community->awardReputation(
            $request->user(),
            1,
            CommunityActivityService::REASON_COMMENT_CREATED,
            $comment,
            $request->user()
        );

        $this->notifyCommentTarget($community, $request, $target, $comment, $parent);

        broadcast(new ContentCommentChanged(
            'created',
            $target->getMorphClass(),
            (int) $target->getKey(),
            $comment->load('user')->loadCount('reports')
        ))->toOthers();

        return (new CommentResource($comment->load('user')->loadCount('reports')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateCommentRequest $request, Comment $comment)
    {
        $this->authorizeComment($request, $comment);

        $comment->update([
            'content' => $request->validated('content'),
        ]);

        broadcast(new ContentCommentChanged(
            'updated',
            (string) $comment->commentable_type,
            (int) $comment->commentable_id,
            $comment->load('user')->loadCount('reports')
        ))->toOthers();

        return new CommentResource($comment->load('user')->loadCount('reports'));
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        $this->authorizeComment($request, $comment);

        $targetType = (string) $comment->commentable_type;
        $targetId = (int) $comment->commentable_id;

        $comment->delete();

        broadcast(new ContentCommentChanged('deleted', $targetType, $targetId))->toOthers();

        return response()->json([
            'message' => 'Комментарий удалён.',
        ]);
    }

    private function notifyCommentTarget(CommunityActivityService $community, Request $request, Model $target, Comment $comment, ?Comment $parent = null): void
    {
        $actor = $request->user();

        if ($parent) {
            $parent->loadMissing('user');

            if ($parent->user) {
                $community->notify(
                    $parent->user,
                    'comment_reply',
                    'Ответ на комментарий',
                    "{$actor->name} ответил на ваш комментарий.",
                    $community->sourceLink($comment),
                    ['parent_comment_id' => $parent->id, 'comment_id' => $comment->id],
                    $actor
                );
            }

            $community->notifySubscribers(
                $parent,
                'comment_reply',
                'Новый ответ в ветке комментариев',
                "{$actor->name} оставил ответ в комментариях, за которыми вы следите.",
                $community->sourceLink($comment),
                ['parent_comment_id' => $parent->id, 'comment_id' => $comment->id],
                $actor
            );

            return;
        }

        if ($target instanceof Publication && $target->author) {
            $community->notify(
                $target->author,
                'comment_created',
                'Новый комментарий к публикации',
                "{$actor->name} прокомментировал материал «{$target->title}».",
                "/publications/{$target->slug}#comment-{$comment->id}",
                ['publication_id' => $target->id, 'comment_id' => $comment->id],
                $actor
            );

            $community->notifySubscribers(
                $target,
                'comment_created',
                'Новый комментарий в обсуждении',
                "{$actor->name} оставил комментарий к публикации «{$target->title}».",
                "/publications/{$target->slug}#comment-{$comment->id}",
                ['publication_id' => $target->id, 'comment_id' => $comment->id],
                $actor
            );

            return;
        }

        if ($target instanceof IssueQuestion) {
            $target->loadMissing('author');
            $link = "/questions/{$target->slug}#comment-{$comment->id}";

            if ($target->author) {
                $community->notify(
                    $target->author,
                    'comment_created',
                    'Новый комментарий к вопросу',
                    "{$actor->name} прокомментировал вопрос «{$target->title}».",
                    $link,
                    ['question_id' => $target->id, 'comment_id' => $comment->id],
                    $actor
                );
            }

            $community->notifySubscribers(
                $target,
                'comment_created',
                'Новый комментарий к вопросу',
                "{$actor->name} оставил комментарий к вопросу «{$target->title}».",
                $link,
                ['question_id' => $target->id, 'comment_id' => $comment->id],
                $actor
            );

            return;
        }

        if ($target instanceof IssueAnswer) {
            $target->loadMissing(['author', 'question']);
            $link = $target->question?->slug ? "/questions/{$target->question->slug}#comment-{$comment->id}" : null;

            if ($target->author) {
                $community->notify(
                    $target->author,
                    'comment_created',
                    'Новый комментарий к ответу',
                    "{$actor->name} прокомментировал ваш ответ.",
                    $link,
                    ['answer_id' => $target->id, 'comment_id' => $comment->id],
                    $actor
                );
            }

            $community->notifySubscribers(
                $target,
                'comment_created',
                'Новый комментарий к ответу',
                "{$actor->name} оставил комментарий к ответу, за которым вы следите.",
                $link,
                ['answer_id' => $target->id, 'comment_id' => $comment->id],
                $actor
            );
        }
    }

    private function authorizeComment(Request $request, Comment $comment): void
    {
        $user = $request->user();

        abort_unless(
            $user && ($comment->user_id === $user->id || $user->isAdmin()),
            403,
            'Нет доступа к этому комментарию.'
        );
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
            default => abort(422, 'Неподдерживаемый тип объекта для комментария.'),
        };
    }
}
