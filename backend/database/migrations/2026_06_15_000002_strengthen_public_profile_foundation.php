<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username', 80)->nullable()->after('id');
            }
            if (! Schema::hasColumn('users', 'telegram_url')) {
                $table->string('telegram_url')->nullable()->after('github_url');
            }
        });

        DB::table('users')->select(['id', 'name', 'email', 'username'])->orderBy('id')->chunkById(100, function ($users) {
            foreach ($users as $user) {
                if ($user->username) {
                    continue;
                }

                $source = $user->name ?: Str::before((string) $user->email, '@') ?: 'user';
                $base = Str::of($source)->ascii()->lower()->replaceMatches('/[^a-z0-9_]+/', '-')->trim('-')->limit(50, '')->toString() ?: 'user';
                $candidate = $base;
                $suffix = 0;

                while (DB::table('users')->where('username', $candidate)->where('id', '!=', $user->id)->exists()) {
                    $suffix++;
                    $candidate = $base . '-' . $suffix;
                }

                DB::table('users')->where('id', $user->id)->update(['username' => $candidate]);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('username');
        });

        Schema::table('pinned_items', function (Blueprint $table) {
            if (! Schema::hasColumn('pinned_items', 'title_override')) {
                $table->string('title_override')->nullable()->after('pinnable_id');
            }
            if (! Schema::hasColumn('pinned_items', 'description_override')) {
                $table->text('description_override')->nullable()->after('title_override');
            }
            if (! Schema::hasColumn('pinned_items', 'visibility')) {
                $table->string('visibility', 20)->default('public')->after('position')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('pinned_items', function (Blueprint $table) {
            foreach (['visibility', 'description_override', 'title_override'] as $column) {
                if (Schema::hasColumn('pinned_items', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'username')) {
                $table->dropUnique(['username']);
                $table->dropColumn('username');
            }
            if (Schema::hasColumn('users', 'telegram_url')) {
                $table->dropColumn('telegram_url');
            }
        });
    }
};
