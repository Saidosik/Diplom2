<?php

namespace App\Enums;

enum LessonBlockType: string
{
    case Theory = 'theory';
    case Test = 'test';
    case CodingTask = 'coding_task';
}