<?php

use App\Enums\PublicationStatus;
use App\Enums\PublicationType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('publications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('author_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // article, news, post, question
            $table->enum('type', PublicationType::values())
                ->default(PublicationType::Post->value);

            $table->enum('status', PublicationStatus::values())
                ->default(PublicationStatus::Draft->value);

            $table->string('title');
            $table->string('slug')->unique();

            // Краткое описание для карточки в ленте
            $table->text('excerpt')->nullable();

            // draft, published, hidden, archived
            // Путь к превью/обложке
            $table->string('cover_image_path')->nullable();

            // Время чтения в минутах, можно пересчитывать автоматически
            $table->unsignedSmallInteger('reading_time_minutes')->default(0);

            $table->timestamp('published_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index(['author_id', 'status']);
            $table->index(['type', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publications');
    }
};
