<?php

namespace Database\Seeders;

use App\Enums\PublicationStatus;
use App\Enums\PublicationType;
use App\Models\ContentAttachment;
use App\Models\Publication;
use App\Models\User;
use App\Models\UserFile;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class DemoUsersAndMediaSeeder extends Seeder
{
    private const PASSWORD = 'Parol2345!';
    private const SEEDED_BY = 'DemoUsersAndMediaSeeder';

    /**
     * @var array<int, string>
     */
    private const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    /**
     * @var array<int, array{email: string, role: string, name: string, headline: string, bio: string, location: string}>
     */
    private array $demoUsers = [
        [
            'email' => 'Piskunova@gmail.com',
            'role' => 'user',
            'name' => 'Екатерина Пискунова',
            'headline' => 'Тестовый пользователь платформы',
            'bio' => 'Демо-аккаунт для проверки профиля, публикаций и пользовательских сценариев.',
            'location' => 'Москва',
        ],
        [
            'email' => 'AdminPisk@gmail.com',
            'role' => 'admin',
            'name' => 'Администратор Пискунова',
            'headline' => 'Администратор демо-стенда',
            'bio' => 'Демо-аккаунт администратора для проверки управления платформой и модерации.',
            'location' => 'Казань',
        ],
        [
            'email' => 'ModeratorPisk@gmail.com',
            'role' => 'moderator',
            'name' => 'Модератор Пискунова',
            'headline' => 'Модератор демо-контента',
            'bio' => 'Демо-аккаунт модератора для проверки жалоб, комментариев и статусов материалов.',
            'location' => 'Санкт-Петербург',
        ],
    ];

    /**
     * @var array<int, array{title: string, slug: string, excerpt: string, type: PublicationType, minutes: int}>
     */
    private array $demoPublications = [
        [
            'title' => 'Демо-публикация: знакомство с платформой',
            'slug' => 'demo-media-introduction',
            'excerpt' => 'Тестовая публикация с обложкой, image-блоком и вложениями из seed-assets.',
            'type' => PublicationType::Post,
            'minutes' => 4,
        ],
        [
            'title' => 'Демо-гайд: проверка медиа и аватаров',
            'slug' => 'demo-media-profile-guide',
            'excerpt' => 'Материал для проверки публичного storage, preview-фотографий и файловых вложений.',
            'type' => PublicationType::Guide,
            'minutes' => 6,
        ],
        [
            'title' => 'Демо-статья: контент для модерации',
            'slug' => 'demo-media-moderation-review',
            'excerpt' => 'Публикация для проверки ролей admin/moderator/user и отображения демо-фотографий.',
            'type' => PublicationType::Article,
            'minutes' => 5,
        ],
    ];

    /**
     * @var array<string, string|null>
     */
    private array $assetWarnings = [];

    public function run(): void
    {
        Model::unguarded(function () {
            $users = $this->seedUsers();
            $previewFiles = $this->availablePreviewFiles();

            if ($previewFiles === []) {
                $this->warnOnce('preview-assets', 'Demo preview images were not found in database/seed-assets or its subdirectories. If you run through Docker Compose, put files in the host ./seed-assets directory so it is mounted to /var/www/html/database/seed-assets. Demo publications will be created without cover images, image blocks and media attachments.');
            }

            $this->seedPublications($users, $previewFiles);
        });
    }

    /**
     * @return array<string, User>
     */
    private function seedUsers(): array
    {
        $users = [];

        foreach ($this->demoUsers as $index => $data) {
            $values = [
                'name' => $data['name'],
                'password' => Hash::make(self::PASSWORD),
            ];

            if (Schema::hasColumn('users', 'role')) {
                $values['role'] = $data['role'];
            }

            if (Schema::hasColumn('users', 'email_verified_at')) {
                $values['email_verified_at'] = now();
            }

            foreach (['headline', 'bio', 'location'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $values[$column] = $data[$column];
                }
            }

            if (Schema::hasColumn('users', 'profile_visibility')) {
                $values['profile_visibility'] = 'public';
            }

            $avatar = $this->randomAvatarFile();
            if ($avatar !== null && Schema::hasColumn('users', 'avatar')) {
                $values['avatar'] = $this->copyAssetToPublicStorage(
                    $avatar,
                    sprintf('demo-media/avatars/demo-user-%d.%s', $index + 1, strtolower(pathinfo($avatar, PATHINFO_EXTENSION)))
                );
            }

            /** @var User $user */
            $user = User::withTrashed()->updateOrCreate(
                ['email' => $data['email']],
                $values
            );

            if (method_exists($user, 'trashed') && $user->trashed()) {
                $user->restore();
            }

            $users[$data['role']] = $user->fresh();
        }

        return $users;
    }

    /**
     * @param array<string, User> $users
     * @param array<int, string> $previewFiles
     */
    private function seedPublications(array $users, array $previewFiles): void
    {
        $orderedUsers = [
            $users['user'] ?? reset($users),
            $users['admin'] ?? reset($users),
            $users['moderator'] ?? reset($users),
        ];

        foreach ($this->demoPublications as $index => $item) {
            $author = $orderedUsers[$index] instanceof User ? $orderedUsers[$index] : reset($users);
            if (! $author instanceof User) {
                continue;
            }

            $selectedPreviewFiles = $this->randomPreviewFiles($previewFiles, 3);
            $coverPath = $selectedPreviewFiles !== []
                ? $this->storePreviewForPublication($selectedPreviewFiles[0], $item['slug'], 'cover')
                : null;

            /** @var Publication $publication */
            $publication = Publication::withTrashed()->updateOrCreate(
                ['slug' => $item['slug']],
                [
                    'author_id' => $author->id,
                    'type' => $item['type']->value,
                    'status' => PublicationStatus::Published->value,
                    'title' => $item['title'],
                    'excerpt' => $item['excerpt'],
                    'cover_image_path' => $coverPath,
                    'reading_time_minutes' => $item['minutes'],
                    'published_at' => now()->subDays($index),
                ]
            );

            if (method_exists($publication, 'trashed') && $publication->trashed()) {
                $publication->restore();
            }

            $publication->blocks()->delete();
            $publication->blocks()->create([
                'type' => 'paragraph',
                'sort_order' => 10,
                'content' => [
                    'text' => 'Это идемпотентный демо-материал, созданный сидером для проверки тестовых пользователей, аватаров и медиа.',
                ],
            ]);

            if ($coverPath !== null) {
                $publication->blocks()->create([
                    'type' => 'image',
                    'sort_order' => 20,
                    'content' => [
                        'src' => Storage::disk('public')->url($coverPath),
                        'alt' => $item['title'],
                        'caption' => 'Демо-фотография из database/seed-assets.',
                    ],
                ]);
            }

            $publication->blocks()->create([
                'type' => 'callout',
                'sort_order' => 30,
                'content' => [
                    'variant' => 'info',
                    'title' => 'Demo media seeding',
                    'text' => 'Повторный запуск обновляет эти demo-записи и не удаляет пользовательские файлы вне demo-media.',
                ],
            ]);

            $this->syncPreviewAttachments($publication, $author, $selectedPreviewFiles);
        }
    }

    /**
     * @return array<int, string>
     */
    private function availablePreviewFiles(): array
    {
        $files = [];

        for ($i = 1; $i <= 9; $i++) {
            $file = $this->findAssetFile("prew ({$i})");
            if ($file !== null) {
                $files[] = $file;
            }
        }

        return $files;
    }

    private function randomAvatarFile(): ?string
    {
        $files = [];

        for ($i = 1; $i <= 8; $i++) {
            $file = $this->findAssetFile("avatar ({$i})");
            if ($file !== null) {
                $files[] = $file;
            }
        }

        if ($files === []) {
            $this->warnOnce('avatar-assets', 'Demo avatar images were not found in database/seed-assets or its subdirectories. If you run through Docker Compose, put files in the host ./seed-assets directory so it is mounted to /var/www/html/database/seed-assets. Users will be created without demo avatars.');

            return null;
        }

        return $files[array_rand($files)];
    }

    /**
     * @param array<int, string> $files
     * @return array<int, string>
     */
    private function randomPreviewFiles(array $files, int $count = 1): array
    {
        if ($files === []) {
            return [];
        }

        shuffle($files);

        return array_slice($files, 0, min($count, count($files)));
    }

    private function findAssetFile(string $basename): ?string
    {
        $directory = database_path('seed-assets');

        if (! is_dir($directory)) {
            $this->warnOnce('seed-assets-directory', "Seed assets directory not found: {$directory}. Demo users will still be created; media files will be skipped.");

            return null;
        }

        $directories = [$directory];

        while ($currentDirectory = array_shift($directories)) {
            $entries = scandir($currentDirectory);
            if ($entries === false) {
                $this->warnOnce('seed-assets-readable-' . $currentDirectory, "Seed assets directory is not readable: {$currentDirectory}. Demo users will still be created; unreadable media files will be skipped.");

                continue;
            }

            foreach ($entries as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }

                $path = $currentDirectory . DIRECTORY_SEPARATOR . $entry;

                if (is_dir($path)) {
                    $directories[] = $path;
                    continue;
                }

                if (! is_file($path)) {
                    continue;
                }

                $extension = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
                $filename = pathinfo($entry, PATHINFO_FILENAME);

                if ($filename === $basename && in_array($extension, self::IMAGE_EXTENSIONS, true)) {
                    return $path;
                }
            }
        }

        return null;
    }

    private function copyAssetToPublicStorage(string $sourcePath, string $targetPath): string
    {
        $this->deleteExistingImageVariants($targetPath);

        Storage::disk('public')->put($targetPath, (string) file_get_contents($sourcePath));

        return $targetPath;
    }

    private function deleteExistingImageVariants(string $targetPath): void
    {
        $directory = trim((string) pathinfo($targetPath, PATHINFO_DIRNAME), '.');
        $filename = pathinfo($targetPath, PATHINFO_FILENAME);

        foreach (self::IMAGE_EXTENSIONS as $extension) {
            $candidate = ltrim($directory . '/' . $filename . '.' . $extension, '/');

            if ($candidate !== $targetPath) {
                Storage::disk('public')->delete($candidate);
            }
        }
    }

    private function storePreviewForPublication(string $sourcePath, string $slug, string $key): string
    {
        return $this->copyAssetToPublicStorage(
            $sourcePath,
            sprintf('demo-media/previews/%s-%s.%s', $slug, $key, strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION)))
        );
    }

    /**
     * @param array<int, string> $previewFiles
     */
    private function syncPreviewAttachments(Publication $publication, User $author, array $previewFiles): void
    {
        $demoFileIds = UserFile::query()
            ->where('user_id', $author->id)
            ->where('path', 'like', 'demo-media/previews/' . $publication->slug . '-attachment-%')
            ->pluck('id');

        if ($demoFileIds->isNotEmpty()) {
            ContentAttachment::query()
                ->where('attachable_type', $publication->getMorphClass())
                ->where('attachable_id', $publication->id)
                ->whereIn('user_file_id', $demoFileIds->all())
                ->delete();

            UserFile::query()
                ->whereIn('id', $demoFileIds->all())
                ->delete();
        }

        if ($previewFiles === []) {
            return;
        }

        foreach (array_values($previewFiles) as $index => $sourcePath) {
            $path = $this->storePreviewForPublication($sourcePath, $publication->slug, 'attachment-' . ($index + 1));
            $userFile = $this->upsertUserFile($author, $sourcePath, $path, 'Демо-фото ' . ($index + 1));

            $publication->attachments()->updateOrCreate(
                ['user_file_id' => $userFile->id],
                [
                    'user_id' => $author->id,
                    'sort_order' => $index,
                ]
            );
        }
    }

    private function upsertUserFile(User $user, string $sourcePath, string $storedPath, string $title): UserFile
    {
        $extension = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));

        /** @var UserFile $userFile */
        $userFile = UserFile::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'disk' => 'public',
                'path' => $storedPath,
            ],
            [
                'title' => $title,
                'original_name' => basename($sourcePath),
                'mime_type' => $this->mimeTypeForExtension($extension),
                'size' => filesize($sourcePath) ?: 0,
                'kind' => 'image',
                'visibility' => 'public',
                'metadata' => [
                    'seeded_by' => self::SEEDED_BY,
                    'source_basename' => pathinfo($sourcePath, PATHINFO_FILENAME),
                ],
            ]
        );

        return $userFile;
    }

    private function mimeTypeForExtension(string $extension): string
    {
        return match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
    }

    private function warnOnce(string $key, string $message): void
    {
        if (array_key_exists($key, $this->assetWarnings)) {
            return;
        }

        $this->assetWarnings[$key] = $message;
        $this->command?->warn($message);
    }
}
