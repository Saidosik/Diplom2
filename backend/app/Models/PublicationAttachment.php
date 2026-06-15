<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
#[Fillable('publication_id','file_id','attached_by','visibility','display_name','description','sort_order')]
class PublicationAttachment extends Model { protected function casts(): array { return ['sort_order'=>'integer']; } public function file(): BelongsTo { return $this->belongsTo(UserFile::class,'file_id'); } }
