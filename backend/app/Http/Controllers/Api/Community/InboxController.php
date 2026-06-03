<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Resources\Community\CommunityNotificationResource;
use App\Models\CommunityNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InboxController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 50);

        $notifications = CommunityNotification::query()
            ->where('user_id', $request->user()->id)
            ->with('actor')
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return CommunityNotificationResource::collection($notifications)
            ->additional([
                'unread_count' => CommunityNotification::query()
                    ->where('user_id', $request->user()->id)
                    ->unread()
                    ->count(),
            ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'unread_count' => CommunityNotification::query()
                ->where('user_id', $request->user()->id)
                ->unread()
                ->count(),
        ]);
    }

    public function markAsRead(Request $request, CommunityNotification $notification): CommunityNotificationResource
    {
        abort_unless($notification->user_id === $request->user()->id, 403, 'Нет доступа к уведомлению.');

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return new CommunityNotificationResource($notification->fresh()->load('actor'));
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        CommunityNotification::query()
            ->where('user_id', $request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Все уведомления отмечены как прочитанные.',
            'unread_count' => 0,
        ]);
    }
}
