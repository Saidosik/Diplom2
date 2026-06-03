<?php

namespace App\Enums;

enum IssueAnswerStatus: string
{
    case Published = 'published';
    case Hidden = 'hidden';

    public function label(): string
    {
        return match ($this) {
            self::Published => 'Опубликован',
            self::Hidden => 'Скрыт',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
