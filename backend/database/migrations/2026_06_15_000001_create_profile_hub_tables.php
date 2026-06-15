<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach ([
                'cover_url' => fn () => $table->string('cover_url')->nullable()->after('avatar'),
                'direction' => fn () => $table->string('direction', 120)->nullable()->after('location'),
                'show_email_publicly' => fn () => $table->boolean('show_email_publicly')->default(false)->after('profile_visibility'),
                'show_friends_publicly' => fn () => $table->boolean('show_friends_publicly')->default(true)->after('show_email_publicly'),
                'show_files_publicly' => fn () => $table->boolean('show_files_publicly')->default(true)->after('show_friends_publicly'),
                'show_activity_publicly' => fn () => $table->boolean('show_activity_publicly')->default(true)->after('show_files_publicly'),
            ] as $column => $create) {
                if (! Schema::hasColumn('users', $column)) {
                    $create();
                }
            }
        });

        Schema::create('pinned_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('pinnable');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'pinnable_type', 'pinnable_id']);
            $table->index(['user_id', 'position']);
        });

        Schema::create('activity_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 80)->index();
            $table->nullableMorphs('subject');
            $table->jsonb('metadata')->nullable();
            $table->string('visibility', 20)->default('public')->index();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'visibility', 'created_at']);
        });

        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->text('description');
            $table->string('icon', 40)->default('sparkles');
            $table->string('category', 80)->index();
            $table->unsignedInteger('points')->default(0);
            $table->string('rarity', 40)->default('common');
            $table->string('condition_type', 80)->index();
            $table->unsignedInteger('condition_value')->default(1);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('user_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('achievement_id')->constrained()->cascadeOnDelete();
            $table->timestamp('unlocked_at')->nullable();
            $table->unsignedInteger('progress')->default(0);
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'achievement_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_achievements');
        Schema::dropIfExists('achievements');
        Schema::dropIfExists('activity_events');
        Schema::dropIfExists('pinned_items');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cover_url','direction','show_email_publicly','show_friends_publicly','show_files_publicly','show_activity_publicly']);
        });
    }
};
