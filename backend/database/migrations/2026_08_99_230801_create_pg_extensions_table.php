<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    //подключаем расширение для триграмм
    /**
     * Run the migrations.
     */
    public function up(): void
    {

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //DB::statement('DROP EXTENSION IF EXISTS pg_trgm');
        //DB::statement('DROP EXTENSION IF EXISTS vector');
    }
};
