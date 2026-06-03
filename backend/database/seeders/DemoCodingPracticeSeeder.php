<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DemoCodingPracticeSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(CommunityPlatformSeeder::class);
    }
}
