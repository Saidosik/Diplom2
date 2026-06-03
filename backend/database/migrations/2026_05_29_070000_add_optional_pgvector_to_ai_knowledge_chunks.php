<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql' || (string) env('AI_VECTOR_DRIVER', 'json') !== 'pgvector') {
            return;
        }

        Schema::ensureVectorExtensionExists();

        if (! Schema::hasColumn('ai_knowledge_chunks', 'embedding_vector')) {
            Schema::table('ai_knowledge_chunks', function (Blueprint $table) {
                $table->vector('embedding_vector', dimensions: (int) env('AI_EMBEDDING_DIMENSIONS', 1536))->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('ai_knowledge_chunks', 'embedding_vector')) {
            Schema::table('ai_knowledge_chunks', function (Blueprint $table) {
                $table->dropColumn('embedding_vector');
            });
        }
    }
};
