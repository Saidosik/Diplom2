<?php

namespace App\Http\Controllers\Api\Legal;

use App\Http\Controllers\Controller;
use App\Models\LegalPage;
use Illuminate\Http\JsonResponse;

class LegalPageController extends Controller
{
    public function privacyPolicy(): JsonResponse
    {
        $page = LegalPage::query()
            ->where('slug', LegalPage::PRIVACY_POLICY_SLUG)
            ->where('is_published', true)
            ->firstOrFail();

        return response()->json($this->serialize($page));
    }

    public static function serialize(LegalPage $page): array
    {
        return [
            'slug' => $page->slug,
            'title' => $page->title,
            'content' => $page->content,
            'is_published' => (bool) $page->is_published,
            'updated_at' => $page->updated_at?->toISOString(),
        ];
    }
}
