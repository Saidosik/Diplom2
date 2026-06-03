<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issue_answer_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issue_answer_id')->constrained('issue_answers')->cascadeOnDelete();
            $table->string('type');
            $table->unsignedInteger('sort_order')->default(0);
            $table->jsonb('content')->default('{}');
            $table->timestamps();

            $table->index(['issue_answer_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_answer_blocks');
    }
};
