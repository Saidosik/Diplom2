<?php

namespace App\Http\Controllers\Api\Playground;

use App\Http\Controllers\Controller;
use App\Http\Requests\Playground\RunCodeRequest;
use App\Http\Requests\Playground\StoreCodeSnippetRequest;
use App\Http\Requests\Playground\UpdateCodeSnippetRequest;
use App\Http\Resources\Playground\CodeRunResource;
use App\Http\Resources\Playground\CodeSnippetResource;
use App\Jobs\RunPlaygroundCodeJob;
use App\Models\CodeRun;
use App\Models\CodeSnippet;
use App\Services\CodeRunner\DockerCodeRunner;
use App\Services\Community\CommunityActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class CodePlaygroundController extends Controller
{
    public function languages(): JsonResponse
    {
        $languages = collect(config('code_runner.languages', []))
            ->map(fn (array $language, string $key) => [
                'value' => $key,
                'label' => $language['label'] ?? Str::headline($key),
                'monaco' => $language['monaco'] ?? $key,
            ])
            ->values();

        return response()->json(['data' => $languages]);
    }

    public function snippets(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);
        $q = trim((string) $request->query('q', ''));
        $visibility = trim((string) $request->query('visibility', ''));
        $status = trim((string) $request->query('status', ''));
        $type = trim((string) $request->query('snippet_type', ''));

        $snippets = CodeSnippet::query()
            ->where('user_id', $request->user()->id)
            ->when($q !== '', fn ($query) => $query->where(function ($query) use ($q) {
                $query->where('title', 'ILIKE', "%{$q}%")
                    ->orWhere('language', 'ILIKE', "%{$q}%")
                    ->orWhere('snippet_type', 'ILIKE', "%{$q}%");
            }))
            ->when(in_array($visibility, ['private', 'public'], true), fn ($query) => $query->where('visibility', $visibility))
            ->when(in_array($status, ['draft', 'active', 'archived'], true), fn ($query) => $query->where('status', $status))
            ->when(in_array($type, ['snippet', 'template', 'solution', 'note'], true), fn ($query) => $query->where('snippet_type', $type))
            ->withCount('runs')
            ->latest('updated_at')
            ->paginate($perPage)
            ->withQueryString();

        return CodeSnippetResource::collection($snippets);
    }

    public function storeSnippet(StoreCodeSnippetRequest $request, DockerCodeRunner $runner, CommunityActivityService $community): CodeSnippetResource
    {
        $validated = $request->validated();
        $language = $runner->normalizeLanguage($validated['language']);

        $snippet = CodeSnippet::query()->create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'language' => $language,
            'snippet_type' => $validated['snippet_type'] ?? 'snippet',
            'code' => $validated['code'],
            'stdin' => $validated['stdin'] ?? null,
            'visibility' => $validated['visibility'],
            'status' => $validated['status'] ?? 'active',
        ]);

        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('snippet', (int) $snippet->id, false, $request->user()->id);

        if ($snippet->isPublic()) {
            $community->record(
                $request->user(),
                CommunityActivityService::ACTIVITY_CODE_SNIPPET_CREATED,
                $snippet,
                null,
                ['language' => $language],
                null,
                'Участник сохранил публичный пример кода.',
                "/playground?snippet={$snippet->id}",
                5
            );
        }

        return new CodeSnippetResource($snippet->load('user')->loadCount('runs'));
    }


    public function publicSnippet(CodeSnippet $codeSnippet): CodeSnippetResource
    {
        abort_unless($codeSnippet->isPublic(), 404);

        return new CodeSnippetResource($codeSnippet->load('user')->loadCount('runs'));
    }

    public function showSnippet(Request $request, CodeSnippet $codeSnippet): CodeSnippetResource
    {
        $this->authorizeSnippet($request, $codeSnippet);

        return new CodeSnippetResource($codeSnippet->load('user')->loadCount('runs'));
    }

    public function updateSnippet(UpdateCodeSnippetRequest $request, CodeSnippet $codeSnippet, DockerCodeRunner $runner): CodeSnippetResource
    {
        abort_unless((int) $codeSnippet->user_id === (int) $request->user()->id, 403);

        $validated = $request->validated();

        if (array_key_exists('language', $validated)) {
            $validated['language'] = $runner->normalizeLanguage($validated['language']);
        }

        $codeSnippet->update($validated);
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('snippet', (int) $codeSnippet->id, true, $request->user()->id);

        return new CodeSnippetResource($codeSnippet->fresh()->load('user')->loadCount('runs'));
    }

    public function destroySnippet(Request $request, CodeSnippet $codeSnippet): JsonResponse
    {
        abort_unless((int) $codeSnippet->user_id === (int) $request->user()->id, 403);

        $codeSnippet->delete();
        app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('snippet', (int) $codeSnippet->id, true, $request->user()->id);

        return response()->json(['message' => 'Сниппет удалён.']);
    }

    public function runs(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);

        $runs = CodeRun::query()
            ->where('user_id', $request->user()->id)
            ->with('snippet')
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        $runs->getCollection()->transform(fn (CodeRun $run) => $this->refreshRunState($run));

        return CodeRunResource::collection($runs);
    }

    public function showRun(Request $request, CodeRun $codeRun): CodeRunResource
    {
        abort_unless((int) $codeRun->user_id === (int) $request->user()->id, 403);

        return new CodeRunResource($this->refreshRunState($codeRun->load('snippet')));
    }

    public function run(RunCodeRequest $request, DockerCodeRunner $runner): CodeRunResource
    {
        $validated = $request->validated();
        $language = $runner->normalizeLanguage($validated['language']);
        $snippet = $this->resolveSnippet($request, $validated);
        $stdin = $validated['stdin'] ?? $snippet?->stdin;
        $code = $validated['code'];

        if (! $snippet && (bool) ($validated['save'] ?? false)) {
            $snippet = CodeSnippet::query()->create([
                'user_id' => $request->user()->id,
                'title' => ($validated['title'] ?? null) ?: $this->defaultTitle($language),
                'language' => $language,
                'code' => $code,
                'stdin' => $stdin,
                'visibility' => $validated['visibility'] ?? 'private',
                'snippet_type' => $validated['snippet_type'] ?? 'snippet',
                'status' => $validated['snippet_status'] ?? 'active',
                'last_run_status' => 'queued',
                'last_run_at' => now(),
            ]);
        } elseif ($snippet) {
            $snippet->update([
                'language' => $language,
                'code' => $code,
                'stdin' => $stdin,
                'last_run_status' => 'queued',
                'last_run_at' => now(),
            ]);
        }

        $run = CodeRun::query()->create([
            'user_id' => $request->user()->id,
            'code_snippet_id' => $snippet?->id,
            'language' => $language,
            'code' => $code,
            'stdin' => $stdin,
            'status' => 'queued',
            'message' => 'Запуск добавлен в очередь проверки кода.',
            'started_at' => null,
        ]);

        if ($snippet) {
            app(\App\Services\Ai\AiIndexingDispatcher::class)->queue('snippet', (int) $snippet->id, true, $request->user()->id);
        }

        RunPlaygroundCodeJob::dispatch($run->id);

        return new CodeRunResource($run->fresh()->load('snippet'));
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function resolveSnippet(Request $request, array $validated): ?CodeSnippet
    {
        if (! isset($validated['snippet_id'])) {
            return null;
        }

        $snippet = CodeSnippet::query()->findOrFail($validated['snippet_id']);
        abort_unless((int) $snippet->user_id === (int) $request->user()->id, 403);

        return $snippet;
    }

    private function authorizeSnippet(Request $request, CodeSnippet $snippet): void
    {
        if ($snippet->isPublic()) {
            return;
        }

        abort_unless($request->user() && (int) $snippet->user_id === (int) $request->user()->id, 403);
    }

    private function refreshRunState(CodeRun $run): CodeRun
    {
        if (! in_array($run->status, ['queued', 'running'], true)) {
            return $run;
        }

        if ($run->status === 'queued') {
            $queuedAt = $run->created_at;
            $staleAfter = (int) config('code_runner.queue_stale_seconds', 120);

            if ($queuedAt && $queuedAt->lt(now()->subSeconds($staleAfter))) {
                return $this->finishRunAs(
                    $run,
                    'failed',
                    'Запуск не был взят обработчиком очереди. Проверьте, что queue worker слушает очередь code-runs: php artisan queue:work redis --queue=code-runs,default.',
                    1
                );
            }
        }

        if ($run->status === 'running') {
            $startedAt = $run->started_at ?? $run->updated_at ?? $run->created_at;
            $staleAfter = (int) config('code_runner.running_stale_seconds', 240);

            if ($startedAt && $startedAt->lt(now()->subSeconds($staleAfter))) {
                return $this->finishRunAs(
                    $run,
                    'time_limit_error',
                    'Запуск завис или worker был остановлен во время выполнения. Попробуйте запустить код ещё раз.',
                    124
                );
            }
        }

        return $run;
    }

    private function finishRunAs(CodeRun $run, string $status, string $message, int $exitCode): CodeRun
    {
        $run->update([
            'status' => $status,
            'stderr' => $message,
            'exit_code' => $exitCode,
            'message' => $message,
            'finished_at' => now(),
        ]);

        $run->loadMissing('snippet');

        if ($run->snippet) {
            $run->snippet->update([
                'last_run_status' => $status,
                'last_run_at' => now(),
            ]);
        }

        return $run->fresh('snippet') ?? $run;
    }

    private function defaultTitle(string $language): string
    {
        return 'Сниппет ' . Str::upper($language) . ' от ' . now()->format('d.m.Y H:i');
    }
}
