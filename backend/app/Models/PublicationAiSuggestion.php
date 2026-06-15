<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
#[Fillable('publication_id','user_id','type','payload','status')]
class PublicationAiSuggestion extends Model { protected function casts(): array { return ['payload'=>'array']; } }
