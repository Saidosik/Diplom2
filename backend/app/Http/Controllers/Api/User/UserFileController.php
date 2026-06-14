<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\User\UserFileResource;
use App\Models\UserFile;
use App\Models\UserFileFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UserFileController extends Controller
{
    private const DANGEROUS_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'msi', 'apk', 'jar', 'com', 'scr', 'ps1'];
    private const PREVIEW_BYTES = 204800;

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max((int) $request->query('per_page', 20), 1), 60);
        $q = trim((string) $request->query('q', ''));
        $kind = trim((string) $request->query('kind', ''));
        $visibility = trim((string) $request->query('visibility', ''));
        $sort = trim((string) $request->query('sort', 'newest'));
        $folderId = trim((string) $request->query('folder_id', ''));
        $pinned = trim((string) $request->query('pinned', ''));

        if ($folderId !== '' && $folderId !== 'none') {
            abort_unless(UserFileFolder::query()->where('user_id', $request->user()->id)->whereKey($folderId)->exists(), 404);
        }

        $query = UserFile::query()
            ->with('folder')
            ->where('user_id', $request->user()->id)
            ->when($q !== '', fn ($query) => $query->where(function ($query) use ($q) {
                $query->where('title', 'ILIKE', "%{$q}%")
                    ->orWhere('original_name', 'ILIKE', "%{$q}%")
                    ->orWhere('mime_type', 'ILIKE', "%{$q}%");
            }))
            ->when($kind !== '', fn ($query) => $query->where('kind', $kind))
            ->when(in_array($visibility, ['private', 'public'], true), fn ($query) => $query->where('visibility', $visibility))
            ->when($folderId === 'none', fn ($query) => $query->whereNull('folder_id'))
            ->when($folderId !== '' && $folderId !== 'none', fn ($query) => $query->where('folder_id', (int) $folderId))
            ->when($pinned === 'true', fn ($query) => $query->whereNotNull('pinned_at'))
            ->when($pinned === 'false', fn ($query) => $query->whereNull('pinned_at'));

        match ($sort) {
            'oldest' => $query->oldest('id'),
            'name' => $query->orderByRaw('COALESCE(title, original_name) ASC'),
            'size' => $query->orderByDesc('size'),
            default => $query->orderByRaw('CASE WHEN pinned_at IS NULL THEN 1 ELSE 0 END')->orderByDesc('pinned_at')->latest('id'),
        };

        $files = $query->paginate($perPage)->withQueryString();

        return UserFileResource::collection($files)->additional(['meta' => ['storage' => $this->storageMeta($request)]]);
    }

    public function show(Request $request, UserFile $userFile): UserFileResource
    {
        $this->authorizeAccessible($request, $userFile);

        return new UserFileResource($userFile->load('folder'));
    }

    public function store(Request $request): UserFileResource
    {
        $allowed = config('community_security.uploads.user_files.allowed_mimetypes', config('community_security.uploads.chat.allowed_mimetypes', []));
        $maxFileKb = (int) config('community_security.uploads.user_files.max_file_kb', 20480);
        $maxFileMb = (int) ceil($maxFileKb / 1024);
        $allowedRule = count($allowed) > 0 ? ['mimetypes:' . implode(',', $allowed)] : [];

        $data = $request->validate([
            'file' => array_merge(['required', 'file', 'max:' . $maxFileKb], $allowedRule),
            'title' => ['nullable', 'string', 'max:160'],
            'visibility' => ['nullable', Rule::in(['private', 'public'])],
            'folder_id' => ['nullable', 'integer'],
        ], [
            'file.required' => 'Выберите файл для загрузки.',
            'file.max' => "Размер файла не должен превышать {$maxFileMb} МБ.",
            'file.mimetypes' => 'Тип файла не разрешён для личного хранилища.',
        ]);

        $folderId = $this->validatedFolderId($request, $data['folder_id'] ?? null);

        $file = $request->file('file');
        $extension = mb_strtolower((string) $file->getClientOriginalExtension());
        if (in_array($extension, self::DANGEROUS_EXTENSIONS, true)) {
            throw ValidationException::withMessages(['file' => 'Расширение файла не разрешено для загрузки.']);
        }

        $visibility = $data['visibility'] ?? 'private';
        $this->assertQuotaAllows($request, (int) ($file->getSize() ?: 0), $visibility);

        $path = $file->store('user-files/' . $request->user()->id, 'local');
        $mime = (string) $file->getMimeType();

        $userFile = UserFile::query()->create([
            'user_id' => $request->user()->id,
            'folder_id' => $folderId,
            'title' => $data['title'] ?? null,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $mime,
            'size' => $file->getSize() ?: 0,
            'disk' => 'local',
            'path' => $path,
            'kind' => $this->kindForMime($mime, $extension),
            'visibility' => $visibility,
            'metadata' => ['extension' => $extension],
        ]);

        return new UserFileResource($userFile->load('folder'));
    }

    public function update(Request $request, UserFile $userFile): UserFileResource
    {
        $this->authorizeOwner($request, $userFile);

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:160'],
            'visibility' => ['sometimes', Rule::in(['private', 'public'])],
            'pinned' => ['sometimes', 'boolean'],
            'folder_id' => ['sometimes', 'nullable', 'integer'],
        ]);

        if (($data['visibility'] ?? null) === 'public' && $userFile->visibility !== 'public') {
            $maxPublicFiles = (int) config('community_security.uploads.user_files.max_public_files', 30);
            $publicFilesCount = UserFile::query()->where('user_id', $request->user()->id)->where('visibility', 'public')->count();
            if ($publicFilesCount >= $maxPublicFiles) {
                throw ValidationException::withMessages(['visibility' => 'Достигнут лимит публичных файлов.']);
            }
        }

        if (array_key_exists('pinned', $data)) {
            $data['pinned_at'] = $request->boolean('pinned') ? now() : null;
            unset($data['pinned']);
        }

        if (array_key_exists('folder_id', $data)) {
            $data['folder_id'] = $this->validatedFolderId($request, $data['folder_id']);
        }

        $userFile->update($data);

        return new UserFileResource($userFile->fresh()->load('folder'));
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
        $this->authorizeAccessible($request, $userFile);
        $disk = $userFile->disk ?: 'local';
        abort_unless(Storage::disk($disk)->exists($userFile->path), 404, 'Файл не найден.');
        $filename = str_replace(['"', "\r", "\n"], '', $userFile->original_name ?: basename($userFile->path));
        return response()->download(Storage::disk($disk)->path($userFile->path), $filename);
    }

    public function preview(Request $request, UserFile $userFile): JsonResponse|BinaryFileResponse
    {
        $this->authorizeAccessible($request, $userFile);
        abort_unless($this->canPreview($userFile), 422, 'Предпросмотр недоступен для этого типа файла.');
        $disk = $userFile->disk ?: 'local';
        abort_unless(Storage::disk($disk)->exists($userFile->path), 404, 'Файл не найден.');

        if (in_array($userFile->kind, ['image', 'pdf', 'audio', 'video'], true)) {
            return response()->file(Storage::disk($disk)->path($userFile->path), ['X-Content-Type-Options' => 'nosniff']);
        }

        $stream = Storage::disk($disk)->readStream($userFile->path);
        $content = $stream ? stream_get_contents($stream, self::PREVIEW_BYTES) : '';
        if (is_resource($stream)) fclose($stream);

        return response()->json(['content' => $content, 'truncated' => (int) $userFile->size > self::PREVIEW_BYTES]);
    }

    private function validatedFolderId(Request $request, mixed $folderId): ?int
    {
        if ($folderId === null || $folderId === '') {
            return null;
        }

        $exists = UserFileFolder::query()
            ->where('user_id', $request->user()->id)
            ->whereKey((int) $folderId)
            ->exists();

        abort_unless($exists, 404);

        return (int) $folderId;
    }

    private function authorizeOwner(Request $request, UserFile $userFile): void { abort_unless((int) $userFile->user_id === (int) $request->user()->id, 403); }
    private function authorizeAccessible(Request $request, UserFile $userFile): void { abort_unless((int) $userFile->user_id === (int) $request->user()->id || $userFile->isPublic(), 403); }

    private function assertQuotaAllows(Request $request, int $newBytes, string $visibility): void
    {
        $meta = $this->storageMeta($request);
        if ($newBytes > $meta['max_file_bytes']) throw ValidationException::withMessages(['file' => 'Размер файла не должен превышать ' . (int) ceil($meta['max_file_bytes'] / 1024 / 1024) . ' МБ.']);
        if ($meta['used_bytes'] + $newBytes > $meta['quota_bytes']) throw ValidationException::withMessages(['file' => 'Недостаточно места в хранилище.']);
        if ($meta['files_count'] >= $meta['max_files']) throw ValidationException::withMessages(['file' => 'Достигнут лимит количества файлов.']);
        if ($visibility === 'public' && $meta['public_files_count'] >= $meta['max_public_files']) throw ValidationException::withMessages(['visibility' => 'Достигнут лимит публичных файлов.']);
    }

    private function storageMeta(Request $request): array
    {
        $query = UserFile::query()->where('user_id', $request->user()->id);
        $usedBytes = (int) (clone $query)->sum('size');
        $quotaBytes = (int) config('community_security.uploads.user_files.total_quota_mb', 500) * 1024 * 1024;
        $allowed = config('community_security.uploads.user_files.allowed_mimetypes', []);
        return [
            'used_bytes' => $usedBytes,
            'quota_bytes' => $quotaBytes,
            'used_percent' => $quotaBytes > 0 ? min(100, round($usedBytes / $quotaBytes * 100, 1)) : 0,
            'files_count' => (int) (clone $query)->count(),
            'max_files' => (int) config('community_security.uploads.user_files.max_files', 100),
            'public_files_count' => (int) (clone $query)->where('visibility', 'public')->count(),
            'max_public_files' => (int) config('community_security.uploads.user_files.max_public_files', 30),
            'max_file_bytes' => (int) config('community_security.uploads.user_files.max_file_kb', 20480) * 1024,
            'allowed_types' => $allowed,
            'allowed_kinds' => ['image', 'pdf', 'archive', 'text', 'audio', 'video', 'file'],
        ];
    }

    private function canPreview(UserFile $file): bool { return in_array($file->kind, ['image', 'pdf', 'text', 'audio', 'video'], true); }

    private function kindForMime(string $mime, string $extension = ''): string
    {
        if (str_starts_with($mime, 'image/')) return 'image';
        if (str_starts_with($mime, 'video/')) return 'video';
        if (str_starts_with($mime, 'audio/')) return 'audio';
        if (str_contains($mime, 'pdf')) return 'pdf';
        if (str_contains($mime, 'zip') || in_array($extension, ['zip', 'rar', '7z', 'tar', 'gz'], true)) return 'archive';
        if (str_starts_with($mime, 'text/') || str_contains($mime, 'json') || str_contains($mime, 'xml') || in_array($extension, ['md', 'js', 'ts', 'tsx', 'jsx', 'php', 'py', 'java', 'cs', 'cpp', 'c', 'go', 'rs', 'log'], true)) return 'text';
        return 'file';
    }
}
