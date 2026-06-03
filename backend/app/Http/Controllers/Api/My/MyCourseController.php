<?php

namespace App\Http\Controllers\Api\My;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MyCourseController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $courses = Course::query()
            ->where('author_id', $request->user()->id)
            ->with('author:id,name')
            ->withCount('modules')
            ->latest()
            ->paginate(min(max($request->integer('per_page', 12), 1), 50))
            ->withQueryString();

        return CourseResource::collection($courses);
    }

    public function structure(Course $course): CourseResource
    {
        $this->authorize('update', $course);

        $course->load([
            'author:id,name',

            'modules' => fn($query) => $query
                ->orderBy('sort_order'),

            'modules.lessons' => fn($query) => $query
                ->orderBy('sort_order'),

            'modules.lessons.lessonBlocks' => fn($query) => $query
                ->orderBy('sort_order'),

            'modules.lessons.lessonBlocks.contents' => fn($query) => $query
                ->orderBy('sort_order'),
            'modules.lessons.lessonBlocks.test',
            'modules.lessons.lessonBlocks.test.questions' => fn($query) => $query->orderBy('sort_order'),
            'modules.lessons.lessonBlocks.test.questions.answerOptions' => fn($query) => $query->orderBy('sort_order'),
            'modules.lessons.lessonBlocks.test.questions.answer',
        ])->loadCount('modules');

        return new CourseResource($course);
    }
}
