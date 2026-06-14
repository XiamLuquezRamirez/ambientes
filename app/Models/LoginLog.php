<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginLog extends Model
{
    public $timestamps = false;
    protected $fillable = ['user_id', 'ip', 'ambiente', 'fecha'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
