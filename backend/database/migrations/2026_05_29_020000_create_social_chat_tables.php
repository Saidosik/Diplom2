<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('friend_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 32)->default('pending');
            $table->text('message')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['sender_id', 'recipient_id']);
            $table->index(['recipient_id', 'status', 'created_at']);
            $table->index(['sender_id', 'status', 'created_at']);
        });

        Schema::create('friendships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_one_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_two_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('requested_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('friended_at')->useCurrent();
            $table->timestamps();

            $table->unique(['user_one_id', 'user_two_id']);
            $table->index(['user_one_id', 'created_at']);
            $table->index(['user_two_id', 'created_at']);
        });

        Schema::create('chat_conversations', function (Blueprint $table) {
            $table->id();
            $table->string('type', 24)->default('direct');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('avatar')->nullable();
            $table->string('direct_key')->nullable()->unique();
            $table->foreignId('last_message_id')->nullable();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'last_message_at']);
            $table->index(['owner_id', 'created_at']);
        });

        Schema::create('chat_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 24)->default('member');
            $table->timestamp('last_read_at')->nullable();
            $table->timestamp('muted_until')->nullable();
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->unique(['chat_conversation_id', 'user_id'], 'chat_participants_unique_user');
            $table->index(['user_id', 'left_at']);
            $table->index(['chat_conversation_id', 'left_at']);
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 24)->default('text');
            $table->text('body')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['chat_conversation_id', 'created_at']);
            $table->index(['sender_id', 'created_at']);
        });

        Schema::table('chat_conversations', function (Blueprint $table) {
            $table->foreign('last_message_id')->references('id')->on('chat_messages')->nullOnDelete();
        });

        Schema::create('chat_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_message_id')->constrained('chat_messages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('disk')->default('public');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->string('kind', 24)->default('file');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['chat_message_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['kind', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_attachments');

        Schema::table('chat_conversations', function (Blueprint $table) {
            $table->dropForeign(['last_message_id']);
        });

        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_participants');
        Schema::dropIfExists('chat_conversations');
        Schema::dropIfExists('friendships');
        Schema::dropIfExists('friend_requests');
    }
};
