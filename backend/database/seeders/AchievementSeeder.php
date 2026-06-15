<?php

namespace Database\Seeders;

use App\Models\Achievement;
use Illuminate\Database\Seeder;

class AchievementSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['newcomer','Новичок','Зарегистрировался на платформе.','Профиль','registered',1,5,'common'],
            ['profile_complete','Профиль заполнен','Заполнил профиль минимум на 80%.','Профиль','profile_completion',80,25,'rare'],
            ['first_publication','Первый материал','Опубликовал первый материал.','Контент','publications_count',1,10,'common'],
            ['author','Автор','Опубликовал 5 материалов.','Контент','publications_count',5,50,'rare'],
            ['expert_author','Эксперт','Опубликовал 25 материалов.','Контент','publications_count',25,150,'epic'],
            ['first_question','Первый вопрос','Задал первый вопрос.','Вопросы','questions_count',1,10,'common'],
            ['curious','Любознательный','Задал 10 вопросов.','Вопросы','questions_count',10,60,'rare'],
            ['first_answer','Первый ответ','Оставил первый ответ.','Ответы','answers_count',1,10,'common'],
            ['helper','Помощник','Оставил 10 ответов.','Ответы','answers_count',10,60,'rare'],
            ['mentor','Наставник','Оставил 50 ответов.','Ответы','answers_count',50,180,'epic'],
            ['first_snippet','Первый сниппет','Опубликовал публичный сниппет.','Сниппеты','public_snippets_count',1,15,'common'],
            ['code_maker','Код-мейкер','Опубликовал 10 публичных сниппетов.','Сниппеты','public_snippets_count',10,80,'rare'],
            ['file_share','Файлообмен','Опубликовал первый публичный файл.','Файлы','public_files_count',1,15,'common'],
            ['archivist','Архивариус','Загрузил 10 файлов.','Файлы','files_count',10,80,'rare'],
            ['social_start','Социальный старт','Добавил первого друга.','Сообщество','friends_count',1,15,'common'],
            ['team_player','Командный игрок','Добавил 10 друзей.','Сообщество','friends_count',10,80,'rare'],
            ['popular','Популярный','Получил 10 подписчиков.','Сообщество','followers_count',10,100,'rare'],
            ['authority','Авторитет','Получил 100 репутации.','Репутация','reputation',100,100,'rare'],
            ['respected','Уважаемый участник','Получил 500 репутации.','Репутация','reputation',500,250,'epic'],
            ['legend','Легенда','Получил 1000 репутации.','Репутация','reputation',1000,500,'legendary'],
        ];
        foreach ($items as [$key,$name,$description,$category,$type,$value,$points,$rarity]) {
            Achievement::query()->updateOrCreate(['key' => $key], compact('name','description','category') + [
                'icon' => 'sparkles', 'condition_type' => $type, 'condition_value' => $value, 'points' => $points, 'rarity' => $rarity, 'is_active' => true,
            ]);
        }
    }
}
