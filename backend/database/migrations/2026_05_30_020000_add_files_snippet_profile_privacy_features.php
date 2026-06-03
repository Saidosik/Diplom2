<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'profile_visibility')) {
                $table->string('profile_visibility', 20)->default('public')->after('github_url')->index();
            }
        });

        Schema::table('code_snippets', function (Blueprint $table) {
            if (! Schema::hasColumn('code_snippets', 'snippet_type')) {
                $table->string('snippet_type', 40)->default('snippet')->after('language')->index();
            }
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE code_snippets DROP CONSTRAINT IF EXISTS code_snippets_status_check');
            DB::statement("ALTER TABLE code_snippets ADD CONSTRAINT code_snippets_status_check CHECK (status IN ('draft', 'active', 'archived'))");
        }

        if (! Schema::hasTable('user_files')) {
            Schema::create('user_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->string('original_name');
            $table->string('mime_type', 160)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('kind', 40)->default('file')->index();
            $table->enum('visibility', ['private', 'public'])->default('private')->index();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'visibility', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_files');

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE code_snippets DROP CONSTRAINT IF EXISTS code_snippets_status_check');
            DB::statement("ALTER TABLE code_snippets ADD CONSTRAINT code_snippets_status_check CHECK (status IN ('active', 'archived'))");
        }

        Schema::table('code_snippets', function (Blueprint $table) {
            if (Schema::hasColumn('code_snippets', 'snippet_type')) {
                $table->dropColumn('snippet_type');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'profile_visibility')) {
                $table->dropColumn('profile_visibility');
            }
        });
    }
};
