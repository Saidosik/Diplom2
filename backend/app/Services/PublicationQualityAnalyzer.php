<?php
namespace App\Services;

class PublicationQualityAnalyzer
{
    public function analyze(array $payload): array
    {
        $warnings=[]; $errors=[]; $suggestions=[]; $score=100;
        $title=trim((string)($payload['title']??'')); $excerpt=trim((string)($payload['excerpt']??''));
        $tags=$payload['tags']??[]; $blocks=$payload['blocks']??[];
        if ($title==='') { $errors[]='Нет заголовка.'; $score-=25; }
        if (mb_strlen($excerpt)<80) { $warnings[]='Описание короче 80 символов.'; $score-=10; }
        if (count($tags)<2) { $warnings[]='Добавьте минимум 2 тега.'; $score-=10; }
        $headings=0; $empty=0; $code=0; $text=0; $imagesWithoutAlt=0; $sources=false;
        foreach ($blocks as $block) {
            $type=$block['type']??''; $content=$block['content']??[]; $flat=trim(implode(' ', array_map(fn($v)=>is_scalar($v)?(string)$v:'', $content)));
            if ($type==='heading') $headings++; if ($type==='code') $code++; if (in_array($type,['paragraph','markdown','heading','quote'])) $text++;
            if ($flat==='') $empty++; if ($type==='image' && empty($content['alt'])) $imagesWithoutAlt++; if (str_contains(mb_strtolower($flat),'источник')) $sources=true;
        }
        if ($headings<2) { $suggestions[]='Добавьте структуру с подзаголовками.'; $score-=8; }
        if ($empty>0) { $warnings[]="Есть пустые блоки: {$empty}."; $score-=min(15,$empty*3); }
        if ($code>$text) { $suggestions[]='Слишком много кода без объяснения.'; $score-=8; }
        if (!$sources) { $suggestions[]='Добавьте источники или ссылки на документацию.'; $score-=5; }
        if ($imagesWithoutAlt>0) { $warnings[]='У изображений нет alt text.'; $score-=5; }
        return ['score'=>max(0,min(100,$score)),'errors'=>$errors,'warnings'=>$warnings,'suggestions'=>$suggestions,'blockers'=>$errors];
    }
}
