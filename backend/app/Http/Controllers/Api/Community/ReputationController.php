<?php

namespace App\Http\Controllers\Api\Community;

use App\Http\Controllers\Controller;
use App\Http\Resources\Community\ReputationEventResource;
use App\Models\ReputationEvent;
use App\Models\User;
use Illuminate\Http\Request;

class ReputationController extends Controller
{
    public function mine(Request $request)
    {
        return $this->eventsFor($request, $request->user());
    }

    public function user(Request $request, User $user)
    {
        return $this->eventsFor($request, $user);
    }

    private function eventsFor(Request $request, User $user)
    {
        $perPage = min(max((int) $request->query('per_page', 10), 1), 50);

        $events = ReputationEvent::query()
            ->where('user_id', $user->id)
            ->with('actor')
            ->latest()
            ->paginate($perPage);

        return ReputationEventResource::collection($events);
    }
}
