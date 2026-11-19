import * as catalogRepository from '../repositories/catalogos.repository.js';

export function listClients(filters) {
  return catalogRepository.findClients(filters);
}

export function listProducts(filters) {
  return catalogRepository.findProducts(filters);
}
