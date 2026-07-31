<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\CondicionInclusion;
use App\Models\DocumentoCondicion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Fpdi;
use Throwable;

class DocumentoCondicionController extends Controller
{
    public function mostrar(CondicionInclusion $condicionInclusion)
    {
        $documento = $condicionInclusion->documento;

        return response()->json([
            'success' => true,
            'condicion' => [
                'id' => $condicionInclusion->id,
                'codigo' => $condicionInclusion->codigo,
                'nombre' => $condicionInclusion->nombre,
            ],
            'documento' => $documento ? [
                'id' => $documento->id,
                'nombre_archivo' => $documento->nombre_archivo,
                'numero_paginas' => $documento->numero_paginas,
                'tamano_mb' => $documento->tamano_mb,
                'fecha_actualizacion' => $documento->fecha_actualizacion_formato,
                'url_ver' => route('superadmin.condiciones.documento.ver', $condicionInclusion),
                'existe' => $documento->existeArchivo(),
            ] : null,
        ]);
    }

    public function guardar(Request $request, CondicionInclusion $condicionInclusion)
    {
        $documentoActual = $condicionInclusion->documento;

        $request->validate([
            'archivo' => [
                $documentoActual ? 'nullable' : 'required',
                'file',
                'mimes:pdf',
                'max:10240', // 10 MB
            ],
        ], [
            'archivo.required' => 'Debe seleccionar un archivo PDF.',
            'archivo.mimes' => 'El archivo debe ser un PDF.',
            'archivo.max' => 'El PDF no puede superar los 10 MB.',
        ]);

        if (! $request->hasFile('archivo')) {
            return response()->json([
                'success' => false,
                'message' => 'No se recibió un archivo para actualizar.',
            ], 422);
        }

        $archivo = $request->file('archivo');
        $rutaAnterior = $documentoActual?->ruta_archivo;
        $ruta = $archivo->store('documentos_condiciones', 'public');
        $rutaAbsoluta = Storage::disk('public')->path($ruta);
        $tamanoMb = round($archivo->getSize() / 1048576, 2);
        $paginas = $this->contarPaginasPdf($rutaAbsoluta);

        $documento = DocumentoCondicion::updateOrCreate(
            ['condicion_id' => $condicionInclusion->id],
            [
                'nombre_archivo' => $archivo->getClientOriginalName(),
                'ruta_archivo' => $ruta,
                'numero_paginas' => $paginas,
                'tamano_mb' => $tamanoMb,
                'usuario_id' => Auth::guard('docente')->id(),
                'fecha_actualizacion' => now(),
            ]
        );

        if ($rutaAnterior && $rutaAnterior !== $ruta && Storage::disk('public')->exists($rutaAnterior)) {
            Storage::disk('public')->delete($rutaAnterior);
        }

        return response()->json([
            'success' => true,
            'message' => $documentoActual
                ? 'Documento actualizado correctamente.'
                : 'Documento cargado correctamente.',
            'documento' => [
                'id' => $documento->id,
                'nombre_archivo' => $documento->nombre_archivo,
                'numero_paginas' => $documento->numero_paginas,
                'tamano_mb' => $documento->tamano_mb,
                'fecha_actualizacion' => $documento->fecha_actualizacion_formato,
                'url_ver' => route('superadmin.condiciones.documento.ver', $condicionInclusion),
            ],
        ]);
    }

    public function ver(CondicionInclusion $condicionInclusion)
    {
        $documento = $condicionInclusion->documento;

        if (! $documento || ! $documento->existeArchivo()) {
            abort(404, 'Documento no encontrado.');
        }

        return response()->file($documento->rutaAbsoluta(), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$documento->nombre_archivo.'"',
        ]);
    }

    public function eliminar(CondicionInclusion $condicionInclusion)
    {
        $documento = $condicionInclusion->documento;

        if (! $documento) {
            return response()->json([
                'success' => false,
                'message' => 'La condición no tiene documento.',
            ], 404);
        }

        if ($documento->existeArchivo()) {
            Storage::disk('public')->delete($documento->ruta_archivo);
        }

        $documento->delete();

        return response()->json([
            'success' => true,
            'message' => 'Documento eliminado correctamente.',
        ]);
    }

    private function contarPaginasPdf(string $rutaAbsoluta): int
    {
        try {
            $pdf = new Fpdi;
            $paginas = $pdf->setSourceFile($rutaAbsoluta);

            return max(1, (int) $paginas);
        } catch (Throwable) {
            $contenido = @file_get_contents($rutaAbsoluta) ?: '';
            if (preg_match_all('/\/Type\s*\/Page[^s]/', $contenido, $matches)) {
                return max(1, count($matches[0]));
            }

            return 1;
        }
    }
}
