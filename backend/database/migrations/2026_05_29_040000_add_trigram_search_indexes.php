<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        $indexes = [
            'idx_publications_title_trgm' => 'CREATE INDEX IF NOT EXISTS idx_publications_title_trgm ON publications USING gin ((lower(title)) gin_trgm_ops)',
            'idx_publications_slug_trgm' => 'CREATE INDEX IF NOT EXISTS idx_publications_slug_trgm ON publications USING gin ((lower(slug)) gin_trgm_ops)',
            'idx_publications_excerpt_trgm' => 'CREATE INDEX IF NOT EXISTS idx_publications_excerpt_trgm ON publications USING gin ((lower(coalesce(excerpt, \'\'))) gin_trgm_ops)',
            'idx_publication_blocks_content_trgm' => 'CREATE INDEX IF NOT EXISTS idx_publication_blocks_content_trgm ON publication_blocks USING gin ((lower(content::text)) gin_trgm_ops)',

            'idx_issue_questions_title_trgm' => 'CREATE INDEX IF NOT EXISTS idx_issue_questions_title_trgm ON issue_questions USING gin ((lower(title)) gin_trgm_ops)',
            'idx_issue_questions_slug_trgm' => 'CREATE INDEX IF NOT EXISTS idx_issue_questions_slug_trgm ON issue_questions USING gin ((lower(slug)) gin_trgm_ops)',
            'idx_issue_questions_excerpt_trgm' => 'CREATE INDEX IF NOT EXISTS idx_issue_questions_excerpt_trgm ON issue_questions USING gin ((lower(coalesce(excerpt, \'\'))) gin_trgm_ops)',
            'idx_issue_blocks_content_trgm' => 'CREATE INDEX IF NOT EXISTS idx_issue_blocks_content_trgm ON issue_blocks USING gin ((lower(content::text)) gin_trgm_ops)',
            'idx_issue_answer_blocks_content_trgm' => 'CREATE INDEX IF NOT EXISTS idx_issue_answer_blocks_content_trgm ON issue_answer_blocks USING gin ((lower(content::text)) gin_trgm_ops)',

            'idx_tags_name_trgm' => 'CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING gin ((lower(name)) gin_trgm_ops)',
            'idx_tags_slug_trgm' => 'CREATE INDEX IF NOT EXISTS idx_tags_slug_trgm ON tags USING gin ((lower(slug)) gin_trgm_ops)',
            'idx_tags_description_trgm' => 'CREATE INDEX IF NOT EXISTS idx_tags_description_trgm ON tags USING gin ((lower(coalesce(description, \'\'))) gin_trgm_ops)',

            'idx_users_name_trgm' => 'CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin ((lower(name)) gin_trgm_ops)',
            'idx_users_headline_trgm' => 'CREATE INDEX IF NOT EXISTS idx_users_headline_trgm ON users USING gin ((lower(coalesce(headline, \'\'))) gin_trgm_ops)',
            'idx_users_bio_trgm' => 'CREATE INDEX IF NOT EXISTS idx_users_bio_trgm ON users USING gin ((lower(coalesce(bio, \'\'))) gin_trgm_ops)',

            'idx_code_snippets_title_trgm' => 'CREATE INDEX IF NOT EXISTS idx_code_snippets_title_trgm ON code_snippets USING gin ((lower(title)) gin_trgm_ops)',
            'idx_code_snippets_language_trgm' => 'CREATE INDEX IF NOT EXISTS idx_code_snippets_language_trgm ON code_snippets USING gin ((lower(language)) gin_trgm_ops)',
            'idx_code_snippets_code_trgm' => 'CREATE INDEX IF NOT EXISTS idx_code_snippets_code_trgm ON code_snippets USING gin ((lower(code)) gin_trgm_ops)',
        ];

        foreach ($indexes as $statement) {
            DB::statement($statement);
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $indexes = [
            'idx_publications_title_trgm',
            'idx_publications_slug_trgm',
            'idx_publications_excerpt_trgm',
            'idx_publication_blocks_content_trgm',
            'idx_issue_questions_title_trgm',
            'idx_issue_questions_slug_trgm',
            'idx_issue_questions_excerpt_trgm',
            'idx_issue_blocks_content_trgm',
            'idx_issue_answer_blocks_content_trgm',
            'idx_tags_name_trgm',
            'idx_tags_slug_trgm',
            'idx_tags_description_trgm',
            'idx_users_name_trgm',
            'idx_users_headline_trgm',
            'idx_users_bio_trgm',
            'idx_code_snippets_title_trgm',
            'idx_code_snippets_language_trgm',
            'idx_code_snippets_code_trgm',
        ];

        foreach ($indexes as $index) {
            DB::statement("DROP INDEX IF EXISTS {$index}");
        }
    }
};
