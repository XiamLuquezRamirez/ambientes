<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotaDocente extends Model
{
    protected $fillable = ['tema_id', 'user_id', 'contenido'];

    public function tema() { return $this->belongsTo(Tema::class); }
    public function user() { return $this->belongsTo(User::class); }
}
