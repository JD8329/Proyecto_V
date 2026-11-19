import * as summaryService from '../services/resumen.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { validateDateRange } from '../validators/resumen.validator.js';

export async function refreshSummary(_request, response, next) {
  try {
    return sendSuccess(response, await summaryService.refreshSummary());
  } catch (error) {
    return next(error);
  }
}

export async function getSummaryStatus(_request, response, next) {
  try {
    return sendSuccess(response, await summaryService.getSummaryStatus());
  } catch (error) {
    return next(error);
  }
}

export async function getIndicators(request, response, next) {
  try {
    return sendSuccess(response, await summaryService.getIndicators(validateDateRange(request.query)));
  } catch (error) {
    return next(error);
  }
}

export async function getDailySales(request, response, next) {
  try {
    return sendSuccess(response, await summaryService.getDailySales(validateDateRange(request.query)));
  } catch (error) {
    return next(error);
  }
}
