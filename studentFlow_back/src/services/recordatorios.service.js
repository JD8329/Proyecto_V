import * as recordatoriosRepository from "../repositories/recordatorios.repositorio.js";
import { HttpError } from "../utils/http-error.js";

export async function listRecordatorios(userId, filters) {
    const { recordatorios, total } = await recordatoriosRepository.findAllByUserId(userId, filters);
    return {
        data: recordatorios,
        meta: {
            page: filters.page,
            limit: filters.limit,
            total,
            pages: Math.ceil(total / filters.limit),
        },
    };
}

export async function getRecordatorioById(id, userId) {
    const recordatorio = await recordatoriosRepository.findByIdAndUserId(id, userId);
    if (!recordatorio) {
        throw new HttpError(404, "RECORDATORIO_NO_ENCONTRADO", "El recordatorio no fue encontrado.");
    }
    return recordatorio;
}

export async function listTareas(userId) {
    return recordatoriosRepository.findTareasByUserId(userId);
}

export async function createRecordatorio(userId, recordatorio) {
    const created = await recordatoriosRepository.createRecordatorio(userId, recordatorio);
    if (!created) {
        throw new HttpError(404, "TAREA_NO_ENCONTRADA", "La tarea no fue encontrada para este usuario.");
    }
    return created;
}

export async function replaceRecordatorio(id, userId, recordatorio) {
    const updated = await recordatoriosRepository.updateRecordatorio(id, userId, recordatorio);
    if (!updated) {
        throw new HttpError(404, "RECORDATORIO_NO_ENCONTRADO", "El recordatorio no fue encontrado.");
    }
    return updated;
}

export async function updateRecordatorio(id, userId, changes) {
    const updated = await recordatoriosRepository.updateRecordatorio(id, userId, changes);
    if (!updated) {
        throw new HttpError(404, "RECORDATORIO_NO_ENCONTRADO", "El recordatorio no fue encontrado.");
    }
    return updated;
}

export async function removeRecordatorio(id, userId) {
    const removed = await recordatoriosRepository.deleteRecordatorio(id, userId);
    if (!removed) {
        throw new HttpError(404, "RECORDATORIO_NO_ENCONTRADO", "El recordatorio no fue encontrado.");
    }
}
