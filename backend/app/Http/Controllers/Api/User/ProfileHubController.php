<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Models\ActivityEvent;
use App\Models\ChatConversation;
use App\Models\ChatParticipant;
use App\Models\CodeSnippet;
use App\Models\FriendRequest;
use App\Models\Friendship;
use App\Models\IssueAnswer;
use App\Models\IssueQuestion;
use App\Models\Publication;
use App\Models\Reaction;
use App\Models\ReputationEvent;
use App\Models\SavedItem;
use App\Models\User;
use App\Models\UserFile;
use App\Services\Profile\AchievementService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileHubController extends Controller
{
    public function me(Request $request, AchievementService $achievements): JsonResponse
    {
        $user = $request->user();
        $achievements->recalculate($user);
        return response()->json($this->dashboard($request, $user, true, $achievements));
    }

    public function public(Request $request, User $user, AchievementService $achievements): JsonResponse
    {
        abort_if($user->isProfilePrivate() && ! $this->isFriendOrSelf($request->user(), $user), 403, 'Профиль закрыт пользователем.');
        return response()->json($this->dashboard($request, $user, false, $achievements));
    }

    public function materials(Request $request, User $user): JsonResponse { return response()->json(['data' => $this->materialsData($user, $request->query('type', 'all'), false)]); }
    public function snippets(Request $request, User $user): JsonResponse { return response()->json(['data' => $this->snippetsData($user, false)]); }
    public function files(Request $request, User $user): JsonResponse { abort_unless($user->show_files_publicly ?? true, 403); return response()->json(['data' => $this->filesData($user, false)]); }
    public function friends(Request $request, User $user): JsonResponse { abort_unless($user->show_friends_publicly ?? true, 403); return response()->json(['data' => $this->friendsData($user, $request->user())]); }
    public function activity(Request $request, User $user): JsonResponse { abort_unless($user->show_activity_publicly ?? true, 403); return response()->json(['data' => $this->activityData($user, false)]); }
    public function achievements(Request $request, User $user, AchievementService $service): JsonResponse { $service->recalculate($user); return response()->json(['data' => $this->achievementsData($user)]); }
    public function reputation(Request $request, User $user): JsonResponse { return response()->json(['data' => $this->reputationData($user)]); }

    public function message(Request $request, User $user): JsonResponse
    {
        $viewer = $request->user();
        abort_if((int) $viewer->id === (int) $user->id, 422, 'Нельзя создать чат с самим собой.');
        $ids = [(int) $viewer->id, (int) $user->id]; sort($ids); $key = implode(':', $ids);
        $conversation = DB::transaction(function () use ($viewer, $user, $key) {
            $conversation = ChatConversation::query()->firstOrCreate(['direct_key' => $key], ['type' => ChatConversation::TYPE_DIRECT, 'owner_id' => $viewer->id, 'last_message_at' => now()]);
            foreach ([$viewer->id, $user->id] as $id) {
                ChatParticipant::query()->firstOrCreate(['chat_conversation_id' => $conversation->id, 'user_id' => $id], ['role' => ChatParticipant::ROLE_MEMBER, 'joined_at' => now()]);
            }
            return $conversation;
        });
        return response()->json(['data' => ['id' => $conversation->id, 'url' => '/chats?conversation=' . $conversation->id]]);
    }

    private function dashboard(Request $request, User $user, bool $owner, AchievementService $service): array
    {
        $viewer = $request->user();
        return [
            'user' => $this->userData($user, $owner),
            'stats' => $this->stats($user),
            'completion' => $service->completion($user),
            'materials' => $this->materialsData($user, 'all', $owner, 8),
            'snippets' => $this->snippetsData($user, $owner, 6),
            'files' => ($owner || ($user->show_files_publicly ?? true)) ? $this->filesData($user, $owner, 6) : [],
            'friends' => $this->friendsData($user, $viewer, 8),
            'activity' => ($owner || ($user->show_activity_publicly ?? true)) ? $this->activityData($user, $owner, 12) : [],
            'achievements' => $this->achievementsData($user),
            'reputation' => $this->reputationData($user),
            'saved_summary' => $owner ? SavedItem::query()->where('user_id', $user->id)->count() : null,
            'relationship_to_viewer' => $owner ? ['is_owner' => true] : $this->relationship($viewer, $user),
        ];
    }

    private function userData(User $user, bool $owner): array
    {
        return collect($user->toArray())->only(['id','name','avatar','cover_url','headline','bio','location','direction','website_url','github_url','profile_visibility','created_at','reputation_score','show_friends_publicly','show_files_publicly','show_activity_publicly'])->when($owner || $user->show_email_publicly, fn ($c) => $c->put('email', $user->email))->all();
    }

    private function stats(User $u): array
    {
        return ['reputation' => (int) $u->reputation_score, 'publications' => $u->publications()->published()->count(), 'questions' => $u->issueQuestions()->published()->count(), 'answers' => $u->issueAnswers()->count(), 'snippets' => $u->codeSnippets()->where('visibility','public')->count(), 'files' => $u->userFiles()->where('visibility','public')->count(), 'friends' => $this->friendIds($u)->count(), 'followers' => $u->subscribers()->count(), 'following' => $u->subscriptions()->count()];
    }

    private function materialsData(User $u, string $type='all', bool $owner=false, int $limit=50): array
    {
        $items = collect();
        if ($type === 'all' || $type === 'publications') $items = $items->merge(Publication::query()->published()->where('author_id',$u->id)->withCount(['comments','savedItems','reactions as likes_count'=>fn(Builder $q)=>$q->where('type',Reaction::LIKE)])->latest('published_at')->limit($limit)->get()->map(fn($x)=>['type'=>'publication','id'=>$x->id,'title'=>$x->title,'excerpt'=>$x->excerpt,'url'=>'/publications/'.$x->slug,'score'=>($x->likes_count??0)+($x->saved_items_count??0),'created_at'=>$x->published_at]));
        if ($type === 'all' || $type === 'questions') $items = $items->merge(IssueQuestion::query()->published()->where('author_id',$u->id)->withCount(['answers','reactions as likes_count'=>fn(Builder $q)=>$q->where('type',Reaction::LIKE)])->latest('published_at')->limit($limit)->get()->map(fn($x)=>['type'=>'question','id'=>$x->id,'title'=>$x->title,'excerpt'=>$x->excerpt,'url'=>'/issues/'.$x->slug,'score'=>($x->likes_count??0)+($x->answers_count??0),'created_at'=>$x->published_at]));
        if ($type === 'all' || $type === 'answers') $items = $items->merge(IssueAnswer::query()->where('author_id',$u->id)->with('question')->latest()->limit($limit)->get()->map(fn($x)=>['type'=>'answer','id'=>$x->id,'title'=>'Ответ: '.($x->question->title ?? 'вопрос'),'excerpt'=>str($x->body ?? '')->limit(140)->toString(),'url'=>'/issues/'.($x->question->slug ?? ''),'score'=>0,'created_at'=>$x->created_at]));
        return $items->sortByDesc('created_at')->take($limit)->values()->all();
    }

    private function snippetsData(User $u, bool $owner, int $limit=50): array { return CodeSnippet::query()->where('user_id',$u->id)->when(! $owner, fn($q)=>$q->where('visibility','public')->where('status',CodeSnippet::STATUS_ACTIVE))->withCount('runs')->latest()->limit($limit)->get(['id','title','language','snippet_type','visibility','status','created_at','updated_at'])->map(fn($s)=>$s->toArray()+['url'=>'/playground?snippet='.$s->id])->all(); }
    private function filesData(User $u, bool $owner, int $limit=50): array { return UserFile::query()->where('user_id',$u->id)->when(! $owner, fn($q)=>$q->where('visibility','public'))->with('folder')->latest()->limit($limit)->get(['id','folder_id','title','original_name','mime_type','size','kind','visibility','created_at'])->map(fn($f)=>$f->toArray()+['download_url'=>'/api/me/files/'.$f->id.'/download'])->all(); }
    private function friendsData(User $u, ?User $viewer, int $limit=50): array { if (!($u->show_friends_publicly ?? true) && (!$viewer || (int)$viewer->id !== (int)$u->id)) return []; $ids=$this->friendIds($u); return User::query()->whereIn('id',$ids)->limit($limit)->get(['id','name','avatar','headline','reputation_score'])->all(); }
    private function activityData(User $u, bool $owner, int $limit=50): array { return ActivityEvent::query()->where('user_id',$u->id)->when(! $owner, fn($q)=>$q->where('visibility','public'))->latest()->limit($limit)->get()->map(fn($e)=>['id'=>$e->id,'type'=>$e->type,'metadata'=>$e->metadata,'created_at'=>$e->created_at])->all(); }
    private function achievementsData(User $u): array { return $u->achievements()->with('achievement')->get()->map(fn($ua)=>['key'=>$ua->achievement->key,'name'=>$ua->achievement->name,'description'=>$ua->achievement->description,'category'=>$ua->achievement->category,'points'=>$ua->achievement->points,'rarity'=>$ua->achievement->rarity,'progress'=>$ua->progress,'target'=>$ua->achievement->condition_value,'unlocked_at'=>$ua->unlocked_at])->all(); }
    private function reputationData(User $u): array { return ['score'=>(int)$u->reputation_score,'level'=>$u->reputationLevel(),'events'=>ReputationEvent::query()->where('user_id',$u->id)->latest()->limit(30)->get(['id','points','reason','description','created_at'])]; }
    private function relationship(?User $viewer, User $u): array { if(!$viewer) return ['is_owner'=>false,'is_following'=>false,'is_friend'=>false,'friend_request_status'=>null,'can_message'=>false]; $isFriend=$this->isFriendOrSelf($viewer,$u); $pending=FriendRequest::query()->where('status',FriendRequest::STATUS_PENDING)->where(fn($q)=>$q->where(fn($x)=>$x->where('sender_id',$viewer->id)->where('recipient_id',$u->id))->orWhere(fn($x)=>$x->where('sender_id',$u->id)->where('recipient_id',$viewer->id)))->first(); return ['is_owner'=>false,'is_following'=>$viewer->subscriptions()->where('subscribable_type',User::class)->where('subscribable_id',$u->id)->exists(),'is_friend'=>$isFriend,'friend_request_status'=>$pending?((int)$pending->sender_id===(int)$viewer->id?'sent':'incoming'):null,'can_message'=>true,'mutual_friends_count'=>$this->friendIds($viewer)->intersect($this->friendIds($u))->count()]; }
    private function isFriendOrSelf(?User $a, User $b): bool { return $a && ((int)$a->id===(int)$b->id || $this->friendIds($a)->contains((int)$b->id)); }
    private function friendIds(User $u) { return Friendship::query()->where(fn($q)=>$q->where('user_one_id',$u->id)->orWhere('user_two_id',$u->id))->get(['user_one_id','user_two_id'])->map(fn($f)=>(int)$f->user_one_id===(int)$u->id?(int)$f->user_two_id:(int)$f->user_one_id); }
}
