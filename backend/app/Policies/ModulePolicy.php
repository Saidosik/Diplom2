<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\Module;
use App\Models\User;

class ModulePolicy
{
    public function create(User $user, Course $course): bool
    {
        return $user->isAdmin() || $user->id === $course->author_id;
    }

    public function update(User $user, Module $module): bool
    {
        return $user->isAdmin() || $user->id === $module->course->author_id;
    }

    public function delete(User $user, Module $module): bool
    {
        return $user->isAdmin() || $user->id === $module->course->author_id;
    }
}