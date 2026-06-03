<?php

namespace App\Policies;

use App\Models\Lesson;
use App\Models\LessonBlock;
use App\Models\User;

class LessonBlockPolicy
{
    public function create(User $user, Lesson $lesson): bool
    {
        return $user->isAdmin() || $user->id === $lesson->module->course->author_id;
    }

    public function update(User $user, LessonBlock $lessonBlock): bool
    {
        return $user->isAdmin() || $user->id === $lessonBlock->lesson->module->course->author_id;
    }

    public function delete(User $user, LessonBlock $lessonBlock): bool
    {
        return $user->isAdmin() || $user->id === $lessonBlock->lesson->module->course->author_id;
    }
}