<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Resources\Community\NotificationSettingResource;
use App\Services\Community\CommunityActivityService;
use Illuminate\Http\Request;

class NotificationSettingController extends Controller
{
    public function show(Request $request, CommunityActivityService $community): NotificationSettingResource
    {
        return new NotificationSettingResource($community->settingsFor($request->user()));
    }

    public function update(Request $request, CommunityActivityService $community): NotificationSettingResource
    {
        $data = $request->validate([
            'inbox_enabled' => ['sometimes', 'boolean'],
            'email_enabled' => ['sometimes', 'boolean'],
            'notify_answers' => ['sometimes', 'boolean'],
            'notify_comments' => ['sometimes', 'boolean'],
            'notify_comment_replies' => ['sometimes', 'boolean'],
            'notify_author_posts' => ['sometimes', 'boolean'],
            'notify_subscriptions' => ['sometimes', 'boolean'],
            'notify_moderation' => ['sometimes', 'boolean'],
            'notify_reputation' => ['sometimes', 'boolean'],
        ]);

        $settings = $community->settingsFor($request->user());
        $settings->fill($data);
        $settings->save();

        return new NotificationSettingResource($settings->fresh());
    }
}
