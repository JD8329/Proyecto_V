import * as catalogService from '../services/catalogos.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { validateSearchQuery } from '../validators/common.validator.js';

export async function listClients(request, response, next) {
  try {
    return sendSuccess(response, await catalogService.listClients(validateSearchQuery(request.query)));
  } catch (error) {
    return next(error);
  }
}

export async function listProducts(request, response, next) {
  try {
    return sendSuccess(response, await catalogService.listProducts(validateSearchQuery(request.query)));
  } catch (error) {
    return next(error);
  }
}
