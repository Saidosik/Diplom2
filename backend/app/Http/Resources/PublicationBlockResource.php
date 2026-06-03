<?php

namespace App\Http\Resources;

use App\Enums\PublicationBlockType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicationBlockResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = $this->content ?? [];

        return [
            'id' => $this->id,
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'sort_order' => $this->sort_order,
            'content' => $data,
            'properties' => match ($this->type) {
                PublicationBlockType::Heading => [
                    'text' => $data['text'] ?? '',
                    'level' => $data['level'] ?? 2,
                ],
                PublicationBlockType::Image => [
                    'src' => $data['src'] ?? '',
                    'alt' => $data['alt'] ?? '',
                    'caption' => $data['caption'] ?? '',
                ],
                PublicationBlockType::Video => [
                    'url' => $data['url'] ?? '',
                    'title' => $data['title'] ?? '',
                ],
                PublicationBlockType::Code => [
                    'code' => $data['code'] ?? '',
                    'language' => $data['language'] ?? 'text',
                    'filename' => $data['filename'] ?? '',
                ],
                PublicationBlockType::Terminal => [
                    'command' => $data['command'] ?? '',
                    'output' => $data['output'] ?? '',
                    'shell' => $data['shell'] ?? 'bash',
                    'cwd' => $data['cwd'] ?? '',
                ],
                PublicationBlockType::Diff => [
                    'filename' => $data['filename'] ?? '',
                    'language' => $data['language'] ?? 'diff',
                    'code' => $data['code'] ?? '',
                ],
                PublicationBlockType::FileTree => [
                    'title' => $data['title'] ?? '',
                    'tree' => $data['tree'] ?? '',
                ],
                PublicationBlockType::Callout => [
                    'variant' => $data['variant'] ?? 'info',
                    'title' => $data['title'] ?? '',
                    'text' => $data['text'] ?? '',
                ],
                PublicationBlockType::CodeSnippet => [
                    'snippet_id' => $data['snippet_id'] ?? null,
                    'title' => $data['title'] ?? '',
                    'language' => $data['language'] ?? 'text',
                    'code' => $data['code'] ?? '',
                    'stdin' => $data['stdin'] ?? null,
                    'href' => $data['href'] ?? null,
                    'note' => $data['note'] ?? '',
                ],
                PublicationBlockType::Link => [
                    'url' => $data['url'] ?? '',
                    'title' => $data['title'] ?? '',
                    'description' => $data['description'] ?? '',
                ],
                PublicationBlockType::Paragraph,
                PublicationBlockType::Markdown,
                PublicationBlockType::Quote,
                PublicationBlockType::Important,
                PublicationBlockType::Warning => [
                    'text' => $data['text'] ?? '',
                ],
                default => $data,
            },
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
