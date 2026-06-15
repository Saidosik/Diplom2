<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recommendation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('guest_id')->nullable()->index();
            $table->string('event_type');
            $table->string('target_type');
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('context')->nullable();
            $table->json('metadata')->nullable();
            $table->integer('weight')->default(0);
            $table->string('ip_hash')->nullable();
            $table->string('user_agent_hash')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['guest_id', 'created_at']);
            $table->index(['target_type', 'target_id']);
            $table->index('event_type');
            $table->index('context');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recommendation_events');
    }
};
