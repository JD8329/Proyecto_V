import * as materiasRepository from "../repositories/materias.repositorio.js";
import { HttpError } from "../utils/http-error.js";

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

export async function getMateriaById(id, userId) {
    const materia = await materiasRepository.findByIdAndUserId(id, userId);
    if (!materia) {
        throw new HttpError(404, "MATERIA_NOT_FOUND", "la materia no fue encontrada");
    }

    return materia;
}
export async function createMateria(userId, materia) {
    await ensureUniqueFields(userId, materia);
    return materiasRepository.createMateria(userId, materia);
}

export async function replaceMateria(id, userId, materia) {
    await getMateriaById(id, userId);
    await ensureUniqueFields(userId, materia, id);
    return materiasRepository.updateMateria(id, userId, materia);
}

export async function updateMateria(id, userId, partialMateria) {
    await getMateriaById(id, userId);
    await ensureUniqueFields(userId, partialMateria, id);
    return materiasRepository.patchMateria(id, userId, partialMateria);
}

export async function removeMateria(id, userId) {
    await getMateriaById(id, userId);
    await materiasRepository.deleteMateria(id, userId);
}

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