<?php

namespace Tests\Feature;

use App\Models\Publication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class PublicationStudioTest extends TestCase
{
    use RefreshDatabase;

    public function test_autosave_uses_version_conflict_protection(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $publication = Publication::create(['author_id'=>$user->id,'type'=>'article','status'=>'draft','title'=>'Draft','slug'=>'draft','reading_time_minutes'=>1,'autosave_version'=>0]);

        $this->withToken(JWTAuth::fromUser($user))->postJson("/api/publications/{$publication->id}/autosave", [
            'autosave_version'=>0,
            'editor_state'=>['blocks'=>[]],
            'title'=>'Draft updated',
            'blocks'=>[['type'=>'paragraph','sort_order'=>0,'content'=>['text'=>'Hello']]],
            'tags'=>['Laravel'],
        ])->assertOk()->assertJsonPath('data.autosave_version', 1);

        $this->withToken(JWTAuth::fromUser($user))->postJson("/api/publications/{$publication->id}/autosave", [
            'autosave_version'=>0,
            'editor_state'=>['blocks'=>[]],
        ])->assertStatus(409);
    }

    public function test_quality_analyzer_and_markdown_import_endpoints(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->withToken(JWTAuth::fromUser($user))->postJson('/api/publications/analyze-quality', [
            'title'=>'Good technical guide',
            'excerpt'=>'Short',
            'tags'=>[],
            'blocks'=>[['type'=>'code','content'=>['code'=>'echo 1;']]],
        ])->assertOk()->assertJsonStructure(['score','warnings','suggestions','blockers']);

        $this->withToken(JWTAuth::fromUser($user))->postJson('/api/publications/import-markdown', ['markdown'=>"# Title\n\nBody"])
            ->assertOk()->assertJsonPath('data.blocks.0.type', 'heading');
    }
}
