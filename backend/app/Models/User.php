<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

#[Fillable(['username', 'name', 'email', 'password', 'reputation_score', 'avatar', 'cover_url', 'headline', 'bio', 'location', 'direction', 'website_url', 'github_url', 'telegram_url', 'profile_visibility', 'show_email_publicly', 'show_friends_publicly', 'show_files_publicly', 'show_activity_publicly', 'email_verified_at', 'privacy_policy_accepted_at', 'privacy_policy_page_updated_at', 'presence_status', 'last_seen_at', 'presence_updated_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements JWTSubject, MustVerifyEmailContract
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, MustVerifyEmail, SoftDeletes;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'privacy_policy_accepted_at' => 'datetime',
            'privacy_policy_page_updated_at' => 'datetime',
            'password' => 'hashed',
            'reputation_score' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'presence_updated_at' => 'datetime',
            'profile_visibility' => 'string',
            'show_email_publicly' => 'boolean',
            'show_friends_publicly' => 'boolean',
            'show_files_publicly' => 'boolean',
            'show_activity_publicly' => 'boolean',
            'username' => 'string',
        ];
    }

    public function sendEmailVerificationNotification()
    {
        $this->notify(new VerifyEmailNotification);
    }

    public function sendPasswordResetNotification($token)
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function isOnline(): bool
    {
        return ($this->presence_status ?? 'offline') === 'online'
            && $this->last_seen_at !== null
            && $this->last_seen_at->greaterThan(now()->subMinutes(2));
    }

    public function markOnline(): void
    {
        $this->forceFill([
            'presence_status' => 'online',
            'last_seen_at' => now(),
            'presence_updated_at' => now(),
        ])->save();
    }

    public function markOffline(): void
    {
        $this->forceFill([
            'presence_status' => 'offline',
            'last_seen_at' => now(),
            'presence_updated_at' => now(),
        ])->save();
    }


    public function isProfilePrivate(): bool
    {
        return ($this->profile_visibility ?? 'public') === 'private';
    }

    public function userFiles(): HasMany
    {
        return $this->hasMany(UserFile::class, 'user_id');
    }

    public function userFileFolders(): HasMany
    {
        return $this->hasMany(UserFileFolder::class, 'user_id');
    }

    public function codeSnippets(): HasMany
    {
        return $this->hasMany(CodeSnippet::class, 'user_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isModerator(): bool
    {
        return $this->role === 'moderator';
    }

    public function isStaff(): bool
    {
        return in_array($this->role, ['admin', 'moderator'], true);
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function resolveRouteBinding($value, $field = null)
    {
        $query = $this->newQuery();

        if ($field) {
            return $query->where($field, $value)->first();
        }

        return $query
            ->where('id', $value)
            ->orWhere('username', $value)
            ->first();
    }

    public function profilePins(): HasMany
    {
        return $this->pinnedItems();
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [];
    }

    public function publications(): HasMany
    {
        return $this->hasMany(Publication::class, 'author_id');
    }

    public function reputationEvents(): HasMany
    {
        return $this->hasMany(ReputationEvent::class, 'user_id');
    }

    public function communityNotifications(): HasMany
    {
        return $this->hasMany(CommunityNotification::class, 'user_id');
    }

    public function notificationSetting(): HasOne
    {
        return $this->hasOne(NotificationSetting::class, 'user_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'user_id');
    }

    public function subscribers(): MorphMany
    {
        return $this->morphMany(Subscription::class, 'subscribable');
    }

    public function reputationLevel(): array
    {
        return \App\Services\Community\CommunityActivityService::reputationLevel((int) ($this->reputation_score ?? 0));
    }

    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class, 'user_id');
    }

    public function issueQuestions(): HasMany
    {
        return $this->hasMany(IssueQuestion::class, 'author_id');
    }

    public function issueAnswers(): HasMany
    {
        return $this->hasMany(IssueAnswer::class, 'author_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'user_id');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(Reaction::class, 'user_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'user_id');
    }

    public function savedItems(): HasMany
    {
        return $this->hasMany(SavedItem::class, 'user_id');
    }

    public function pinnedItems(): HasMany
    {
        return $this->hasMany(PinnedItem::class, 'user_id');
    }


    public function sentFriendRequests(): HasMany
    {
        return $this->hasMany(FriendRequest::class, 'sender_id');
    }

    public function receivedFriendRequests(): HasMany
    {
        return $this->hasMany(FriendRequest::class, 'recipient_id');
    }

    public function friendshipsAsUserOne(): HasMany
    {
        return $this->hasMany(Friendship::class, 'user_one_id');
    }

    public function friendshipsAsUserTwo(): HasMany
    {
        return $this->hasMany(Friendship::class, 'user_two_id');
    }

    public function chatParticipants(): HasMany
    {
        return $this->hasMany(ChatParticipant::class);
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'sender_id');
    }

    public function activityEvents(): HasMany
    {
        return $this->hasMany(ActivityEvent::class);
    }

    public function achievements(): HasMany
    {
        return $this->hasMany(UserAchievement::class);
    }
}


