<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issue_answers', function (Blueprint $table) {
            if (! Schema::hasColumn('issue_answers', 'is_ai_generated')) {
                $table->boolean('is_ai_generated')->default(false)->index()->after('is_accepted');
            }

            if (! Schema::hasColumn('issue_answers', 'ai_model')) {
                $table->string('ai_model')->nullable()->after('is_ai_generated');
            }

            if (! Schema::hasColumn('issue_answers', 'ai_sources')) {
                $table->jsonb('ai_sources')->nullable()->after('ai_model');
            }

            if (! Schema::hasColumn('issue_answers', 'ai_feedback_score')) {
                $table->integer('ai_feedback_score')->default(0)->after('ai_sources');
            }
        });
    }

    public function down(): void
    {
        Schema::table('issue_answers', function (Blueprint $table) {
            foreach (['ai_feedback_score', 'ai_sources', 'ai_model', 'is_ai_generated'] as $column) {
                if (Schema::hasColumn('issue_answers', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
