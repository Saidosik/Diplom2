<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('presence_status', 24)->default('offline')->index();
            $table->timestamp('last_seen_at')->nullable()->index();
            $table->timestamp('presence_updated_at')->nullable()->index();
        });

        Schema::table('chat_participants', function (Blueprint $table) {
            $table->boolean('is_typing')->default(false)->index();
            $table->timestamp('typing_started_at')->nullable();
            $table->timestamp('typing_expires_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('chat_participants', function (Blueprint $table) {
            $table->dropColumn(['is_typing', 'typing_started_at', 'typing_expires_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['presence_status', 'last_seen_at', 'presence_updated_at']);
        });
    }
};
