<?php

namespace App\Enums;

enum IssueBlockType: string
{
    case Heading = 'heading';
    case Paragraph = 'paragraph';
    case Markdown = 'markdown';
    case Code = 'code';
    case Terminal = 'terminal';
    case Diff = 'diff';
    case FileTree = 'file_tree';
    case Callout = 'callout';
    case CodeSnippet = 'code_snippet';
    case Image = 'image';
    case Quote = 'quote';
    case Warning = 'warning';
    case Divider = 'divider';

    public function label(): string
    {
        return match ($this) {
            self::Heading => 'Заголовок',
            self::Paragraph => 'Текст',
            self::Markdown => 'Markdown',
            self::Code => 'Код',
            self::Terminal => 'Терминал',
            self::Diff => 'Diff',
            self::FileTree => 'Дерево файлов',
            self::Callout => 'Callout',
            self::CodeSnippet => 'Сниппет кода',
            self::Image => 'Изображение',
            self::Quote => 'Цитата',
            self::Warning => 'Предупреждение',
            self::Divider => 'Разделитель',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
