<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->enum('status', ['hidden', 'published', 'banned', 'draft', 'on_moderation'])->default('hidden');
            $table->unsignedInteger('price')->nullable();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index('status');
            $table->index(['author_id', 'status']);
        });

        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedInteger('sort_order');
            $table->text('description')->nullable();
            $table->enum('status', ['off', 'visible'])->default('off');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['course_id', 'status']);
            $table->index(['course_id', 'sort_order']);
        });

        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedInteger('sort_order');
            $table->text('description')->nullable();
            $table->enum('status', ['off', 'visible'])->default('off');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['module_id', 'status']);
            $table->index(['module_id', 'sort_order']);
        });

        Schema::create('lesson_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedInteger('sort_order');
            $table->text('description')->nullable();
            $table->enum('status', ['off', 'visible'])->default('off');
            $table->enum('type', ['theory', 'test', 'coding_task']);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['lesson_id', 'status']);
            $table->index(['lesson_id', 'sort_order']);
            $table->index(['type', 'status']);
        });

        Schema::create('lesson_block_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_block_id')->constrained('lesson_blocks')->cascadeOnDelete();
            $table->unsignedInteger('sort_order');
            $table->enum('status', ['off', 'visible'])->default('off');
            $table->enum('type', ['text', 'heading', 'warning', 'important', 'clue', 'video', 'example', 'link', 'danger']);
            $table->jsonb('content');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['lesson_block_id', 'sort_order']);
            $table->index(['lesson_block_id', 'status']);
        });

        Schema::create('tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_block_id')->constrained('lesson_blocks')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(1);
            $table->enum('status', ['off', 'visible'])->default('off');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['lesson_block_id', 'status']);
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_id')->constrained('tests')->cascadeOnDelete();
            $table->unsignedInteger('sort_order');
            $table->enum('type', ['single', 'multiple']);
            $table->jsonb('content');
            $table->enum('status', ['off', 'visible'])->default('off');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['test_id', 'sort_order']);
            $table->index(['test_id', 'status']);
        });

        Schema::create('answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->unique()->constrained('questions')->cascadeOnDelete();
            $table->jsonb('content');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('answer_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->unsignedInteger('sort_order');
            $table->jsonb('content');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['question_id', 'sort_order']);
        });

        Schema::create('coding_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_block_id')->constrained('lesson_blocks')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('sort_order');
            $table->enum('status', ['off', 'visible'])->default('off');
            $table->jsonb('standart_code')->nullable();
            $table->string('cpu_limit')->nullable();
            $table->unsignedInteger('time_limit')->default(1000);
            $table->unsignedInteger('ram_limit')->default(128);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['lesson_block_id', 'sort_order']);
            $table->index(['lesson_block_id', 'status']);
        });

        Schema::create('coding_task_test_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coding_task_id')->constrained('coding_tasks')->cascadeOnDelete();
            $table->enum('status', ['hidden', 'visible', 'off'])->default('hidden');
            $table->unsignedInteger('sort_order');
            $table->jsonb('input');
            $table->jsonb('output');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['coding_task_id', 'sort_order']);
            $table->index(['coding_task_id', 'status']);
        });

        Schema::create('solutions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('coding_task_id')->constrained('coding_tasks')->cascadeOnDelete();
            $table->enum('status', ['pending', 'checking', 'completed', 'checking_error'])->default('pending');
            $table->jsonb('content');
            $table->string('code_language', 50);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['coding_task_id', 'user_id']);
        });

        Schema::create('solution_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solution_id')->constrained('solutions')->cascadeOnDelete();
            $table->foreignId('coding_task_test_case_id')->nullable()->constrained('coding_task_test_cases')->nullOnDelete();
            $table->enum('status', ['passed', 'failed', 'runtime_error', 'compilation_error', 'time_limit_error', 'memory_limit_error']);
            $table->enum('type', ['test_case', 'user_input']);
            $table->jsonb('output')->nullable();
            $table->jsonb('input')->nullable();
            $table->jsonb('error_message')->nullable();
            $table->unsignedInteger('memory_usage')->default(0);
            $table->unsignedInteger('execution_time')->default(0);
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lesson_block_id')->constrained('lesson_blocks')->cascadeOnDelete();
            $table->enum('status', ['opened', 'passed', 'failed']);
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['user_id', 'lesson_block_id']);
            $table->index(['lesson_block_id', 'user_id', 'status']);
        });

        Schema::create('test_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_id')->constrained('tests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['passed', 'failed'])->nullable();
            $table->unsignedInteger('score')->default(0);
            $table->unsignedInteger('max_score')->default(0);
            $table->timestamp('submitted_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['test_id', 'user_id']);
        });

        Schema::create('user_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_attempt_id')->constrained('test_attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->enum('status', ['not_correct', 'correct']);
            $table->jsonb('content');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['test_attempt_id', 'question_id']);
        });

        Schema::create('course_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->enum('status', ['active', 'completed', 'archived'])->default('active');
            $table->foreignId('last_lesson_id')->nullable()->constrained('lessons')->nullOnDelete();
            $table->foreignId('last_lesson_block_id')->nullable()->constrained('lesson_blocks')->nullOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'course_id']);
            $table->index(['user_id', 'status']);
            $table->index(['course_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_enrollments');
        Schema::dropIfExists('user_answers');
        Schema::dropIfExists('test_attempts');
        Schema::dropIfExists('progress');
        Schema::dropIfExists('solution_results');
        Schema::dropIfExists('solutions');
        Schema::dropIfExists('coding_task_test_cases');
        Schema::dropIfExists('coding_tasks');
        Schema::dropIfExists('answer_options');
        Schema::dropIfExists('answers');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('tests');
        Schema::dropIfExists('lesson_block_contents');
        Schema::dropIfExists('lesson_blocks');
        Schema::dropIfExists('lessons');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('courses');
    }
};
