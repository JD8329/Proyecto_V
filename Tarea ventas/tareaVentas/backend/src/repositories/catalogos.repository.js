import { pool } from '../config/database.js';

export async function findClients({ search }) {
  const conditions = [];
  const parameters = [];
  if (search) {
    conditions.push('nombre LIKE ?');
    parameters.push(`%${search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT id_cliente AS id, nombre FROM clientes ${where} ORDER BY nombre, id_cliente`,
    parameters,
  );
  return rows;
}

export async function findProducts({ search }) {
  const conditions = [];
  const parameters = [];
  if (search) {
    conditions.push('nombre LIKE ?');
    parameters.push(`%${search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT id_producto AS id, nombre, precio_catalogo AS precioCatalogo
     FROM productos ${where} ORDER BY nombre, id_producto`,
    parameters,
  );
  return rows.map((row) => ({ ...row, precioCatalogo: Number(row.precioCatalogo) }));
}

export async function clientExists(id, executor = pool) {
  const [rows] = await executor.execute('SELECT 1 FROM clientes WHERE id_cliente = ? LIMIT 1', [id]);
  return rows.length > 0;
}

export async function findProductsByIds(ids, executor = pool) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await executor.execute(
    `SELECT id_producto AS id, nombre, precio_catalogo AS precioCatalogo
     FROM productos WHERE id_producto IN (${placeholders})`,
    ids,
  );
  return rows.map((row) => ({ ...row, precioCatalogo: Number(row.precioCatalogo) }));
}
