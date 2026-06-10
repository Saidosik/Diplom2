<?php

namespace Database\Seeders;

use App\Models\LegalPage;
use Illuminate\Database\Seeder;

class LegalPageSeeder extends Seeder
{
    public function run(): void
    {
        LegalPage::query()->updateOrCreate(
            ['slug' => LegalPage::PRIVACY_POLICY_SLUG],
            [
                'title' => 'Политика конфиденциальности данных',
                'content' => 'Здесь будет размещён текст политики конфиденциальности данных. Администратор может отредактировать этот текст в панели управления.',
                'is_published' => true,
            ]
        );
    }
}
