<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE publication_blocks DROP CONSTRAINT IF EXISTS publication_blocks_type_check');
        DB::statement("ALTER TABLE publication_blocks ADD CONSTRAINT publication_blocks_type_check CHECK (type IN ('heading', 'paragraph', 'markdown', 'image', 'video', 'code', 'terminal', 'diff', 'file_tree', 'callout', 'code_snippet', 'important', 'quote', 'warning', 'link', 'divider'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE publication_blocks DROP CONSTRAINT IF EXISTS publication_blocks_type_check');
        DB::statement("ALTER TABLE publication_blocks ADD CONSTRAINT publication_blocks_type_check CHECK (type IN ('heading', 'paragraph', 'markdown', 'image', 'video', 'code', 'terminal', 'diff', 'file_tree', 'callout', 'important', 'quote', 'warning', 'link', 'divider'))");
    }
};
