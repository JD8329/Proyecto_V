import assert from 'node:assert/strict';
import test from 'node:test';

import { validateDateRange } from '../src/validators/resumen.validator.js';
import {
  validateCreateSale,
  validatePatchSale,
  validateSaleListQuery,
} from '../src/validators/ventas.validator.js';

test('valida una venta completa y normaliza sus valores', () => {
  const sale = validateCreateSale({
    clienteId: '2',
    fechaVenta: '2026-11-02 10:30:00',
    detalles: [{ productoId: '3', cantidad: '2', precioUnitario: '600.00' }],
  });
  assert.equal(sale.clientId, 2);
  assert.equal(sale.status, 'CONFIRMADA');
  assert.deepEqual(sale.details[0], { productId: 3, quantity: 2, unitPrice: 600 });
});

test('rechaza ventas sin detalles', () => {
  assert.throws(
    () => validateCreateSale({ clienteId: 1, fechaVenta: '2026-11-02', detalles: [] }),
    /al menos un detalle/,
  );
});

test('rechaza productos repetidos', () => {
  assert.throws(
    () => validateCreateSale({
      clienteId: 1,
      fechaVenta: '2026-11-02',
      detalles: [
        { productoId: 1, cantidad: 1 },
        { productoId: 1, cantidad: 2 },
      ],
    }),
    /repetido/,
  );
});

test('valida actualización parcial', () => {
  assert.deepEqual(validatePatchSale({ estado: 'anulada' }), { status: 'ANULADA' });
  assert.throws(() => validatePatchSale({}), /No se enviaron campos/);
});

test('valida filtros y rango de fechas', () => {
  const filters = validateSaleListQuery({ page: '2', limit: '10', estado: 'confirmada' });
  assert.equal(filters.page, 2);
  assert.equal(filters.status, 'CONFIRMADA');
  assert.deepEqual(validateDateRange({ desde: '2026-10-01', hasta: '2026-11-02' }), {
    from: '2026-10-01',
    to: '2026-11-02',
  });
  assert.throws(
    () => validateDateRange({ desde: '2026-11-03', hasta: '2026-11-02' }),
    /posterior/,
  );
});
