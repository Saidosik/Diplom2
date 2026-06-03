<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_knowledge_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_knowledge_documents', 'content_hash')) {
                $table->string('content_hash', 64)->nullable()->after('status')->index();
            }

            if (! Schema::hasColumn('ai_knowledge_documents', 'source_updated_at')) {
                $table->timestamp('source_updated_at')->nullable()->after('indexed_at')->index();
            }

            if (! Schema::hasColumn('ai_knowledge_documents', 'last_error')) {
                $table->text('last_error')->nullable()->after('source_updated_at');
            }

            if (! Schema::hasColumn('ai_knowledge_documents', 'chunks_count')) {
                $table->unsignedInteger('chunks_count')->default(0)->after('last_error');
            }

            if (! Schema::hasColumn('ai_knowledge_documents', 'embedding_provider')) {
                $table->string('embedding_provider', 64)->nullable()->after('chunks_count');
            }

            if (! Schema::hasColumn('ai_knowledge_documents', 'embedding_model')) {
                $table->string('embedding_model', 120)->nullable()->after('embedding_provider');
            }

            if (! Schema::hasColumn('ai_knowledge_documents', 'embedding_dimensions')) {
                $table->unsignedInteger('embedding_dimensions')->nullable()->after('embedding_model');
            }

            if (! Schema::hasColumn('ai_knowledge_documents', 'reindexed_by_id')) {
                $table->foreignId('reindexed_by_id')->nullable()->after('embedding_dimensions')->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('ai_knowledge_chunks', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_knowledge_chunks', 'content_hash')) {
                $table->string('content_hash', 64)->nullable()->after('search_text')->index();
            }

            if (! Schema::hasColumn('ai_knowledge_chunks', 'embedding_provider')) {
                $table->string('embedding_provider', 64)->nullable()->after('token_count');
            }

            if (! Schema::hasColumn('ai_knowledge_chunks', 'embedding_model')) {
                $table->string('embedding_model', 120)->nullable()->after('embedding_provider');
            }

            if (! Schema::hasColumn('ai_knowledge_chunks', 'embedding_dimensions')) {
                $table->unsignedInteger('embedding_dimensions')->nullable()->after('embedding_model');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ai_knowledge_chunks', function (Blueprint $table) {
            foreach (['embedding_dimensions', 'embedding_model', 'embedding_provider', 'content_hash'] as $column) {
                if (Schema::hasColumn('ai_knowledge_chunks', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('ai_knowledge_documents', function (Blueprint $table) {
            if (Schema::hasColumn('ai_knowledge_documents', 'reindexed_by_id')) {
                $table->dropConstrainedForeignId('reindexed_by_id');
            }

            foreach (['embedding_dimensions', 'embedding_model', 'embedding_provider', 'chunks_count', 'last_error', 'source_updated_at', 'content_hash'] as $column) {
                if (Schema::hasColumn('ai_knowledge_documents', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
