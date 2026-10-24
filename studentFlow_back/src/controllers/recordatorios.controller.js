import * as recordatoriosService from "../services/recordatorios.service.js";
import { sendNoContent, sendSuccess } from "../utils/api-response.js";
import {
    validateCreateRecordatorio,
    validatePatchRecordatorio,
    validateRecordatorioId,
    validateRecordatorioListQuery,
} from "../validators/recordatorios.validator.js";

export async function listRecordatorios(request, response, next) {
    try {
        const filters = validateRecordatorioListQuery(request.query);
        const result = await recordatoriosService.listRecordatorios(request.user.id, filters);
        return sendSuccess(response, result.data, 200, result.meta);
    } catch (error) {
        return next(error);
    }
}

export async function getRecordatorio(request, response, next) {
    try {
        const id = validateRecordatorioId(request.params.id);
        const recordatorio = await recordatoriosService.getRecordatorioById(id, request.user.id);
        return sendSuccess(response, recordatorio);
    } catch (error) {
        return next(error);
    }
}

export async function listTareas(request, response, next) {
    try {
        const tareas = await recordatoriosService.listTareas(request.user.id);
        return sendSuccess(response, tareas);
    } catch (error) {
        return next(error);
    }
}

export async function createRecordatorio(request, response, next) {
    try {
        const payload = validateCreateRecordatorio(request.body);
        const recordatorio = await recordatoriosService.createRecordatorio(request.user.id, payload);
        return sendSuccess(response, recordatorio, 201);
    } catch (error) {
        return next(error);
    }
}

export async function replaceRecordatorio(request, response, next) {
    try {
        const id = validateRecordatorioId(request.params.id);
        const payload = validateCreateRecordatorio(request.body);
        const recordatorio = await recordatoriosService.replaceRecordatorio(id, request.user.id, payload);
        return sendSuccess(response, recordatorio);
    } catch (error) {
        return next(error);
    }
}

export async function updateRecordatorio(request, response, next) {
    try {
        const id = validateRecordatorioId(request.params.id);
        const payload = validatePatchRecordatorio(request.body);
        const recordatorio = await recordatoriosService.updateRecordatorio(id, request.user.id, payload);
        return sendSuccess(response, recordatorio);
    } catch (error) {
        return next(error);
    }
}

export async function deleteRecordatorio(request, response, next) {
    try {
        const id = validateRecordatorioId(request.params.id);
        await recordatoriosService.removeRecordatorio(id, request.user.id);
        return sendNoContent(response);
    } catch (error) {
        return next(error);
    }
}
