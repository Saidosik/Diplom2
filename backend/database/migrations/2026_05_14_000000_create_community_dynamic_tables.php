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
            if (! Schema::hasColumn('users', 'reputation_score')) {
                $table->integer('reputation_score')->default(0)->index()->after('role');
            }
        });

        Schema::create('reputation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('points');
            $table->string('reason')->index();
            $table->nullableMorphs('source');
            $table->jsonb('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['actor_id', 'created_at']);
        });

        Schema::create('community_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type')->index();
            $table->string('title');
            $table->text('message')->nullable();
            $table->string('link')->nullable();
            $table->jsonb('data')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('notification_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->boolean('inbox_enabled')->default(true);
            $table->boolean('email_enabled')->default(false);
            $table->boolean('notify_answers')->default(true);
            $table->boolean('notify_comments')->default(true);
            $table->boolean('notify_comment_replies')->default(true);
            $table->boolean('notify_author_posts')->default(true);
            $table->boolean('notify_subscriptions')->default(true);
            $table->boolean('notify_moderation')->default(true);
            $table->boolean('notify_reputation')->default(true);
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->morphs('subscribable');
            $table->timestamps();

            $table->unique(['user_id', 'subscribable_type', 'subscribable_id'], 'subscriptions_unique_target');
            $table->index(['subscribable_type', 'subscribable_id'], 'subscriptions_target_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('notification_settings');
        Schema::dropIfExists('community_notifications');
        Schema::dropIfExists('reputation_events');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'reputation_score')) {
                $table->dropColumn('reputation_score');
            }
        });
    }
};
