<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('publications', function (Blueprint $table) {
            $table->timestamp('last_autosaved_at')->nullable()->after('published_at');
            $table->json('editor_state')->nullable()->after('last_autosaved_at');
            $table->unsignedInteger('autosave_version')->default(0)->after('editor_state');
            $table->foreignId('cover_file_id')->nullable()->after('cover_image_path')->constrained('user_files')->nullOnDelete();
            $table->string('cover_alt_text')->nullable()->after('cover_file_id');
            $table->string('cover_caption')->nullable()->after('cover_alt_text');
            $table->string('seo_title')->nullable()->after('reading_time_minutes');
            $table->text('seo_description')->nullable()->after('seo_title');
            $table->string('canonical_url')->nullable()->after('seo_description');
            $table->foreignId('og_image_file_id')->nullable()->after('canonical_url')->constrained('user_files')->nullOnDelete();
            $table->string('og_image_path')->nullable()->after('og_image_file_id');
        });

        Schema::create('publication_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('excerpt')->nullable();
            $table->json('tags')->nullable();
            $table->json('editor_state')->nullable();
            $table->string('cover_image_path')->nullable();
            $table->json('attachment_ids')->nullable();
            $table->unsignedInteger('version_number');
            $table->string('change_summary')->nullable();
            $table->timestamps();
            $table->unique(['publication_id', 'version_number']);
        });

        Schema::create('publication_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained()->cascadeOnDelete();
            $table->foreignId('file_id')->constrained('user_files')->cascadeOnDelete();
            $table->foreignId('attached_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('visibility')->default('private');
            $table->string('display_name')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['publication_id', 'file_id']);
        });

        Schema::create('publication_snippets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained()->cascadeOnDelete();
            $table->foreignId('snippet_id')->constrained('code_snippets')->cascadeOnDelete();
            $table->string('display_mode')->default('card');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['publication_id', 'snippet_id']);
        });

        Schema::create('publication_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('category')->default('general');
            $table->json('blocks_schema');
            $table->json('tags')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
            $table->unique(['user_id', 'slug']);
        });

        Schema::create('publication_locks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('locked_until');
            $table->timestamps();
            $table->unique('publication_id');
        });

        Schema::create('publication_editor_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained()->cascadeOnDelete();
            $table->string('block_id');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('note');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('publication_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->constrained()->cascadeOnDelete();
            $table->string('url');
            $table->string('title')->nullable();
            $table->string('status')->default('unchecked');
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('publication_ai_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('publication_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type');
            $table->json('payload');
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publication_ai_suggestions');
        Schema::dropIfExists('publication_links');
        Schema::dropIfExists('publication_editor_notes');
        Schema::dropIfExists('publication_locks');
        Schema::dropIfExists('publication_templates');
        Schema::dropIfExists('publication_snippets');
        Schema::dropIfExists('publication_attachments');
        Schema::dropIfExists('publication_versions');
        Schema::table('publications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cover_file_id');
            $table->dropConstrainedForeignId('og_image_file_id');
            $table->dropColumn(['last_autosaved_at','editor_state','autosave_version','cover_alt_text','cover_caption','seo_title','seo_description','canonical_url','og_image_path']);
        });
    }
};
