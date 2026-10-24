import { HttpError } from "../utils/http-error.js";

const channels = new Set(["in_app", "email"]);

function invalid(message) {
    throw new HttpError(422, "VALIDATION_ERROR", message);
}

function parseBoolean(value, fieldName) {
    if (typeof value === "boolean") {
        return value;
    }
    if (value === "true") {
        return true;
    }
    if (value === "false") {
        return false;
    }
    invalid(`El campo '${fieldName}' debe ser true o false.`);
}

function parsePositiveInteger(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        invalid(`El campo '${fieldName}' debe ser un entero mayor que cero.`);
    }
    return parsed;
}

function parseMessage(value) {
    if (typeof value !== "string" || value.trim() === "" || value.trim().length > 255) {
        invalid("El campo 'mensaje' es obligatorio y debe tener máximo 255 caracteres.");
    }
    return value.trim();
}

function parseDateTime(value) {
    if (typeof value !== "string") {
        invalid("El campo 'fechaHora' debe ser una fecha y hora válida.");
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
    if (!match) {
        invalid("El campo 'fechaHora' debe usar el formato YYYY-MM-DDTHH:mm[:ss].");
    }

    const [, year, month, day, hour, minute, second = "00"] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const validDate = date.getUTCFullYear() === Number(year)
        && date.getUTCMonth() === Number(month) - 1
        && date.getUTCDate() === Number(day);
    if (!validDate || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
        invalid("El campo 'fechaHora' no contiene una fecha y hora válida.");
    }

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function parseChannel(value) {
    if (!channels.has(value)) {
        invalid("El campo 'canal' debe ser 'in_app' o 'email'.");
    }
    return value;
}

export function validateRecordatorioId(id) {
    return parsePositiveInteger(id, "id");
}

export function validateRecordatorioListQuery(query) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    if (!Number.isInteger(page) || page < 1) {
        invalid("El parámetro 'page' debe ser un entero mayor o igual a 1.");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        invalid("El parámetro 'limit' debe ser un entero entre 1 y 100.");
    }
    let leido;
    if (query.leido !== undefined) {
        leido = parseBoolean(query.leido, "leido");
    }
    return {
        leido,
        search: typeof query.search === "string" ? query.search.trim() : "",
        sort: query.sort,
        order: query.order,
        page,
        limit,
    };
}

function validateFields(body, { partial }) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        invalid("El cuerpo debe ser un objeto JSON.");
    }
    const recordatorio = {};

    if (!partial || body.tareaId !== undefined) {
        recordatorio.tareaId = parsePositiveInteger(body.tareaId, "tareaId");
    }
    if (!partial || body.mensaje !== undefined) {
        recordatorio.mensaje = parseMessage(body.mensaje);
    }
    if (!partial || body.fechaHora !== undefined) {
        recordatorio.fechaHora = parseDateTime(body.fechaHora);
    }
    if (!partial || body.canal !== undefined) {
        recordatorio.canal = parseChannel(body.canal);
    }
    if (!partial || body.leido !== undefined) {
        recordatorio.leido = body.leido === undefined
            ? false
            : parseBoolean(body.leido, "leido");
    }

    if (partial && Object.keys(recordatorio).length === 0) {
        invalid("No se enviaron campos válidos para actualizar.");
    }
    return recordatorio;
}

export function validateCreateRecordatorio(body) {
    return validateFields(body, { partial: false });
}

export function validatePatchRecordatorio(body) {
    return validateFields(body, { partial: true });
}
