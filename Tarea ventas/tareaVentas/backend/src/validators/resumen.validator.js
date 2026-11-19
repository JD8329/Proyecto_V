import { HttpError } from '../utils/http-error.js';
import { realDate } from './common.validator.js';

export function validateDateRange(query) {
  if (query.desde === undefined || query.hasta === undefined) {
    throw new HttpError(400, 'DATE_RANGE_REQUIRED', "Debe indicar los parámetros 'desde' y 'hasta'.");
  }
  const from = realDate(query.desde, 'desde', 400);
  const to = realDate(query.hasta, 'hasta', 400);
  if (from > to) {
    throw new HttpError(400, 'INVALID_DATE_RANGE', "'desde' no puede ser posterior a 'hasta'.");
  }
  return { from, to };
}
