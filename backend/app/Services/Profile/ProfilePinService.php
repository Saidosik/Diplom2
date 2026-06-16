<?php

namespace App\Services\Profile;

use App\Enums\IssueAnswerStatus;
use App\Enums\IssueQuestionStatus;
use App\Enums\PublicationStatus;
use App\Models\CodeSnippet;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\PinnedItem;
use App\Models\Publication;
use App\Models\User;
use App\Models\UserFile;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProfilePinService
{
    public const MAX_PINS = 5;

    public function pin(User $user, string $type, int $id, array $attributes = []): PinnedItem
    {
        $target = $this->resolveOwnPinnable($user, $type, $id);

        return DB::transaction(function () use ($user, $target, $attributes) {
            $existing = PinnedItem::query()->where('user_id', $user->id)->where('pinnable_type', $target->getMorphClass())->where('pinnable_id', $target->getKey())->first();

            if (! $existing && PinnedItem::query()->where('user_id', $user->id)->count() >= self::MAX_PINS) {
                throw ValidationException::withMessages(['pinnable_id' => 'В профиле можно закрепить не больше 5 материалов.']);
            }

            return PinnedItem::query()->updateOrCreate(
                ['user_id' => $user->id, 'pinnable_type' => $target->getMorphClass(), 'pinnable_id' => $target->getKey()],
                [
                    'title_override' => array_key_exists('title_override', $attributes) ? $attributes['title_override'] : $existing?->title_override,
                    'description_override' => array_key_exists('description_override', $attributes) ? $attributes['description_override'] : $existing?->description_override,
                    'position' => (int) ($attributes['position'] ?? ($existing?->position ?? 0)),
                    'visibility' => $attributes['visibility'] ?? ($existing?->visibility ?? 'public'),
                ]
            );
        });
    }

    public function unpin(User $user, string $type, int $id): void
    {
        PinnedItem::query()
            ->where('user_id', $user->id)
            ->where('pinnable_type', $this->pinnableMorphClass($type))
            ->where('pinnable_id', $id)
            ->delete();
    }

    private function pinnableMorphClass(string $type): string
    {
        return match ($type) {
            'publication' => (new Publication())->getMorphClass(),
            'issue_question' => (new IssueQuestion())->getMorphClass(),
            'issue_answer' => (new IssueAnswer())->getMorphClass(),
            'code_snippet' => (new CodeSnippet())->getMorphClass(),
            'user_file' => (new UserFile())->getMorphClass(),
            default => throw ValidationException::withMessages(['pinnable_type' => 'Неподдерживаемый тип закрепа.']),
        };
    }

    private function resolveOwnPinnable(User $user, string $type, int $id): Model
    {
        return match ($type) {
            'publication' => Publication::query()->where('author_id', $user->id)->where('status', PublicationStatus::Published->value)->findOrFail($id),
            'issue_question' => IssueQuestion::query()->where('author_id', $user->id)->where('status', IssueQuestionStatus::Published->value)->findOrFail($id),
            'issue_answer' => IssueAnswer::query()->where('author_id', $user->id)->where('status', IssueAnswerStatus::Published->value)->whereHas('question', fn ($query) => $query->where('status', IssueQuestionStatus::Published->value))->findOrFail($id),
            'code_snippet' => CodeSnippet::query()->where('user_id', $user->id)->where('visibility', 'public')->where('status', CodeSnippet::STATUS_ACTIVE)->findOrFail($id),
            'user_file' => UserFile::query()->where('user_id', $user->id)->where('visibility', 'public')->findOrFail($id),
            default => throw ValidationException::withMessages(['pinnable_type' => 'Неподдерживаемый тип закрепа.']),
        };
    }
}
