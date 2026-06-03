<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\UserFileResource;
use App\Models\UserFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UserFileController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max((int) $request->query('per_page', 20), 1), 60);
        $q = trim((string) $request->query('q', ''));
        $kind = trim((string) $request->query('kind', ''));
        $visibility = trim((string) $request->query('visibility', ''));

        $files = UserFile::query()
            ->where('user_id', $request->user()->id)
            ->when($q !== '', fn ($query) => $query->where(function ($query) use ($q) {
                $query->where('title', 'ILIKE', "%{$q}%")
                    ->orWhere('original_name', 'ILIKE', "%{$q}%")
                    ->orWhere('mime_type', 'ILIKE', "%{$q}%");
            }))
            ->when($kind !== '', fn ($query) => $query->where('kind', $kind))
            ->when(in_array($visibility, ['private', 'public'], true), fn ($query) => $query->where('visibility', $visibility))
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        return UserFileResource::collection($files);
    }

    public function store(Request $request): UserFileResource
    {
        $allowed = config('community_security.uploads.user_files.allowed_mimetypes', config('community_security.uploads.chat.allowed_mimetypes', []));
        $maxFileKb = (int) config('community_security.uploads.user_files.max_file_kb', 20480);
        $allowedRule = count($allowed) > 0 ? ['mimetypes:' . implode(',', $allowed)] : [];

        $data = $request->validate([
            'file' => array_merge(['required', 'file', 'max:' . $maxFileKb], $allowedRule),
            'title' => ['nullable', 'string', 'max:160'],
            'visibility' => ['nullable', Rule::in(['private', 'public'])],
        ], [
            'file.required' => 'Выберите файл для загрузки.',
            'file.max' => "Размер файла не должен превышать {$maxFileKb} КБ.",
            'file.mimetypes' => 'Тип файла не разрешён для личного хранилища.',
        ]);

        $file = $request->file('file');
        $path = $file->store('user-files/' . $request->user()->id, 'local');
        $mime = (string) $file->getMimeType();

        $userFile = UserFile::query()->create([
            'user_id' => $request->user()->id,
            'title' => $data['title'] ?? null,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $mime,
            'size' => $file->getSize() ?: 0,
            'disk' => 'local',
            'path' => $path,
            'kind' => $this->kindForMime($mime),
            'visibility' => $data['visibility'] ?? 'private',
            'metadata' => [],
        ]);

        return new UserFileResource($userFile);
    }

    public function update(Request $request, UserFile $userFile): UserFileResource
    {
        $this->authorizeOwner($request, $userFile);

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:160'],
            'visibility' => ['sometimes', Rule::in(['private', 'public'])],
        ]);

        $userFile->update($data);

        return new UserFileResource($userFile->fresh());
    }

    public function destroy(Request $request, UserFile $userFile): JsonResponse
    {
        $this->authorizeOwner($request, $userFile);

        Storage::disk($userFile->disk ?: 'local')->delete($userFile->path);
        $userFile->delete();

        return response()->json(['message' => 'Файл удалён.']);
    }

    public function download(Request $request, UserFile $userFile): BinaryFileResponse
    {
        abort_unless((int) $userFile->user_id === (int) $request->user()->id || $userFile->isPublic(), 403);

        $disk = $userFile->disk ?: 'local';
        abort_unless(Storage::disk($disk)->exists($userFile->path), 404, 'Файл не найден.');

        $filename = str_replace(['"', "\r", "\n"], '', $userFile->original_name ?: basename($userFile->path));

        return response()->download(Storage::disk($disk)->path($userFile->path), $filename);
    }

    private function authorizeOwner(Request $request, UserFile $userFile): void
    {
        abort_unless((int) $userFile->user_id === (int) $request->user()->id, 403);
    }

    private function kindForMime(string $mime): string
    {
        if (str_starts_with($mime, 'image/')) return 'image';
        if (str_starts_with($mime, 'video/')) return 'video';
        if (str_starts_with($mime, 'audio/')) return 'audio';
        if (str_contains($mime, 'pdf')) return 'pdf';
        if (str_contains($mime, 'zip')) return 'archive';
        if (str_starts_with($mime, 'text/') || str_contains($mime, 'json') || str_contains($mime, 'xml')) return 'text';

        return 'file';
    }
}
