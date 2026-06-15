<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Profile\AchievementService;
use Illuminate\Console\Command;

class RecalculateAchievements extends Command
{
    protected $signature = 'achievements:recalculate {--user=}';
    protected $description = 'Recalculate profile achievements for one user or everyone.';

    public function handle(AchievementService $service): int
    {
        User::query()->when($this->option('user'), fn ($q, $id) => $q->whereKey($id))->chunkById(100, function ($users) use ($service) {
            foreach ($users as $user) {
                $service->recalculate($user);
            }
        });
        $this->info('Achievements recalculated.');
        return self::SUCCESS;
    }
}
