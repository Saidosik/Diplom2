<?php

namespace App\Enums;

enum PublicationStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Hidden = 'hidden';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Черновик',
            self::Published => 'Опубликовано',
            self::Hidden => 'Скрыто',
            self::Archived => 'В архиве',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
