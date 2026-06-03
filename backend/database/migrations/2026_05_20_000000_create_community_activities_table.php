<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type')->index();
            $table->nullableMorphs('subject');
            $table->nullableMorphs('target');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('link')->nullable();
            $table->integer('score')->default(0)->index();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'score']);
            $table->index(['actor_id', 'created_at']);
            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_activities');
    }
};
