<?php

namespace App\Jobs;

use App\Enums\IssueAnswerStatus;
use App\Events\IssueAnswerChanged;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\User;
use App\Services\Ai\AiIndexingDispatcher;
use App\Services\Ai\AiSettingsService;
use App\Services\Ai\GroundedAnswerService;
use App\Services\Ai\RagSearchService;
use App\Services\Community\CommunityActivityService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class GenerateAiQuestionAnswerJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 180;

    public function __construct(public readonly int $questionId)
    {
    }

    public function handle(RagSearchService $search, GroundedAnswerService $answers, CommunityActivityService $community, AiSettingsService $settings): void
    {
        if (! (bool) config('ai.question_auto_answer.enabled', true)) {
            return;
        }

        $question = IssueQuestion::query()
            ->with(['blocks', 'tags', 'author'])
            ->find($this->questionId);

        if (! $question || ! $question->isPublished()) {
            return;
        }

        if ($question->answers()->where('is_ai_generated', true)->exists()) {
            return;
        }

        $aiUser = $this->aiUser();
        $query = $this->questionText($question);
        $rag = $search->search($query, [
            'type' => 'all',
            'limit' => 8,
        ]);

        $model = $settings->defaultChatModelId();
        $answer = $answers->answer($query, $rag['data'] ?? [], 'question_auto_answer', [
            'model' => $model,
        ]);

        $issueAnswer = IssueAnswer::query()->create([
            'issue_question_id' => $question->id,
            'author_id' => $aiUser->id,
            'status' => IssueAnswerStatus::Published->value,
            'is_ai_generated' => true,
            'ai_model' => $model,
            'ai_sources' => $rag['data'] ?? [],
        ]);

        $issueAnswer->blocks()->create([
            'type' => 'markdown',
            'sort_order' => 0,
            'content' => [
                'text' => $this->formatAnswer($answer['answer']),
            ],
        ]);

        app(AiIndexingDispatcher::class)->queue('answer', (int) $issueAnswer->id, false, $aiUser->id);

        if ($question->author) {
            $community->notify(
                $question->author,
                'ai_answer_created',
                'AI подготовил предварительный ответ',
                "К вопросу «{$question->title}» добавлен AI-ответ. Проверьте его перед применением.",
                "/questions/{$question->slug}#answer-{$issueAnswer->id}",
                ['question_id' => $question->id, 'answer_id' => $issueAnswer->id],
                $aiUser
            );
        }

        $issueAnswer->load(['author', 'blocks', 'question']);
        broadcast(new IssueAnswerChanged('created', $issueAnswer))->toOthers();
    }

    private function aiUser(): User
    {
        return User::query()->firstOrCreate(
            ['email' => 'ai@devcommunity.test'],
            [
                'name' => 'Vektor AI',
                'password' => Hash::make(Str::random(32)),
                'role' => 'user',
                'headline' => 'AI-помощник платформы',
                'bio' => 'Служебный профиль для предварительных ответов, сформированных AI.',
                'email_verified_at' => now(),
            ]
        );
    }

    private function questionText(IssueQuestion $question): string
    {
        $blocks = $question->blocks
            ->map(fn ($block) => $this->flatten($block->content ?? []))
            ->filter()
            ->implode("\n\n");

        $tags = $question->tags->pluck('name')->implode(', ');

        return trim(implode("\n\n", array_filter([
            'Вопрос: ' . $question->title,
            $question->excerpt ? 'Краткая суть: ' . $question->excerpt : null,
            $tags ? 'Теги: ' . $tags : null,
            $blocks,
        ])));
    }

    private function flatten(mixed $value): string
    {
        if (is_string($value) || is_numeric($value)) {
            return (string) $value;
        }

        if (! is_array($value)) {
            return '';
        }

        return collect($value)->map(fn ($item) => $this->flatten($item))->filter()->implode(' ');
    }

    private function formatAnswer(string $answer): string
    {
        return implode("\n\n", [
            '> **AI-ответ.** Это предварительный ответ, сформированный автоматически. Он может содержать ошибки — проверьте команды, версии библиотек и настройки окружения перед применением.',
            trim($answer),
        ]);
    }
}
