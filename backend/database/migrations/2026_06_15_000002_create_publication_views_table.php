<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('publication_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained('publications')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_hash', 64)->nullable();
            $table->string('user_agent_hash', 64)->nullable();
            $table->timestamp('viewed_at');
            $table->timestamps();
            $table->index(['publication_id', 'user_id', 'viewed_at']);
            $table->index(['publication_id', 'ip_hash', 'user_agent_hash', 'viewed_at'], 'publication_views_guest_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publication_views');
    }
};
