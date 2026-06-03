<?php

namespace App\Enums;

enum PublicationType: string
{
    case Article = 'article';
    case News = 'news';
    case Post = 'post';
    case Guide = 'guide';

    public function label(): string
    {
        return match ($this) {
            self::Article => 'Статья',
            self::News => 'Новость',
            self::Post => 'Пост',
            self::Guide => 'Гайд',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
