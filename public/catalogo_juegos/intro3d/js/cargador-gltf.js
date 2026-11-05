/**
 * GLTFLoader con el decodificador Meshopt: los GLB de models/ van comprimidos con
 * EXT_meshopt_compression. Todo cargador de modelos 3D de los juegos debe salir de aquí.
 */
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

export function crearCargadorGltf() {
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}
