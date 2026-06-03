<?php

namespace App\Enums;

enum CourseStatus: string
{
    case Draft = 'draft';
    case Hidden = 'hidden';
    case OnModeration = 'on_moderation';
    case Published = 'published';
    case Banned = 'banned';
}