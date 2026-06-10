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
            $table->timestamp('privacy_policy_accepted_at')->nullable()->after('email_verified_at');
            $table->timestamp('privacy_policy_page_updated_at')->nullable()->after('privacy_policy_accepted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['privacy_policy_accepted_at', 'privacy_policy_page_updated_at']);
        });
    }
};
