<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issue_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issue_question_id')->constrained('issue_questions')->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('published')->index();
            $table->boolean('is_accepted')->default(false)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['issue_question_id', 'is_accepted']);
            $table->index(['author_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_answers');
    }
};
