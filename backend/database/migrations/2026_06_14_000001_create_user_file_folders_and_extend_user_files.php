<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_file_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('slug')->nullable();
            $table->string('color', 30)->nullable();
            $table->string('icon', 40)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('user_id');
            $table->unique(['user_id', 'name']);
        });

        Schema::table('user_files', function (Blueprint $table) {
            $table->timestamp('pinned_at')->nullable()->after('visibility');
            $table->foreignId('folder_id')->nullable()->after('user_id')->constrained('user_file_folders')->nullOnDelete();
            $table->index(['user_id', 'folder_id']);
            $table->index(['user_id', 'pinned_at']);
        });
    }

    public function down(): void
    {
        Schema::table('user_files', function (Blueprint $table) {
            $table->dropConstrainedForeignId('folder_id');
            $table->dropColumn('pinned_at');
        });

        Schema::dropIfExists('user_file_folders');
    }
};
