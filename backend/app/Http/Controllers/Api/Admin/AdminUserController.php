<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', Rule::in(['user', 'moderator', 'admin'])],
            'status' => ['nullable', Rule::in(['active', 'deleted', 'all'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = User::withTrashed()
            ->withCount(['publications', 'issueQuestions', 'issueAnswers', 'comments'])
            ->latest();

        if (($validated['status'] ?? null) === 'deleted') {
            $query->onlyTrashed();
        } elseif (($validated['status'] ?? 'active') === 'active') {
            $query->whereNull('deleted_at');
        }

        if (! empty($validated['role'])) {
            $query->where('role', $validated['role']);
        }

        if (! empty($validated['q'])) {
            $search = trim($validated['q']);
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('email', 'ILIKE', "%{$search}%")
                    ->orWhere('headline', 'ILIKE', "%{$search}%");
            });
        }

        $users = $query->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json([
            'data' => collect($users->items())->map(fn (User $user) => self::serializeUser($user))->values(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function show(int $user): JsonResponse
    {
        $model = User::withTrashed()
            ->withCount(['publications', 'issueQuestions', 'issueAnswers', 'comments', 'reports'])
            ->findOrFail($user);

        return response()->json(['data' => self::serializeUser($model, detailed: true)]);
    }

    public function update(Request $request, int $user): JsonResponse
    {
        $model = User::withTrashed()->findOrFail($user);

        if (! $request->user()?->isAdmin()) {
            abort(403, 'Изменять роли может только администратор.');
        }

        if ($request->user()->id === $model->id) {
            abort(422, 'Нельзя менять собственную роль.');
        }

        $data = $request->validate([
            'role' => ['required', Rule::in(['user', 'moderator', 'admin'])],
        ]);

        $model->forceFill(['role' => $data['role']])->save();

        return response()->json(['data' => self::serializeUser($model)]);
    }

    public function destroy(Request $request, int $user): JsonResponse
    {
        $model = User::query()->findOrFail($user);

        if ($request->user()->id === $model->id) {
            abort(422, 'Нельзя заблокировать самого себя.');
        }

        if ($model->isAdmin() && ! $request->user()?->isAdmin()) {
            abort(403, 'Модератор не может блокировать администратора.');
        }

        $model->delete();
        $model = User::withTrashed()->findOrFail($user);

        return response()->json(['data' => self::serializeUser($model)]);
    }

    public function restore(int $user): JsonResponse
    {
        $model = User::withTrashed()->findOrFail($user);
        $model->restore();

        return response()->json(['data' => self::serializeUser($model->fresh())]);
    }

    public static function serializeUser(User $user, bool $detailed = false): array
    {
        $payload = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'headline' => $user->headline,
            'bio' => $detailed ? $user->bio : null,
            'avatar' => $user->avatar,
            'avatar_url' => $user->avatar ? Storage::disk('public')->url($user->avatar) : null,
            'reputation_score' => (int) ($user->reputation_score ?? 0),
            'presence_status' => $user->presence_status ?? 'offline',
            'is_online' => method_exists($user, 'isOnline') ? $user->isOnline() : false,
            'last_seen_at' => $user->last_seen_at?->toISOString(),
            'email_verified_at' => $user->email_verified_at?->toISOString(),
            'deleted_at' => $user->deleted_at?->toISOString(),
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
            'counts' => [
                'publications' => (int) ($user->publications_count ?? 0),
                'questions' => (int) ($user->issue_questions_count ?? 0),
                'answers' => (int) ($user->issue_answers_count ?? 0),
                'comments' => (int) ($user->comments_count ?? 0),
                'reports' => (int) ($user->reports_count ?? 0),
            ],
        ];

        if (! $detailed) {
            unset($payload['bio']);
        }

        return $payload;
    }
}
