import * as materiasService from "../services/materias.service.js";
import { sendNoContent, sendSuccess } from "../utils/api-response.js";

import {
  validateCreateMateria,
  validateMateriaId,
  validateMateriaListQuery,
  validatePatchMateria
} from "../validators/materias.validator.js";

/**
 * Lista todas las materias del usuario autenticado.
 * @async
 * @function listMaterias
 * @param {import('express').Request} request - Request de Express.
 * @param {import('express').Response} response - Response de Express.
 * @param {Function} next - Middleware para errores.
 * @returns {Promise<import('express').Response>} Respuesta con la lista de materias.
 */
export async function listMaterias(request, response, next) {
  try {
    const filters = validateMateriaListQuery(request.query);
    const result = await materiasService.listMaterias(request.user.id, filters);
    return sendSuccess(response, result.data, 200, result.meta);
  } catch (error) {
    return next(error);
  }
}

/**
 * Obtiene una materia por su id validando que pertenezca al usuario autenticado.
 * @async
 * @function getMateria
 * @param {import('express').Request} request - Request de Express.
 * @param {import('express').Response} response - Response de Express.
 * @param {Function} next - Middleware para errores.
 * @returns {Promise<import('express').Response>} Respuesta con la materia consultada.
 */
export async function getMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const materia = await materiasService.getMateriaById(id, request.user.id);
    return sendSuccess(response, materia);

  } catch (error) {
    return next(error);
  }
}

/**
 * Devuelve todas las tareas relacionadas con una materia del usuario autenticado.
 * @async
 * @function getMateriaTareas
 * @param {import('express').Request} request - Request de Express.
 * @param {import('express').Response} response - Response de Express.
 * @param {Function} next - Middleware para errores.
 * @returns {Promise<import('express').Response>} Respuesta con las tareas de la materia.
 */
export async function getMateriaTareas(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const tareas = await materiasService.getTareasByMateriaId(id, request.user.id);
    return sendSuccess(response, tareas);
  } catch (error) {
    return next(error);
  }
}

/**
 * Crea una nueva materia para el usuario autenticado.
 * @async
 * @function createMateria
 * @param {import('express').Request} request - Request de Express.
 * @param {import('express').Response} response - Response de Express.
 * @param {Function} next - Middleware para errores.
 * @returns {Promise<import('express').Response>} Respuesta con la materia creada.
 */
export async function createMateria(request, response, next) {
  try {
    const payload = validateCreateMateria(request.body);
    const materia = await materiasService.createMateria(request.user.id, payload);
    return sendSuccess(response, materia, 201);
  } catch (error) {
    return next(error);
  }
}

/**
 * Reemplaza por completo una materia del usuario autenticado.
 * @async
 * @function replaceMateria
 * @param {import('express').Request} request - Request de Express.
 * @param {import('express').Response} response - Response de Express.
 * @param {Function} next - Middleware para errores.
 * @returns {Promise<import('express').Response>} Respuesta con la materia actualizada.
 */
export async function replaceMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const payload = validateCreateMateria(request.body);
    const materia = await materiasService.replaceMateria(id, request.user.id, payload);
    return sendSuccess(response, materia);
  } catch (error) {
    return next(error);
  }
}

/**
 * Actualiza parcialmente una materia del usuario autenticado.
 * @async
 * @function updateMateria
 * @param {import('express').Request} request - Request de Express.
 * @param {import('express').Response} response - Response de Express.
 * @param {Function} next - Middleware para errores.
 * @returns {Promise<import('express').Response>} Respuesta con la materia actualizada.
 */
export async function updateMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    const payload = validatePatchMateria(request.body);
    const materia = await materiasService.updateMateria(id, request.user.id, payload);
    return sendSuccess(response, materia);
  } catch (error) {
    return next(error);
  }
}

/**
 * Elimina una materia del usuario autenticado.
 * @async
 * @function deleteMateria
 * @param {import('express').Request} request - Request de Express.
 * @param {import('express').Response} response - Response de Express.
 * @param {Function} next - Middleware para errores.
 * @returns {Promise<import('express').Response>} Respuesta vacía con estado 204.
 */
export async function deleteMateria(request, response, next) {
  try {
    const id = validateMateriaId(request.params.id);
    await materiasService.removeMateria(id, request.user.id);
    return sendNoContent(response);
  } catch (error) {
    return next(error);
  }
}