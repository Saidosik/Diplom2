<?php

namespace App\Enums;

enum PublicationType: string
{
    case Article = 'article';
    case News = 'news';
    case Post = 'post';
    case Guide = 'guide';
    case Tutorial = 'tutorial';
    case Opinion = 'opinion';
    case Release = 'release';
    case QuestionRelated = 'question_related';

    public function label(): string
    {
        return match ($this) {
            self::Article => 'Статья',
            self::News => 'Новость',
            self::Post => 'Пост',
            self::Guide => 'Гайд',
            self::Tutorial => 'Туториал',
            self::Opinion => 'Мнение',
            self::Release => 'Релиз',
            self::QuestionRelated => 'Q&A материал',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
