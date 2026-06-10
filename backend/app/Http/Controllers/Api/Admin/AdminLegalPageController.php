<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Legal\LegalPageController;
use App\Http\Controllers\Controller;
use App\Models\LegalPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminLegalPageController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $page = LegalPage::query()->where('slug', $slug)->firstOrFail();

        return response()->json([
            'data' => LegalPageController::serialize($page),
        ]);
    }

    public function update(Request $request, string $slug): JsonResponse
    {
        $page = LegalPage::query()->where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'is_published' => ['required', 'boolean'],
        ], [
            'title.required' => 'Укажите заголовок политики конфиденциальности.',
            'title.max' => 'Заголовок не должен быть длиннее 255 символов.',
            'content.required' => 'Укажите текст политики конфиденциальности.',
            'is_published.boolean' => 'Статус публикации должен быть true или false.',
        ]);

        $page->update($data);

        return response()->json([
            'message' => 'Политика конфиденциальности обновлена',
            'data' => LegalPageController::serialize($page->fresh()),
        ]);
    }
}
