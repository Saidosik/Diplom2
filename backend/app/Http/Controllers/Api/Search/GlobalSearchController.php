<?php

namespace App\Http\Controllers\Api\Search;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GlobalSearchController extends Controller
{
    private const TYPES = ['all', 'publications', 'questions', 'answers', 'tags', 'users', 'snippets'];
    private const SORTS = ['relevance', 'newest', 'popular'];

    public function __invoke(Request $request): JsonResponse
    {
        $query = $this->normalizeQuery((string) $request->query('q', ''));
        $type = $this->normalizeOption((string) $request->query('type', 'all'), self::TYPES, 'all');
        $sort = $this->normalizeOption((string) $request->query('sort', 'relevance'), self::SORTS, 'relevance');
        $page = max((int) $request->query('page', 1), 1);
        $perPage = min(max((int) $request->query('per_page', 20), 1), 40);

        if (Str::length($query) < 2) {
            return response()->json([
                'data' => [],
                'groups' => $this->emptyGroups(),
                'suggestions' => [],
                'meta' => [
                    'q' => $query,
                    'type' => $type,
                    'sort' => $sort,
                    'page' => $page,
                    'per_page' => $perPage,
                    'total' => 0,
                    'last_page' => 1,
                    'driver' => DB::getDriverName(),
                    'engine' => DB::getDriverName() === 'pgsql' ? 'pg_trgm' : 'like',
                ],
            ]);
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('SELECT set_limit(0.08)');
        }

        $rawResults = $this->collectResults($query, $type);
        $sortedResults = $this->sortResults($rawResults, $sort);
        $total = $sortedResults->count();
        $items = $sortedResults
            ->slice(($page - 1) * $perPage, $perPage)
            ->values();

        return response()->json([
            'data' => $items,
            'groups' => $this->groups($sortedResults),
            'suggestions' => $this->suggestions($query),
            'meta' => [
                'q' => $query,
                'type' => $type,
                'sort' => $sort,
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => max((int) ceil($total / $perPage), 1),
                'driver' => DB::getDriverName(),
                'engine' => DB::getDriverName() === 'pgsql' ? 'pg_trgm' : 'like',
            ],
        ]);
    }

    private function normalizeQuery(string $query): string
    {
        return trim(preg_replace('/\s+/u', ' ', $query) ?: '');
    }

    /**
     * @param array<int, string> $allowed
     */
    private function normalizeOption(string $value, array $allowed, string $default): string
    {
        return in_array($value, $allowed, true) ? $value : $default;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function collectResults(string $query, string $type): Collection
    {
        $resultSets = [];

        if ($type === 'all' || $type === 'publications') {
            $resultSets[] = $this->publicationResults($query, $type === 'all' ? 35 : 160);
        }

        if ($type === 'all' || $type === 'questions') {
            $resultSets[] = $this->questionResults($query, $type === 'all' ? 35 : 160);
        }

        if ($type === 'all' || $type === 'answers') {
            $resultSets[] = $this->answerResults($query, $type === 'all' ? 25 : 160);
        }

        if ($type === 'all' || $type === 'tags') {
            $resultSets[] = $this->tagResults($query, $type === 'all' ? 20 : 120);
        }

        if ($type === 'all' || $type === 'users') {
            $resultSets[] = $this->userResults($query, $type === 'all' ? 20 : 120);
        }

        if ($type === 'all' || $type === 'snippets') {
            $resultSets[] = $this->snippetResults($query, $type === 'all' ? 20 : 120);
        }

        return collect($resultSets)
            ->flatten(1)
            ->unique(fn (array $item) => $item['type'] . ':' . $item['id'])
            ->values();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function publicationResults(string $query, int $limit): array
    {
        $like = $this->like($query);

        $rows = DB::select(<<<'SQL'
            SELECT
                'publication' AS type,
                p.id,
                p.title,
                p.slug,
                p.excerpt AS description,
                ('/publications/' || p.slug) AS href,
                p.published_at AS published_at,
                p.created_at AS created_at,
                u.id AS author_id,
                u.name AS author_name,
                COALESCE(u.reputation_score, 0) AS author_reputation,
                COALESCE(stats.likes_count, 0) AS likes_count,
                COALESCE(stats.comments_count, 0) AS comments_count,
                COALESCE(stats.saved_count, 0) AS saved_count,
                tag_data.tags AS tags,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN p.title ILIKE ? THEN 'title' END,
                    CASE WHEN COALESCE(p.excerpt, '') ILIKE ? THEN 'description' END,
                    CASE WHEN COALESCE(tag_data.tags_text, '') ILIKE ? THEN 'tags' END,
                    CASE WHEN COALESCE(block_data.blocks_text, '') ILIKE ? THEN 'content' END
                ], NULL) AS matched_fields,
                (
                    similarity(lower(p.title), lower(?)) * 120
                    + similarity(lower(COALESCE(p.excerpt, '')), lower(?)) * 42
                    + similarity(lower(p.slug), lower(?)) * 22
                    + similarity(lower(COALESCE(tag_data.tags_text, '')), lower(?)) * 65
                    + similarity(lower(COALESCE(block_data.blocks_text, '')), lower(?)) * 25
                    + CASE WHEN p.title ILIKE ? THEN 45 ELSE 0 END
                    + CASE WHEN COALESCE(p.excerpt, '') ILIKE ? THEN 18 ELSE 0 END
                    + LEAST(COALESCE(stats.likes_count, 0), 80) * 0.7
                    + LEAST(COALESCE(stats.comments_count, 0), 80) * 0.55
                    + LEAST(COALESCE(stats.saved_count, 0), 80) * 0.45
                    + CASE WHEN p.published_at >= now() - interval '14 days' THEN 6 ELSE 0 END
                ) AS score
            FROM publications p
            JOIN users u ON u.id = p.author_id
            LEFT JOIN LATERAL (
                SELECT
                    string_agg(t.name || ' ' || t.slug || ' ' || COALESCE(t.description, ''), ' ') AS tags_text,
                    json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color) ORDER BY t.name) AS tags
                FROM taggables tg
                JOIN tags t ON t.id = tg.tag_id
                WHERE tg.taggable_type = 'publication' AND tg.taggable_id = p.id AND t.status = 'active'
            ) tag_data ON true
            LEFT JOIN LATERAL (
                SELECT string_agg(pb.content::text, ' ') AS blocks_text
                FROM publication_blocks pb
                WHERE pb.publication_id = p.id
            ) block_data ON true
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*) FILTER (WHERE r.type = 'like') AS likes_count,
                    (SELECT COUNT(*) FROM comments c WHERE c.commentable_type = 'publication' AND c.commentable_id = p.id AND c.status = 'published') AS comments_count,
                    (SELECT COUNT(*) FROM saved_items s WHERE s.saveable_type = 'publication' AND s.saveable_id = p.id) AS saved_count
                FROM reactions r
                WHERE r.reactable_type = 'publication' AND r.reactable_id = p.id
            ) stats ON true
            WHERE p.status = 'published'
                AND p.deleted_at IS NULL
                AND (
                    p.title ILIKE ?
                    OR COALESCE(p.excerpt, '') ILIKE ?
                    OR p.slug ILIKE ?
                    OR COALESCE(tag_data.tags_text, '') ILIKE ?
                    OR COALESCE(block_data.blocks_text, '') ILIKE ?
                    OR lower(p.title) % lower(?)
                    OR lower(COALESCE(p.excerpt, '')) % lower(?)
                    OR lower(COALESCE(tag_data.tags_text, '')) % lower(?)
                    OR lower(COALESCE(block_data.blocks_text, '')) % lower(?)
                )
            ORDER BY score DESC, p.published_at DESC NULLS LAST, p.id DESC
            LIMIT ?
        SQL, [
            $like, $like, $like, $like,
            $query, $query, $query, $query, $query,
            $like, $like,
            $like, $like, $like, $like, $like,
            $query, $query, $query, $query,
            $limit,
        ]);

        return array_map(fn ($row) => $this->mapRow($row), $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function questionResults(string $query, int $limit): array
    {
        $like = $this->like($query);

        $rows = DB::select(<<<'SQL'
            SELECT
                'question' AS type,
                q.id,
                q.title,
                q.slug,
                q.excerpt AS description,
                ('/questions/' || q.slug) AS href,
                q.published_at AS published_at,
                q.created_at AS created_at,
                u.id AS author_id,
                u.name AS author_name,
                COALESCE(u.reputation_score, 0) AS author_reputation,
                q.views_count,
                q.is_solved,
                COALESCE(stats.answers_count, 0) AS answers_count,
                COALESCE(stats.likes_count, 0) AS likes_count,
                tag_data.tags AS tags,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN q.title ILIKE ? THEN 'title' END,
                    CASE WHEN COALESCE(q.excerpt, '') ILIKE ? THEN 'description' END,
                    CASE WHEN COALESCE(tag_data.tags_text, '') ILIKE ? THEN 'tags' END,
                    CASE WHEN COALESCE(block_data.blocks_text, '') ILIKE ? THEN 'content' END
                ], NULL) AS matched_fields,
                (
                    similarity(lower(q.title), lower(?)) * 130
                    + similarity(lower(COALESCE(q.excerpt, '')), lower(?)) * 44
                    + similarity(lower(q.slug), lower(?)) * 20
                    + similarity(lower(COALESCE(tag_data.tags_text, '')), lower(?)) * 70
                    + similarity(lower(COALESCE(block_data.blocks_text, '')), lower(?)) * 28
                    + CASE WHEN q.title ILIKE ? THEN 48 ELSE 0 END
                    + CASE WHEN COALESCE(q.excerpt, '') ILIKE ? THEN 18 ELSE 0 END
                    + LEAST(COALESCE(stats.answers_count, 0), 30) * 2.2
                    + LEAST(COALESCE(stats.likes_count, 0), 80) * 0.7
                    + LEAST(q.views_count, 3000) * 0.015
                    + CASE WHEN q.is_solved THEN 5 ELSE 0 END
                    + CASE WHEN q.published_at >= now() - interval '14 days' THEN 6 ELSE 0 END
                ) AS score
            FROM issue_questions q
            JOIN users u ON u.id = q.author_id
            LEFT JOIN LATERAL (
                SELECT
                    string_agg(t.name || ' ' || t.slug || ' ' || COALESCE(t.description, ''), ' ') AS tags_text,
                    json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color) ORDER BY t.name) AS tags
                FROM taggables tg
                JOIN tags t ON t.id = tg.tag_id
                WHERE tg.taggable_type = 'issue_question' AND tg.taggable_id = q.id AND t.status = 'active'
            ) tag_data ON true
            LEFT JOIN LATERAL (
                SELECT string_agg(ib.content::text, ' ') AS blocks_text
                FROM issue_blocks ib
                WHERE ib.issue_question_id = q.id
            ) block_data ON true
            LEFT JOIN LATERAL (
                SELECT
                    (SELECT COUNT(*) FROM issue_answers a WHERE a.issue_question_id = q.id AND a.status = 'published' AND a.deleted_at IS NULL) AS answers_count,
                    (SELECT COUNT(*) FROM reactions r WHERE r.reactable_type = 'issue_question' AND r.reactable_id = q.id AND r.type = 'like') AS likes_count
            ) stats ON true
            WHERE q.status = 'published'
                AND q.deleted_at IS NULL
                AND (
                    q.title ILIKE ?
                    OR COALESCE(q.excerpt, '') ILIKE ?
                    OR q.slug ILIKE ?
                    OR COALESCE(tag_data.tags_text, '') ILIKE ?
                    OR COALESCE(block_data.blocks_text, '') ILIKE ?
                    OR lower(q.title) % lower(?)
                    OR lower(COALESCE(q.excerpt, '')) % lower(?)
                    OR lower(COALESCE(tag_data.tags_text, '')) % lower(?)
                    OR lower(COALESCE(block_data.blocks_text, '')) % lower(?)
                )
            ORDER BY score DESC, q.published_at DESC NULLS LAST, q.id DESC
            LIMIT ?
        SQL, [
            $like, $like, $like, $like,
            $query, $query, $query, $query, $query,
            $like, $like,
            $like, $like, $like, $like, $like,
            $query, $query, $query, $query,
            $limit,
        ]);

        return array_map(fn ($row) => $this->mapRow($row), $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function answerResults(string $query, int $limit): array
    {
        $like = $this->like($query);

        $rows = DB::select(<<<'SQL'
            SELECT
                'answer' AS type,
                a.id,
                ('Ответ на: ' || q.title) AS title,
                q.slug,
                COALESCE(left(block_data.blocks_plain, 260), q.excerpt) AS description,
                ('/questions/' || q.slug || '#answer-' || a.id) AS href,
                a.created_at AS published_at,
                a.created_at AS created_at,
                u.id AS author_id,
                u.name AS author_name,
                COALESCE(u.reputation_score, 0) AS author_reputation,
                a.is_accepted,
                a.is_ai_generated,
                tag_data.tags AS tags,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN q.title ILIKE ? THEN 'question' END,
                    CASE WHEN COALESCE(block_data.blocks_text, '') ILIKE ? THEN 'answer' END,
                    CASE WHEN COALESCE(tag_data.tags_text, '') ILIKE ? THEN 'tags' END
                ], NULL) AS matched_fields,
                (
                    similarity(lower(q.title), lower(?)) * 50
                    + similarity(lower(COALESCE(block_data.blocks_text, '')), lower(?)) * 95
                    + similarity(lower(COALESCE(tag_data.tags_text, '')), lower(?)) * 45
                    + CASE WHEN COALESCE(block_data.blocks_text, '') ILIKE ? THEN 42 ELSE 0 END
                    + CASE WHEN q.title ILIKE ? THEN 15 ELSE 0 END
                    + CASE WHEN a.is_accepted THEN 12 ELSE 0 END
                    + CASE WHEN a.created_at >= now() - interval '14 days' THEN 5 ELSE 0 END
                ) AS score
            FROM issue_answers a
            JOIN issue_questions q ON q.id = a.issue_question_id
            JOIN users u ON u.id = a.author_id
            LEFT JOIN LATERAL (
                SELECT
                    string_agg(t.name || ' ' || t.slug || ' ' || COALESCE(t.description, ''), ' ') AS tags_text,
                    json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color) ORDER BY t.name) AS tags
                FROM taggables tg
                JOIN tags t ON t.id = tg.tag_id
                WHERE tg.taggable_type = 'issue_question' AND tg.taggable_id = q.id AND t.status = 'active'
            ) tag_data ON true
            LEFT JOIN LATERAL (
                SELECT
                    string_agg(ab.content::text, ' ') AS blocks_text,
                    regexp_replace(string_agg(ab.content::text, ' '), '[{}"\\[\\],:]+', ' ', 'g') AS blocks_plain
                FROM issue_answer_blocks ab
                WHERE ab.issue_answer_id = a.id
            ) block_data ON true
            WHERE a.status = 'published'
                AND a.deleted_at IS NULL
                AND q.status = 'published'
                AND q.deleted_at IS NULL
                AND (
                    q.title ILIKE ?
                    OR COALESCE(block_data.blocks_text, '') ILIKE ?
                    OR COALESCE(tag_data.tags_text, '') ILIKE ?
                    OR lower(q.title) % lower(?)
                    OR lower(COALESCE(block_data.blocks_text, '')) % lower(?)
                    OR lower(COALESCE(tag_data.tags_text, '')) % lower(?)
                )
            ORDER BY score DESC, a.is_accepted DESC, a.created_at DESC, a.id DESC
            LIMIT ?
        SQL, [
            $like, $like, $like,
            $query, $query, $query,
            $like, $like,
            $like, $like, $like,
            $query, $query, $query,
            $limit,
        ]);

        return array_map(fn ($row) => $this->mapRow($row), $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function tagResults(string $query, int $limit): array
    {
        $like = $this->like($query);

        $rows = DB::select(<<<'SQL'
            SELECT
                'tag' AS type,
                t.id,
                ('#' || t.name) AS title,
                t.slug,
                t.description,
                ('/tags/' || t.slug) AS href,
                t.created_at AS created_at,
                NULL::timestamp AS published_at,
                usage.publications_count,
                usage.questions_count,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN t.name ILIKE ? THEN 'name' END,
                    CASE WHEN t.slug ILIKE ? THEN 'slug' END,
                    CASE WHEN COALESCE(t.description, '') ILIKE ? THEN 'description' END
                ], NULL) AS matched_fields,
                (
                    similarity(lower(t.name), lower(?)) * 130
                    + similarity(lower(t.slug), lower(?)) * 80
                    + similarity(lower(COALESCE(t.description, '')), lower(?)) * 35
                    + CASE WHEN t.name ILIKE ? THEN 45 ELSE 0 END
                    + LEAST(usage.publications_count + usage.questions_count, 150) * 0.4
                ) AS score
            FROM tags t
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*) FILTER (WHERE tg.taggable_type = 'publication') AS publications_count,
                    COUNT(*) FILTER (WHERE tg.taggable_type = 'issue_question') AS questions_count
                FROM taggables tg
                WHERE tg.tag_id = t.id
            ) usage ON true
            WHERE t.status = 'active'
                AND (
                    t.name ILIKE ?
                    OR t.slug ILIKE ?
                    OR COALESCE(t.description, '') ILIKE ?
                    OR lower(t.name) % lower(?)
                    OR lower(t.slug) % lower(?)
                    OR lower(COALESCE(t.description, '')) % lower(?)
                )
            ORDER BY score DESC, t.name
            LIMIT ?
        SQL, [
            $like, $like, $like,
            $query, $query, $query,
            $like,
            $like, $like, $like,
            $query, $query, $query,
            $limit,
        ]);

        return array_map(fn ($row) => $this->mapRow($row), $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function userResults(string $query, int $limit): array
    {
        $like = $this->like($query);

        $rows = DB::select(<<<'SQL'
            SELECT
                'user' AS type,
                u.id,
                u.name AS title,
                NULL::text AS slug,
                COALESCE(u.headline, u.bio) AS description,
                ('/users/' || u.id) AS href,
                u.created_at AS created_at,
                NULL::timestamp AS published_at,
                u.reputation_score,
                u.presence_status,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN u.name ILIKE ? THEN 'name' END,
                    CASE WHEN COALESCE(u.headline, '') ILIKE ? THEN 'headline' END,
                    CASE WHEN COALESCE(u.bio, '') ILIKE ? THEN 'bio' END
                ], NULL) AS matched_fields,
                (
                    similarity(lower(u.name), lower(?)) * 120
                    + similarity(lower(COALESCE(u.headline, '')), lower(?)) * 55
                    + similarity(lower(COALESCE(u.bio, '')), lower(?)) * 30
                    + CASE WHEN u.name ILIKE ? THEN 45 ELSE 0 END
                    + LEAST(COALESCE(u.reputation_score, 0), 5000) * 0.006
                ) AS score
            FROM users u
            WHERE u.deleted_at IS NULL
                AND (
                    u.name ILIKE ?
                    OR COALESCE(u.headline, '') ILIKE ?
                    OR COALESCE(u.bio, '') ILIKE ?
                    OR lower(u.name) % lower(?)
                    OR lower(COALESCE(u.headline, '')) % lower(?)
                    OR lower(COALESCE(u.bio, '')) % lower(?)
                )
            ORDER BY score DESC, u.reputation_score DESC, u.name
            LIMIT ?
        SQL, [
            $like, $like, $like,
            $query, $query, $query,
            $like,
            $like, $like, $like,
            $query, $query, $query,
            $limit,
        ]);

        return array_map(fn ($row) => $this->mapRow($row), $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function snippetResults(string $query, int $limit): array
    {
        $like = $this->like($query);

        $rows = DB::select(<<<'SQL'
            SELECT
                'snippet' AS type,
                s.id,
                s.title,
                NULL::text AS slug,
                left(s.code, 260) AS description,
                ('/playground?snippet=' || s.id) AS href,
                s.created_at AS created_at,
                s.updated_at AS published_at,
                u.id AS author_id,
                u.name AS author_name,
                s.language,
                s.last_run_status,
                ARRAY_REMOVE(ARRAY[
                    CASE WHEN s.title ILIKE ? THEN 'title' END,
                    CASE WHEN s.language ILIKE ? THEN 'language' END,
                    CASE WHEN s.code ILIKE ? THEN 'code' END
                ], NULL) AS matched_fields,
                (
                    similarity(lower(s.title), lower(?)) * 110
                    + similarity(lower(s.language), lower(?)) * 65
                    + similarity(lower(s.code), lower(?)) * 32
                    + CASE WHEN s.title ILIKE ? THEN 42 ELSE 0 END
                    + CASE WHEN s.code ILIKE ? THEN 18 ELSE 0 END
                    + CASE WHEN s.last_run_status = 'finished' THEN 4 ELSE 0 END
                ) AS score
            FROM code_snippets s
            JOIN users u ON u.id = s.user_id
            WHERE s.visibility = 'public'
                AND s.status = 'active'
                AND s.deleted_at IS NULL
                AND (
                    s.title ILIKE ?
                    OR s.language ILIKE ?
                    OR s.code ILIKE ?
                    OR lower(s.title) % lower(?)
                    OR lower(s.language) % lower(?)
                    OR lower(s.code) % lower(?)
                )
            ORDER BY score DESC, s.updated_at DESC, s.id DESC
            LIMIT ?
        SQL, [
            $like, $like, $like,
            $query, $query, $query,
            $like, $like,
            $like, $like, $like,
            $query, $query, $query,
            $limit,
        ]);

        return array_map(fn ($row) => $this->mapRow($row), $rows);
    }

    private function like(string $query): string
    {
        return '%' . str_replace(['%', '_'], ['\\%', '\\_'], $query) . '%';
    }

    /**
     * @param object $row
     * @return array<string, mixed>
     */
    private function mapRow(object $row): array
    {
        $tags = [];
        if (isset($row->tags) && is_string($row->tags)) {
            $decoded = json_decode($row->tags, true);
            $tags = is_array($decoded) ? $decoded : [];
        } elseif (isset($row->tags) && is_array($row->tags)) {
            $tags = $row->tags;
        }

        $matchedFields = [];
        if (isset($row->matched_fields) && is_string($row->matched_fields)) {
            $matchedFields = $this->parsePostgresArray($row->matched_fields);
        }

        return [
            'type' => (string) $row->type,
            'id' => (int) $row->id,
            'title' => (string) $row->title,
            'description' => isset($row->description) ? $this->cleanDescription((string) $row->description) : null,
            'href' => (string) $row->href,
            'score' => round((float) $row->score, 2),
            'matched_fields' => $matchedFields,
            'author' => isset($row->author_id) ? [
                'id' => (int) $row->author_id,
                'name' => (string) $row->author_name,
                'reputation_score' => isset($row->author_reputation) ? (int) $row->author_reputation : null,
            ] : null,
            'tags' => $tags,
            'meta' => $this->meta($row),
            'published_at' => isset($row->published_at) ? (string) $row->published_at : null,
            'created_at' => isset($row->created_at) ? (string) $row->created_at : null,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function parsePostgresArray(string $value): array
    {
        $trimmed = trim($value, '{}');

        if ($trimmed === '') {
            return [];
        }

        return collect(str_getcsv($trimmed))
            ->map(fn (string $item) => trim($item, '"'))
            ->filter()
            ->values()
            ->all();
    }

    private function cleanDescription(string $description): string
    {
        return Str::of($description)
            ->replaceMatches('/\s+/u', ' ')
            ->trim()
            ->limit(260)
            ->toString();
    }

    /**
     * @return array<string, mixed>
     */
    private function meta(object $row): array
    {
        $meta = [];

        foreach ([
            'likes_count', 'comments_count', 'saved_count', 'views_count', 'answers_count',
            'publications_count', 'questions_count', 'reputation_score', 'presence_status',
            'is_solved', 'is_accepted', 'is_ai_generated', 'language', 'last_run_status',
        ] as $field) {
            if (property_exists($row, $field)) {
                $meta[$field] = $row->{$field};
            }
        }

        return $meta;
    }

    /**
     * @param Collection<int, array<string, mixed>> $results
     * @return Collection<int, array<string, mixed>>
     */
    private function sortResults(Collection $results, string $sort): Collection
    {
        return match ($sort) {
            'newest' => $results
                ->sortByDesc(fn (array $item) => $item['published_at'] ?: $item['created_at'] ?: '')
                ->values(),
            'popular' => $results
                ->sortByDesc(fn (array $item) => $this->popularity($item))
                ->values(),
            default => $results
                ->sortByDesc(fn (array $item) => (float) $item['score'])
                ->values(),
        };
    }

    /**
     * @param array<string, mixed> $item
     */
    private function popularity(array $item): float
    {
        $meta = $item['meta'] ?? [];

        return (float) ($item['score'] ?? 0)
            + ((int) ($meta['likes_count'] ?? 0) * 2)
            + ((int) ($meta['comments_count'] ?? 0) * 1.5)
            + ((int) ($meta['answers_count'] ?? 0) * 2)
            + ((int) ($meta['saved_count'] ?? 0) * 1.5)
            + ((int) ($meta['views_count'] ?? 0) * 0.04)
            + ((int) ($meta['reputation_score'] ?? 0) * 0.01);
    }

    /**
     * @param Collection<int, array<string, mixed>> $results
     * @return array<string, array<string, mixed>>
     */
    private function groups(Collection $results): array
    {
        $groups = $this->emptyGroups();

        foreach ($results->groupBy('type') as $type => $items) {
            $key = $this->pluralType((string) $type);
            $groups[$key]['count'] = $items->count();
            $groups[$key]['top'] = $items->take(4)->values()->all();
        }

        return $groups;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function emptyGroups(): array
    {
        return [
            'publications' => ['label' => 'Публикации', 'count' => 0, 'top' => []],
            'questions' => ['label' => 'Вопросы', 'count' => 0, 'top' => []],
            'answers' => ['label' => 'Ответы', 'count' => 0, 'top' => []],
            'tags' => ['label' => 'Теги', 'count' => 0, 'top' => []],
            'users' => ['label' => 'Участники', 'count' => 0, 'top' => []],
            'snippets' => ['label' => 'Сниппеты', 'count' => 0, 'top' => []],
        ];
    }

    private function pluralType(string $type): string
    {
        return match ($type) {
            'publication' => 'publications',
            'question' => 'questions',
            'answer' => 'answers',
            'tag' => 'tags',
            'user' => 'users',
            'snippet' => 'snippets',
            default => $type,
        };
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function suggestions(string $query): array
    {
        $like = $this->like($query);

        $rows = DB::select(<<<'SQL'
            SELECT t.id, t.name, t.slug, t.color,
                (
                    similarity(lower(t.name), lower(?)) * 100
                    + similarity(lower(t.slug), lower(?)) * 50
                    + CASE WHEN t.name ILIKE ? THEN 40 ELSE 0 END
                ) AS score
            FROM tags t
            WHERE t.status = 'active'
                AND (
                    t.name ILIKE ?
                    OR t.slug ILIKE ?
                    OR lower(t.name) % lower(?)
                    OR lower(t.slug) % lower(?)
                )
            ORDER BY score DESC, t.name
            LIMIT 8
        SQL, [$query, $query, $like, $like, $like, $query, $query]);

        return array_map(fn ($row) => [
            'id' => (int) $row->id,
            'name' => (string) $row->name,
            'slug' => (string) $row->slug,
            'color' => $row->color,
            'href' => '/tags/' . $row->slug,
            'score' => round((float) $row->score, 2),
        ], $rows);
    }
}
