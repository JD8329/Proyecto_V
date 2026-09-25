import * as materiasRepository from "../repositories/materias.repositorio.js";
import { HttpError } from "../utils/http-error.js";

/**
 * Obtiene la lista de materias asociadas a un usuario autenticado.
 * @async
 * @function listMaterias
 * @param {number} userId - Identificador único del usuario que posee las materias.
 * @param {Object} [filters={}] - Filtros de búsqueda, paginación y orden.
 * @param {number} [filters.page=1] - Número de página a consultar.
 * @param {number} [filters.limit=20] - Cantidad de elementos por página.
 * @param {boolean} [filters.activa] - Filtro por estado activo/inactivo de la materia.
 * @param {string} [filters.search] - Texto para buscar por nombre o código.
 * @param {string} [filters.sort='nombre'] - Campo usado para ordenar.
 * @param {string} [filters.order='asc'] - Dirección del ordenamiento.
 * @returns {Promise<Object>} Objeto con la colección de materias y meta de paginación.
 */
export async function listMaterias(userId, filters) {
    const { materias, total } = await materiasRepository.findAllByUserId(userId, filters);

    return {
        data: materias,
        meta: {
            page: filters.page,
            limit: filters.limit,
            total,
            pages: Math.ceil(total / filters.limit)
        }
    };
}

/**
 * Busca una materia por su identificador validando que pertenezca al usuario autenticado.
 * @async
 * @function getMateriaById
 * @param {number|string} id - Identificador de la materia.
 * @param {number|string} userId - Identificador del usuario autenticado.
 * @returns {Promise<Object>} La materia encontrada.
 * @throws {HttpError} Se lanza cuando la materia no existe para ese usuario.
 */
export async function getMateriaById(id, userId) {
    const materia = await materiasRepository.findByIdAndUserId(id, userId);
    if (!materia) {
        throw new HttpError(404, "MATERIA_NOT_FOUND", "la materia no fue encontrada");
    }

    return materia;
}

/**
 * Obtiene todas las tareas creadas para una materia específica del usuario autenticado.
 * @async
 * @function getTareasByMateriaId
 * @param {number|string} materiaId - Identificador de la materia.
 * @param {number|string} userId - Identificador del usuario autenticado.
 * @returns {Promise<Array<Object>>} Arreglo con las tareas asociadas a la materia.
 * @throws {HttpError} Se lanza si la materia no pertenece al usuario autenticado.
 */
export async function getTareasByMateriaId(materiaId, userId) {
    await getMateriaById(materiaId, userId);
    return materiasRepository.findTareasByMateriaIdAndUserId(materiaId, userId);
}

/**
 * Crea una nueva materia para el usuario autenticado y valida que no haya duplicados.
 * @async
 * @function createMateria
 * @param {number|string} userId - Identificador del usuario autenticado.
 * @param {Object} materia - Datos de la nueva materia.
 * @param {string} materia.nombre - Nombre de la materia.
 * @param {string} materia.codigo - Código único de la materia.
 * @param {string} materia.color - Color hexadecimal asociado a la materia.
 * @param {number} materia.creditos - Cantidad de créditos de la materia.
 * @param {boolean} [materia.activa=true] - Estado activo de la materia.
 * @returns {Promise<Object>} La materia creada.
 * @throws {HttpError} Se lanza si se detecta un código o nombre duplicado.
 */
export async function createMateria(userId, materia) {
    await ensureUniqueFields(userId, materia);
    return materiasRepository.createMateria(userId, materia);
}

/**
 * Reemplaza completamente una materia existente luego de validar que es del usuario actual.
 * @async
 * @function replaceMateria
 * @param {number|string} id - Identificador de la materia a reemplazar.
 * @param {number|string} userId - Identificador del usuario autenticado.
 * @param {Object} materia - Datos completos para la materia.
 * @returns {Promise<Object>} La materia actualizada.
 * @throws {HttpError} Se lanza si la materia no existe o si hay duplicados.
 */
export async function replaceMateria(id, userId, materia) {
    await getMateriaById(id, userId);
    await ensureUniqueFields(userId, materia, id);
    return materiasRepository.updateMateria(id, userId, materia);
}

/**
 * Actualiza parcialmente una materia existente validando duplicados y propiedad del usuario.
 * @async
 * @function updateMateria
 * @param {number|string} id - Identificador de la materia a actualizar.
 * @param {number|string} userId - Identificador del usuario autenticado.
 * @param {Object} partialMateria - Campos parciales a actualizar.
 * @returns {Promise<Object>} La materia actualizada.
 * @throws {HttpError} Se lanza si la materia no existe o si hay duplicados.
 */
export async function updateMateria(id, userId, partialMateria) {
    await getMateriaById(id, userId);
    await ensureUniqueFields(userId, partialMateria, id);
    return materiasRepository.patchMateria(id, userId, partialMateria);
}

/**
 * Elimina una materia solo si pertenece al usuario autenticado.
 * @async
 * @function removeMateria
 * @param {number|string} id - Identificador de la materia a eliminar.
 * @param {number|string} userId - Identificador del usuario autenticado.
 * @returns {Promise<void>} Resolución vacía si la eliminación fue exitosa.
 * @throws {HttpError} Se lanza si la materia no existe para el usuario.
 */
export async function removeMateria(id, userId) {
    await getMateriaById(id, userId);
    await materiasRepository.deleteMateria(id, userId);
}

/**
 * Valida que no exista otra materia del mismo usuario con el mismo código o nombre.
 * @async
 * @function ensureUniqueFields
 * @param {number|string} userId - Identificador del usuario autenticado.
 * @param {Object} materia - Datos de la materia a validar.
 * @param {number|string} [excludeId] - Identificador a excluir en la validación de duplicados.
 * @returns {Promise<void>} Resuelve sin errores si no hay valores duplicados.
 * @throws {HttpError} Se lanza si ya existe otra materia con el mismo código o nombre.
 */
async function ensureUniqueFields(userId, materia, excludeId) {
    if (materia.codigo) {
        const duplicatedCode = await materiasRepository.existsByCode(
            userId,
            materia.codigo,
            excludeId
        );

        if (duplicatedCode) {
            throw new HttpError(409, "DUPLICATE_CODE", "Ya existe una materia con ese código.");
        }
    }

    if (materia.nombre) {
        const duplicatedName = await materiasRepository.existsByName(
            userId,
            materia.nombre,
            excludeId
        );

        if (duplicatedName) {
            throw new HttpError(409, "DUPLICATE_NAME", "Ya existe una materia con ese nombre.");
        }
    }
}