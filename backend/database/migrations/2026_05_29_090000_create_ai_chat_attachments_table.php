<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_chat_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ai_chat_session_id')->nullable()->constrained('ai_chat_sessions')->cascadeOnDelete();
            $table->foreignId('ai_chat_message_id')->nullable()->constrained('ai_chat_messages')->nullOnDelete();
            $table->string('original_name');
            $table->string('mime_type', 120)->nullable();
            $table->string('extension', 24)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->string('disk')->default('local');
            $table->string('path');
            $table->longText('extracted_text')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['ai_chat_session_id', 'created_at']);
            $table->index('ai_chat_message_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_chat_attachments');
    }
};
