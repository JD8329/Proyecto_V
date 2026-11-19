import * as salesService from '../services/ventas.service.js';
import { sendSuccess } from '../utils/api-response.js';
import {
  validateCreateSale,
  validatePatchSale,
  validateReplaceSale,
  validateSaleId,
  validateSaleListQuery,
} from '../validators/ventas.validator.js';

export async function listSales(request, response, next) {
  try {
    const result = await salesService.listSales(validateSaleListQuery(request.query));
    return sendSuccess(response, result.data, 200, result.meta);
  } catch (error) {
    return next(error);
  }
}

export async function getSale(request, response, next) {
  try {
    return sendSuccess(response, await salesService.getSale(validateSaleId(request.params.id)));
  } catch (error) {
    return next(error);
  }
}

export async function createSale(request, response, next) {
  try {
    const sale = await salesService.createSale(validateCreateSale(request.body));
    return sendSuccess(response, sale, 201);
  } catch (error) {
    return next(error);
  }
}

export async function replaceSale(request, response, next) {
  try {
    const sale = await salesService.replaceSale(
      validateSaleId(request.params.id),
      validateReplaceSale(request.body),
    );
    return sendSuccess(response, sale);
  } catch (error) {
    return next(error);
  }
}

export async function updateSale(request, response, next) {
  try {
    const sale = await salesService.updateSale(
      validateSaleId(request.params.id),
      validatePatchSale(request.body),
    );
    return sendSuccess(response, sale);
  } catch (error) {
    return next(error);
  }
}

export async function annulSale(request, response, next) {
  try {
    const sale = await salesService.annulSale(validateSaleId(request.params.id));
    return sendSuccess(response, sale);
  } catch (error) {
    return next(error);
  }
}
