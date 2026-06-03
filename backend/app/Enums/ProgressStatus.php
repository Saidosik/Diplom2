<?php

namespace App\Enums;

enum ProgressStatus: string
{
    case Opened = 'opened';
    case Failed = 'failed';
    case Passed = 'passed';
}
