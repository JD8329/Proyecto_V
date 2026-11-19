import * as summaryRepository from '../repositories/resumen.repository.js';

export function refreshSummary() {
  return summaryRepository.refreshSummary();
}

export function getSummaryStatus() {
  return summaryRepository.getSummaryStatus();
}

export function getIndicators(range) {
  return summaryRepository.findIndicators(range);
}

export function getDailySales(range) {
  return summaryRepository.findDailySales(range);
}
