<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('taggables')) {
            DB::table('taggables')
                ->whereIn('taggable_type', [
                    'course',
                    'module',
                    'lesson',
                    'lesson_block',
                    'test',
                    'question',
                    'answer',
                    'coding_task',
                ])
                ->delete();
        }

        foreach ([
            'course_enrollments',
            'user_answers',
            'test_attempts',
            'progress',
            'solution_results',
            'solutions',
            'coding_task_test_cases',
            'coding_tasks',
            'answer_options',
            'answers',
            'questions',
            'tests',
            'lesson_block_contents',
            'lesson_blocks',
            'lessons',
            'modules',
            'courses',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }

    public function down(): void
    {
        // Legacy LMS tables are intentionally not recreated.
        // The project now uses publications, Q&A, recommendations, chats and code playground.
    }
};
