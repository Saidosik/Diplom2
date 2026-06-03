<?php

namespace App\Http\Resources\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $providers = $this->whenLoaded('socialAccounts', function () {
            return $this->socialAccounts
                ->pluck('provider')
                ->unique()
                ->values()
                ->all();
        }, []);

        $registeredVia = count($providers) > 0
            ? (count($providers) === 1 ? $providers[0] : $providers)
            : 'email/password';

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar' => $this->avatar,
            'avatar_url' => $this->avatarUrl(),
            'headline' => $this->headline,
            'bio' => $this->bio,
            'location' => $this->location,
            'website_url' => $this->website_url,
            'github_url' => $this->github_url,
            'profile_visibility' => $this->profile_visibility ?? 'public',
            'is_profile_private' => ($this->profile_visibility ?? 'public') === 'private',
            'role' => $this->role,
            'presence_status' => $this->presence_status ?? 'offline',
            'is_online' => method_exists($this->resource, 'isOnline') ? $this->isOnline() : false,
            'last_seen_at' => $this->last_seen_at?->toISOString(),
            'reputation_score' => (int) ($this->reputation_score ?? 0),
            'reputation_level' => method_exists($this->resource, 'reputationLevel') ? $this->reputationLevel() : null,

            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'is_email_verified' => $this->hasVerifiedEmail(),

            'registered_via' => $registeredVia,
            'auth_providers' => count($providers) > 0 ? $providers : ['email/password'],

            'social_accounts' => $this->whenLoaded('socialAccounts', function () {
                return $this->socialAccounts->map(fn($account) => [
                    'id' => $account->id,
                    'provider' => $account->provider,
                    'email' => $account->email,
                    'name' => $account->name,
                    'avatar' => $account->avatar,
                    'created_at' => $account->created_at?->toISOString(),
                ])->values();
            }),

            'meta' => [
                'isAdmin' => $this->isAdmin(),
                'isModerator' => method_exists($this->resource, 'isModerator') ? $this->isModerator() : false,
                'isStaff' => method_exists($this->resource, 'isStaff') ? $this->isStaff() : $this->isAdmin(),
                'canManageSystem' => $this->isAdmin(),
            ],

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function avatarUrl(): ?string
    {
        if (! $this->avatar) {
            return null;
        }

        if (filter_var($this->avatar, FILTER_VALIDATE_URL)) {
            return $this->avatar;
        }

        return Storage::disk('public')->url($this->avatar);
    }
}
