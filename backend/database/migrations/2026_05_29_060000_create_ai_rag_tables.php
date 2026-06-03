<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

            if ((string) env('AI_VECTOR_DRIVER', 'json') === 'pgvector') {
                Schema::ensureVectorExtensionExists();
            }
        }

        Schema::create('ai_knowledge_documents', function (Blueprint $table) {
            $table->id();
            $table->string('source_type', 64);
            $table->unsignedBigInteger('source_id');
            $table->string('title');
            $table->string('url')->nullable();
            $table->string('status', 32)->default('indexed');
            $table->string('language', 32)->nullable();
            $table->json('tags')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('indexed_at')->nullable();
            $table->timestamps();

            $table->unique(['source_type', 'source_id']);
            $table->index(['source_type', 'source_id']);
            $table->index('indexed_at');
        });

        Schema::create('ai_knowledge_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_knowledge_document_id')
                ->constrained('ai_knowledge_documents')
                ->cascadeOnDelete();
            $table->string('source_type', 64);
            $table->unsignedBigInteger('source_id');
            $table->unsignedInteger('chunk_index')->default(0);
            $table->string('title');
            $table->text('content');
            $table->text('search_text');
            // JSON copy keeps the index portable and lets the app work even when pgvector is not enabled.
            $table->json('embedding')->nullable();

            if (DB::getDriverName() === 'pgsql' && (string) env('AI_VECTOR_DRIVER', 'json') === 'pgvector') {
                $table->vector('embedding_vector', dimensions: (int) env('AI_EMBEDDING_DIMENSIONS', 1536))->nullable()->index();
            }

            $table->unsignedInteger('token_count')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamp('indexed_at')->nullable();
            $table->timestamps();

            $table->unique(['ai_knowledge_document_id', 'chunk_index'], 'ai_doc_chunk_unique');
            $table->index(['source_type', 'source_id']);
            $table->index('indexed_at');
        });

        Schema::create('ai_chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('mode', 32)->default('rag');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'updated_at']);
        });

        Schema::create('ai_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_chat_session_id')->constrained('ai_chat_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('role', 32);
            $table->text('content');
            $table->json('sources')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['ai_chat_session_id', 'created_at']);
            $table->index('role');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX ai_knowledge_documents_title_trgm_idx ON ai_knowledge_documents USING gin (title gin_trgm_ops)');
            DB::statement('CREATE INDEX ai_knowledge_documents_url_trgm_idx ON ai_knowledge_documents USING gin (url gin_trgm_ops)');
            DB::statement('CREATE INDEX ai_knowledge_chunks_title_trgm_idx ON ai_knowledge_chunks USING gin (title gin_trgm_ops)');
            DB::statement('CREATE INDEX ai_knowledge_chunks_content_trgm_idx ON ai_knowledge_chunks USING gin (content gin_trgm_ops)');
            DB::statement('CREATE INDEX ai_knowledge_chunks_search_text_trgm_idx ON ai_knowledge_chunks USING gin (search_text gin_trgm_ops)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_chat_messages');
        Schema::dropIfExists('ai_chat_sessions');
        Schema::dropIfExists('ai_knowledge_chunks');
        Schema::dropIfExists('ai_knowledge_documents');
    }
};
