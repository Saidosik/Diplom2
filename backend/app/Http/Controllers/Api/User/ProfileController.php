<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdateProfileRequest;
use App\Http\Resources\User\UserResource;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class ProfileController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user()->load('socialAccounts'));
    }

    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();
        $data = $request->validated();

        if (array_key_exists('email', $data) && $data['email'] !== $user->email) {
            $user->email_verified_at = null;
        }

        $user->fill($data);
        $user->save();

        if (array_key_exists('email', $data) && $user->wasChanged('email')) {
            $user->notify(new VerifyEmailNotification());
        }

        return new UserResource($user->fresh()->load('socialAccounts'));
    }

    public function updateAvatar(Request $request): UserResource
    {
        $allowedMimes = implode(',', config('community_security.uploads.avatar.allowed_mimes', ['jpg', 'jpeg', 'png', 'webp']));
        $maxFileKb = (int) config('community_security.uploads.avatar.max_file_kb', 2048);

        $request->validate([
            'avatar' => ['required', 'file', 'image', 'mimes:' . $allowedMimes, 'max:' . $maxFileKb],
        ], [
            'avatar.required' => 'Выберите изображение для аватара.',
            'avatar.image' => 'Файл должен быть изображением.',
            'avatar.mimes' => 'Допустимые форматы: JPG, JPEG, PNG, WEBP.',
            'avatar.max' => "Размер аватара не должен превышать {$maxFileKb} КБ.",
        ]);

        $user = $request->user();

        $this->deleteStoredAvatar($user->avatar);

        $path = $request->file('avatar')->store("avatars/{$user->id}", 'public');

        $user->update([
            'avatar' => $path,
        ]);

        return new UserResource($user->fresh()->load('socialAccounts'));
    }

    public function destroyAvatar(Request $request): UserResource
    {
        $user = $request->user();

        $this->deleteStoredAvatar($user->avatar);

        $user->update([
            'avatar' => null,
        ]);

        return new UserResource($user->fresh()->load('socialAccounts'));
    }

    public function destroy(Request $request)
    {
        $user = $request->user();

        $this->deleteStoredAvatar($user->avatar);

        try {
            JWTAuth::invalidate(JWTAuth::getToken());
        } catch (JWTException $exception) {
            report($exception);
        }

        $user->delete();

        return response()->json([
            'message' => 'Аккаунт удалён.',
        ]);
    }

    private function deleteStoredAvatar(?string $avatar): void
    {
        if (! $avatar) {
            return;
        }

        if (filter_var($avatar, FILTER_VALIDATE_URL)) {
            return;
        }

        Storage::disk('public')->delete($avatar);
    }
}
