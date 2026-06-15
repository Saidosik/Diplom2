<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('publications', function (Blueprint $table) {
            if (! Schema::hasColumn('publications', 'views_count')) {
                $table->unsignedInteger('views_count')->default(0)->after('reading_time_minutes');
            }
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE publications DROP CONSTRAINT IF EXISTS publications_type_check");
            DB::statement("ALTER TABLE publications ADD CONSTRAINT publications_type_check CHECK (type IN ('article','guide','news','post','tutorial','opinion','release','question_related'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE publications DROP CONSTRAINT IF EXISTS publications_type_check");
            DB::statement("ALTER TABLE publications ADD CONSTRAINT publications_type_check CHECK (type IN ('article','news','post','guide'))");
        }

        Schema::table('publications', function (Blueprint $table) {
            if (Schema::hasColumn('publications', 'views_count')) {
                $table->dropColumn('views_count');
            }
        });
    }
};
