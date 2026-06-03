<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issue_questions', function (Blueprint $table) {
            $table->foreign('accepted_answer_id')
                ->references('id')
                ->on('issue_answers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('issue_questions', function (Blueprint $table) {
            $table->dropForeign(['accepted_answer_id']);
        });
    }
};
