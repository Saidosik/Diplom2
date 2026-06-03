<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DemoLearningSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(CommunityPlatformSeeder::class);
    }
}
