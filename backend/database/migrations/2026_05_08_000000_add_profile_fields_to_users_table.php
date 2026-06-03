<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('headline', 120)->nullable()->after('avatar');
            $table->text('bio')->nullable()->after('headline');
            $table->string('location', 120)->nullable()->after('bio');
            $table->string('website_url')->nullable()->after('location');
            $table->string('github_url')->nullable()->after('website_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'headline',
                'bio',
                'location',
                'website_url',
                'github_url',
            ]);
        });
    }
};
