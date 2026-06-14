<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginLog extends Model
{
    public $timestamps = false;
    protected $fillable = ['docente_id', 'ip', 'ambiente', 'fecha'];

    public function docente() { return $this->belongsTo(Docente::class); }
}
