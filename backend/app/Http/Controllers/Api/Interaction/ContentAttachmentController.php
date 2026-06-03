<?php

namespace App\Http\Controllers\Api\Interaction;

use App\Http\Controllers\Controller;
use App\Models\ContentAttachment;
use App\Models\IssueQuestion;
use App\Models\Publication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ContentAttachmentController extends Controller
{
    public function download(Request $request, ContentAttachment $contentAttachment): BinaryFileResponse
    {
        $contentAttachment->loadMissing(['userFile', 'attachable']);
        $file = $contentAttachment->userFile;
        $attachable = $contentAttachment->attachable;
        abort_unless($file && $attachable, 404, 'Файл не найден.');

        $user = $request->user();
        $isOwner = $user && (int) $contentAttachment->user_id === (int) $user->id;
        $isStaff = $user && method_exists($user, 'isStaff') && $user->isStaff();
        $isPublicContent = match (true) {
            $attachable instanceof Publication => $attachable->isPublished(),
            $attachable instanceof IssueQuestion => $attachable->isPublished(),
            default => false,
        };

        abort_unless($isPublicContent || $isOwner || $isStaff, 403, 'Файл недоступен.');

        $disk = $file->disk ?: 'local';
        abort_unless(Storage::disk($disk)->exists($file->path), 404, 'Файл не найден.');

        $filename = str_replace(['"', "\r", "\n"], '', $file->original_name ?: basename($file->path));

        return response()->download(Storage::disk($disk)->path($file->path), $filename);
    }
}
