import { HttpError } from '../utils/http-error.js';

export function positiveInteger(value, fieldName, statusCode = 422) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(statusCode, 'VALIDATION_ERROR', `El campo '${fieldName}' debe ser un entero positivo.`);
  }
  return parsed;
}

export function validateId(value) {
  return positiveInteger(value, 'id', 400);
}

export function realDate(value, fieldName, statusCode = 422) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(statusCode, 'VALIDATION_ERROR', `El campo '${fieldName}' debe usar AAAA-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(statusCode, 'VALIDATION_ERROR', `El campo '${fieldName}' no representa una fecha real.`);
  }
  return value;
}

export function validateSearchQuery(query) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search.length > 100) {
    throw new HttpError(422, 'VALIDATION_ERROR', "El parámetro 'search' no puede superar 100 caracteres.");
  }
  return { search };
}
