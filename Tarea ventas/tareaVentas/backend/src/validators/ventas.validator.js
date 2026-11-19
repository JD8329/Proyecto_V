import { HttpError } from '../utils/http-error.js';
import { positiveInteger, realDate, validateId } from './common.validator.js';

const VALID_STATES = new Set(['CONFIRMADA', 'ANULADA']);

function state(value, required = false) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || !VALID_STATES.has(value.toUpperCase())) {
    throw new HttpError(422, 'VALIDATION_ERROR', "El estado debe ser 'CONFIRMADA' o 'ANULADA'.");
  }
  return value.toUpperCase();
}

function dateTime(value, required = false) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string') {
    throw new HttpError(422, 'VALIDATION_ERROR', "El campo 'fechaVenta' debe ser una fecha válida.");
  }
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}:\d{2}))?$/);
  if (!match) {
    throw new HttpError(422, 'VALIDATION_ERROR', "'fechaVenta' debe usar AAAA-MM-DD o AAAA-MM-DD HH:mm:ss.");
  }
  const time = match[2] || '00:00:00';
  const parsed = new Date(`${match[1]}T${time}Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 19) !== `${match[1]}T${time}`) {
    throw new HttpError(422, 'VALIDATION_ERROR', "'fechaVenta' no representa una fecha real.");
  }
  return `${match[1]} ${time}`;
}

function salePrice(value, index) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999999999.99) {
    throw new HttpError(422, 'VALIDATION_ERROR', `El precio del detalle ${index + 1} no es válido.`);
  }
  return Math.round(parsed * 100) / 100;
}

function details(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'La venta debe incluir al menos un detalle.');
  }
  if (value.length > 100) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Una venta no puede incluir más de 100 detalles.');
  }

  const productIds = new Set();
  return value.map((detail, index) => {
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
      throw new HttpError(422, 'VALIDATION_ERROR', `El detalle ${index + 1} no es válido.`);
    }
    const productId = positiveInteger(detail.productoId, `detalles[${index}].productoId`);
    if (productIds.has(productId)) {
      throw new HttpError(422, 'VALIDATION_ERROR', `El producto ${productId} está repetido en la venta.`);
    }
    productIds.add(productId);
    return {
      productId,
      quantity: positiveInteger(detail.cantidad, `detalles[${index}].cantidad`),
      unitPrice: salePrice(detail.precioUnitario, index),
    };
  });
}

export function validateSaleId(value) {
  return validateId(value);
}

export function validateSaleListQuery(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpError(422, 'VALIDATION_ERROR', "'page' debe ser mayor o igual a 1.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new HttpError(422, 'VALIDATION_ERROR', "'limit' debe estar entre 1 y 100.");
  }
  const status = query.estado === undefined ? undefined : state(query.estado);
  const startDate = query.fechaDesde === undefined ? undefined : realDate(query.fechaDesde, 'fechaDesde');
  const endDate = query.fechaHasta === undefined ? undefined : realDate(query.fechaHasta, 'fechaHasta');
  if (startDate && endDate && startDate > endDate) {
    throw new HttpError(422, 'VALIDATION_ERROR', "'fechaDesde' no puede ser posterior a 'fechaHasta'.");
  }
  return {
    page,
    limit,
    clientId: query.clienteId === undefined ? undefined : positiveInteger(query.clienteId, 'clienteId'),
    status,
    startDate,
    endDate,
  };
}

export function validateCreateSale(body = {}) {
  return {
    clientId: positiveInteger(body.clienteId, 'clienteId'),
    saleDate: dateTime(body.fechaVenta, true),
    status: state(body.estado) ?? 'CONFIRMADA',
    details: details(body.detalles),
  };
}

export function validateReplaceSale(body = {}) {
  return {
    clientId: positiveInteger(body.clienteId, 'clienteId'),
    saleDate: dateTime(body.fechaVenta, true),
    status: state(body.estado, true),
    details: details(body.detalles),
  };
}

export function validatePatchSale(body = {}) {
  const payload = {};
  if (body.clienteId !== undefined) payload.clientId = positiveInteger(body.clienteId, 'clienteId');
  if (body.fechaVenta !== undefined) payload.saleDate = dateTime(body.fechaVenta, true);
  if (body.estado !== undefined) payload.status = state(body.estado, true);
  if (body.detalles !== undefined) payload.details = details(body.detalles);
  if (Object.keys(payload).length === 0) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'No se enviaron campos válidos para actualizar.');
  }
  return payload;
}
