<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('content_attachments')) {
            Schema::create('content_attachments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('user_file_id')->constrained('user_files')->cascadeOnDelete();
                $table->morphs('attachable');
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();

                $table->unique(['user_file_id', 'attachable_type', 'attachable_id'], 'content_attachments_unique_file');
                $table->index(['attachable_type', 'attachable_id', 'sort_order'], 'content_attachments_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('content_attachments');
    }
};
