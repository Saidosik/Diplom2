<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
#[Fillable('publication_id','user_id','locked_until')]
class PublicationLock extends Model { protected function casts(): array { return ['locked_until'=>'datetime']; } }
