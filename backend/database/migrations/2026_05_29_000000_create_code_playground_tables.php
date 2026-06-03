<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('code_snippets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('language', 50);
            $table->text('code');
            $table->text('stdin')->nullable();
            $table->enum('visibility', ['private', 'public'])->default('private');
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->string('last_run_status', 50)->nullable();
            $table->timestamp('last_run_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['visibility', 'status', 'created_at']);
            $table->index(['language', 'created_at']);
        });

        Schema::create('code_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('code_snippet_id')->nullable()->constrained('code_snippets')->nullOnDelete();
            $table->string('language', 50);
            $table->text('code');
            $table->text('stdin')->nullable();
            $table->string('status', 50)->default('running');
            $table->text('stdout')->nullable();
            $table->text('stderr')->nullable();
            $table->integer('exit_code')->nullable();
            $table->text('message')->nullable();
            $table->unsignedInteger('execution_time')->default(0);
            $table->unsignedInteger('memory_usage')->default(0);
            $table->jsonb('meta')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['code_snippet_id', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index(['language', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('code_runs');
        Schema::dropIfExists('code_snippets');
    }
};
