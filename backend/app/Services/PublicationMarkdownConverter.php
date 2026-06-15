<?php
namespace App\Services;
class PublicationMarkdownConverter
{
    public function import(string $markdown): array
    { $blocks=[]; foreach (preg_split('/\n{2,}/', trim($markdown)) ?: [] as $i=>$chunk) { $type=str_starts_with($chunk,'#')?'heading':'markdown'; $blocks[]=['type'=>$type,'sort_order'=>$i,'content'=>['text'=>$chunk,'level'=>substr_count(strtok($chunk,"\n"),'#')?:2]]; } return $blocks ?: [['type'=>'paragraph','sort_order'=>0,'content'=>['text'=>'']]]; }
    public function export(array $payload): string
    { $out=[]; if (!empty($payload['title'])) $out[]='# '.$payload['title']; foreach (($payload['blocks']??[]) as $b) { $c=$b['content']??[]; $out[]=match($b['type']??'') { 'heading'=>str_repeat('#',(int)($c['level']??2)).' '.($c['text']??''), 'code'=>"```".($c['language']??'')."\n".($c['code']??'')."\n```", 'divider'=>'---', default=>(string)($c['text']??$c['code']??'') }; } return trim(implode("\n\n", $out)); }
}
