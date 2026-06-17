<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SyncLogController extends Controller
{
    public function listar(Request $request)
    {
        return view('admin.sync-log.index');
    }
}
