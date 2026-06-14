<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Models\UserFile;
use App\Models\UserFileFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserFileFolderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $folders = UserFileFolder::query()
            ->where('user_id', $request->user()->id)
            ->withCount('userFiles')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (UserFileFolder $folder) => $this->toArray($folder));

        return response()->json(['data' => $folders]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('user_file_folders', 'name')->where('user_id', $request->user()->id)],
            'color' => ['nullable', 'string', 'max:30'],
            'icon' => ['nullable', 'string', 'max:40'],
            'sort_order' => ['nullable', 'integer'],
        ], [
            'name.required' => 'Название папки обязательно.',
            'name.unique' => 'Папка с таким названием уже существует.',
        ]);

        $folder = UserFileFolder::query()->create([
            'user_id' => $request->user()->id,
            'name' => $data['name'],
            'slug' => Str::slug($data['name']) ?: null,
            'color' => $data['color'] ?? null,
            'icon' => $data['icon'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $this->toArray($folder->loadCount('userFiles'))], 201);
    }

    public function update(Request $request, UserFileFolder $folder): JsonResponse
    {
        $this->authorizeOwner($request, $folder);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80', Rule::unique('user_file_folders', 'name')->where('user_id', $request->user()->id)->ignore($folder->id)],
            'color' => ['nullable', 'string', 'max:30'],
            'icon' => ['nullable', 'string', 'max:40'],
            'sort_order' => ['nullable', 'integer'],
        ], [
            'name.required' => 'Название папки обязательно.',
            'name.unique' => 'Папка с таким названием уже существует.',
        ]);

        if (array_key_exists('name', $data)) {
            $data['slug'] = Str::slug($data['name']) ?: null;
        }

        $folder->update($data);

        return response()->json(['data' => $this->toArray($folder->fresh()->loadCount('userFiles'))]);
    }

    public function destroy(Request $request, UserFileFolder $folder): JsonResponse
    {
        $this->authorizeOwner($request, $folder);

        UserFile::query()->where('folder_id', $folder->id)->update(['folder_id' => null]);
        $folder->delete();

        return response()->json(['message' => 'Папка удалена. Файлы перемещены в «Без папки».']);
    }

    private function authorizeOwner(Request $request, UserFileFolder $folder): void
    {
        abort_unless((int) $folder->user_id === (int) $request->user()->id, 403);
    }

    private function toArray(UserFileFolder $folder): array
    {
        return [
            'id' => $folder->id,
            'name' => $folder->name,
            'color' => $folder->color,
            'icon' => $folder->icon,
            'sort_order' => (int) $folder->sort_order,
            'files_count' => (int) ($folder->user_files_count ?? 0),
            'created_at' => $folder->created_at?->toISOString(),
            'updated_at' => $folder->updated_at?->toISOString(),
        ];
    }
}
