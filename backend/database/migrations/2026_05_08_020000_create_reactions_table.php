<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->morphs('reactable');
            $table->string('type', 16);
            $table->timestamps();

            $table->unique(['user_id', 'reactable_type', 'reactable_id']);
            $table->index(['reactable_type', 'reactable_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reactions');
    }
};
