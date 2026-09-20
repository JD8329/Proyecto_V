import { HttpError } from "../utils/http-error.js";

function parseBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  throw new HttpError(422, "VALIDATION_ERROR", "El filtro 'activa' debe ser true o false.");
}

function parsePositiveInteger(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new HttpError(422, "VALIDATION_ERROR", `El campo '${fieldName}' debe ser un entero positivo o cero.`);
  }

  return parsed;
}

function normalizeString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(422, "VALIDATION_ERROR", `El campo '${fieldName}' es obligatorio.`);
  }

  return value.trim();
}

function validateColor(color) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new HttpError(422, "VALIDATION_ERROR", "El campo 'color' debe tener formato hexadecimal #RRGGBB.");
  }
}

export function validateMateriaListQuery(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    throw new HttpError(422, "VALIDATION_ERROR", "El parámetro 'page' debe ser un entero mayor o igual a 1.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new HttpError(422, "VALIDATION_ERROR", "El parámetro 'limit' debe ser un entero entre 1 y 100.");
  }

  return {
    activa: parseBoolean(query.activa),
    search: typeof query.search === "string" ? query.search.trim() : "",
    sort: query.sort,
    order: query.order,
    page,
    limit
  };
}

export function validateMateriaId(id) {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId < 1) {
    throw new HttpError(400, "INVALID_ID", "El identificador de materia no es válido.");
  }

  return parsedId;
}

export function validateCreateMateria(body) {
  const nombre = normalizeString(body.nombre, "nombre");
  const codigo = normalizeString(body.codigo, "codigo");
  const color = normalizeString(body.color, "color");
  const creditos = parsePositiveInteger(body.creditos, "creditos");
  const activa = body.activa === undefined ? true : parseBoolean(body.activa);

  validateColor(color);

  return {
    nombre,
    codigo,
    color,
    creditos,
    activa
  };
}

export function validatePatchMateria(body) {
  const payload = {};

  if (body.nombre !== undefined) {
    payload.nombre = normalizeString(body.nombre, "nombre");
  }

  if (body.codigo !== undefined) {
    payload.codigo = normalizeString(body.codigo, "codigo");
  }

  if (body.color !== undefined) {
    payload.color = normalizeString(body.color, "color");
    validateColor(payload.color);
  }

  if (body.creditos !== undefined) {
    payload.creditos = parsePositiveInteger(body.creditos, "creditos");
  }

  if (body.activa !== undefined) {
    payload.activa = parseBoolean(body.activa);
  }

  if (Object.keys(payload).length === 0) {
    throw new HttpError(422, "VALIDATION_ERROR", "No se enviaron campos válidos para actualizar.");
  }

  return payload;
}