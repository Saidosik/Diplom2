<?php

namespace App\Enums;

enum LessonBlockContentType: string
{
    case Text = 'text';
    case Heading = 'heading';
    case Warning = 'warning';
    case Important = 'important';
    case Clue = 'clue';
    case Video = 'video';
    case Example = 'example';
    case Link = 'link';
    case Danger = 'danger';
}
