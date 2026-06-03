<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DemoPublicationSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(CommunityPlatformSeeder::class);
    }
}
