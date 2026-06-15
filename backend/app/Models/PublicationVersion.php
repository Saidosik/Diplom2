<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
#[Fillable('publication_id','user_id','title','excerpt','tags','editor_state','cover_image_path','attachment_ids','version_number','change_summary')]
class PublicationVersion extends Model { protected function casts(): array { return ['tags'=>'array','editor_state'=>'array','attachment_ids'=>'array','version_number'=>'integer']; } }
