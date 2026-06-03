<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('saveable_type');
            $table->unsignedBigInteger('saveable_id');
            $table->timestamps();

            $table->unique(['user_id', 'saveable_type', 'saveable_id'], 'saved_items_unique');
            $table->index(['saveable_type', 'saveable_id'], 'saved_items_saveable_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_items');
    }
};
