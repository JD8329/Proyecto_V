import * as catalogRepository from '../repositories/catalogos.repository.js';
import * as salesRepository from '../repositories/ventas.repository.js';
import { HttpError } from '../utils/http-error.js';

async function prepareSale(sale) {
  if (sale.clientId !== undefined && !(await catalogRepository.clientExists(sale.clientId))) {
    throw new HttpError(422, 'CLIENT_NOT_FOUND', 'El cliente indicado no existe.');
  }
  if (sale.details === undefined) return sale;

  const products = await catalogRepository.findProductsByIds(
    sale.details.map((detail) => detail.productId),
  );
  const productsById = new Map(products.map((product) => [product.id, product]));
  const missingIds = sale.details
    .map((detail) => detail.productId)
    .filter((id) => !productsById.has(id));
  if (missingIds.length > 0) {
    throw new HttpError(422, 'PRODUCT_NOT_FOUND', `No existen los productos: ${missingIds.join(', ')}.`);
  }

  return {
    ...sale,
    details: sale.details.map((detail) => ({
      ...detail,
      unitPrice: detail.unitPrice ?? productsById.get(detail.productId).precioCatalogo,
    })),
  };
}

export async function listSales(filters) {
  const { sales, total } = await salesRepository.findAll(filters);
  return {
    data: sales,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getSale(id) {
  const sale = await salesRepository.findById(id);
  if (!sale) throw new HttpError(404, 'SALE_NOT_FOUND', 'La venta no fue encontrada.');
  return sale;
}

export async function createSale(sale) {
  return salesRepository.create(await prepareSale(sale));
}

export async function replaceSale(id, sale) {
  const updated = await salesRepository.replace(id, await prepareSale(sale));
  if (!updated) throw new HttpError(404, 'SALE_NOT_FOUND', 'La venta no fue encontrada.');
  return updated;
}

export async function updateSale(id, changes) {
  const updated = await salesRepository.patch(id, await prepareSale(changes));
  if (!updated) throw new HttpError(404, 'SALE_NOT_FOUND', 'La venta no fue encontrada.');
  return updated;
}

export async function annulSale(id) {
  const updated = await salesRepository.annul(id);
  if (!updated) throw new HttpError(404, 'SALE_NOT_FOUND', 'La venta no fue encontrada.');
  return updated;
}
