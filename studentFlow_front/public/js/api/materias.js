import { request } from "./http.js";

function materiaPath(id) {
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new TypeError("El ID debe ser un entero mayor que cero.");
  }
  return `/materias/${parsed}`;
}

/** Filtros: search, activa, page, limit, sort y order. */
export function listarMaterias(filtros = {}) {
  return request("/materias", { query: filtros });
}

export function obtenerMateria(id) {
  return request(materiaPath(id));
}

/** nombre, codigo y color son obligatorios; creditos y activa son opcionales. */
export function crearMateria(materia) {
  return request("/materias", { method: "POST", body: materia });
}

/** PUT envía la representación completa; los opcionales omitidos se restablecen. */
export function reemplazarMateria(id, materia) {
  return request(materiaPath(id), { method: "PUT", body: materia });
}

/** PATCH envía solamente los campos que se quieren modificar. */
export function actualizarMateria(id, cambios) {
  return request(materiaPath(id), { method: "PATCH", body: cambios });
}

/** Devuelve null cuando el backend responde 204. */
export function eliminarMateria(id) {
  return request(materiaPath(id), { method: "DELETE" });
}
