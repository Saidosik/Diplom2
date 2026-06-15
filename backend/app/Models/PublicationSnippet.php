<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
#[Fillable('publication_id','snippet_id','display_mode','sort_order')]
class PublicationSnippet extends Model { public function snippet(): BelongsTo { return $this->belongsTo(CodeSnippet::class,'snippet_id'); } }
