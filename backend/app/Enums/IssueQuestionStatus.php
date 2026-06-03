<?php

namespace App\Enums;

enum IssueQuestionStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Hidden = 'hidden';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Черновик',
            self::Published => 'Опубликован',
            self::Hidden => 'Скрыт',
            self::Closed => 'Закрыт',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
