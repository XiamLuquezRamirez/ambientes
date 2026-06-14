<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SyncQueue;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function health()
    {
        return response()->json([
            'ok'        => true,
            'ambiente'  => config('ambiente.slug'),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function recibir(Request $request)
    {
        $data = $request->validate([
            'entidad'         => 'required|string',
            'entidad_id'      => 'required|integer',
            'accion'          => 'required|in:create,update,delete,transfer',
            'servidor_origen' => 'required|string',
            'payload'         => 'required|array',
        ]);

        SyncQueue::create([
            ...$data,
            'estado' => 'confirmado',
        ]);

        return response()->json(['ok' => true]);
    }
}
