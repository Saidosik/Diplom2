<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
#[Fillable('user_id','title','slug','description','category','blocks_schema','tags','is_system')]
class PublicationTemplate extends Model { protected function casts(): array { return ['blocks_schema'=>'array','tags'=>'array','is_system'=>'boolean']; } }
