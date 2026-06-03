<?php

use App\Enums\PublicationBlockType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('publication_blocks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('publication_id')
                ->constrained('publications')
                ->cascadeOnDelete();

            $table->enum('type', PublicationBlockType::values());

            $table->unsignedInteger('sort_order')->default(0);
            $table->jsonb('content');

            $table->timestamps();

            $table->index(['publication_id', 'sort_order']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publication_blocks');
    }
};
