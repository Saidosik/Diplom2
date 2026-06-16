<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_model_configs', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('openrouter');
            $table->string('model_id');
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->string('modality')->nullable();
            $table->unsignedInteger('context_length')->nullable();
            $table->json('input_modalities')->nullable();
            $table->json('output_modalities')->nullable();
            $table->json('supported_parameters')->nullable();
            $table->json('pricing')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_available')->default(true)->index();
            $table->boolean('enabled')->default(false)->index();
            $table->boolean('use_for_chat')->default(false)->index();
            $table->boolean('use_for_embeddings')->default(false)->index();
            $table->boolean('use_for_rerank')->default(false)->index();
            $table->boolean('default_for_chat')->default(false)->index();
            $table->boolean('default_for_embeddings')->default(false)->index();
            $table->boolean('default_for_rerank')->default(false)->index();
            $table->text('system_prompt')->nullable();
            $table->decimal('temperature', 4, 2)->nullable();
            $table->unsignedInteger('max_tokens')->nullable();
            $table->unsignedInteger('dimensions')->nullable();
            $table->unsignedInteger('sort_order')->default(100);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'model_id']);
            $table->index(['provider', 'enabled', 'use_for_chat']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_model_configs');
    }
};
