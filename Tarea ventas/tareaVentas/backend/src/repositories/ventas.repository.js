import { pool, withTransaction } from '../config/database.js';

function mapSale(row) {
  if (!row) return null;
  const sale = {
    id: row.id,
    clienteId: row.clienteId,
    fechaVenta: row.fechaVenta,
    estado: row.estado,
    fechaModificacion: row.fechaModificacion,
    cliente: { id: row.clienteId, nombre: row.clienteNombre },
  };
  if (row.total !== undefined) sale.total = Number(row.total);
  return sale;
}

function mapDetail(row) {
  return {
    id: row.id,
    productoId: row.productoId,
    producto: row.productoNombre,
    cantidad: Number(row.cantidad),
    precioUnitario: Number(row.precioUnitario),
    subtotal: Number(row.subtotal),
  };
}

const baseSelect = `SELECT v.id_venta AS id,
                           v.id_cliente AS clienteId,
                           v.fecha_venta AS fechaVenta,
                           v.estado,
                           v.fecha_modificacion AS fechaModificacion,
                           c.nombre AS clienteNombre
                    FROM ventas AS v
                    INNER JOIN clientes AS c ON c.id_cliente = v.id_cliente`;

async function findByIdUsing(executor, id) {
  const [sales] = await executor.execute(`${baseSelect} WHERE v.id_venta = ? LIMIT 1`, [id]);
  const sale = mapSale(sales[0]);
  if (!sale) return null;

  const [details] = await executor.execute(
    `SELECT d.id_detalle AS id,
            d.id_producto AS productoId,
            p.nombre AS productoNombre,
            d.cantidad,
            d.precio_unitario AS precioUnitario,
            d.cantidad * d.precio_unitario AS subtotal
     FROM detalle_venta AS d
     INNER JOIN productos AS p ON p.id_producto = d.id_producto
     WHERE d.id_venta = ?
     ORDER BY d.id_detalle`,
    [id],
  );
  sale.detalles = details.map(mapDetail);
  sale.total = sale.detalles.reduce((sum, detail) => sum + detail.subtotal, 0);
  return sale;
}

async function insertDetails(connection, saleId, details) {
  for (const detail of details) {
    await connection.execute(
      `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
       VALUES (?, ?, ?, ?)`,
      [saleId, detail.productId, detail.quantity, detail.unitPrice],
    );
  }
}

export async function findAll(filters) {
  const conditions = [];
  const parameters = [];
  if (filters.clientId !== undefined) {
    conditions.push('v.id_cliente = ?');
    parameters.push(filters.clientId);
  }
  if (filters.status) {
    conditions.push('v.estado = ?');
    parameters.push(filters.status);
  }
  if (filters.startDate) {
    conditions.push('DATE(v.fecha_venta) >= ?');
    parameters.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('DATE(v.fecha_venta) <= ?');
    parameters.push(filters.endDate);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM ventas AS v ${where}`,
    parameters,
  );
  const offset = (filters.page - 1) * filters.limit;
  const [rows] = await pool.execute(
    `SELECT v.id_venta AS id,
            v.id_cliente AS clienteId,
            v.fecha_venta AS fechaVenta,
            v.estado,
            v.fecha_modificacion AS fechaModificacion,
            c.nombre AS clienteNombre,
            COALESCE(SUM(d.cantidad * d.precio_unitario), 0) AS total
     FROM ventas AS v
     INNER JOIN clientes AS c ON c.id_cliente = v.id_cliente
     LEFT JOIN detalle_venta AS d ON d.id_venta = v.id_venta
     ${where}
     GROUP BY v.id_venta, v.id_cliente, v.fecha_venta, v.estado,
              v.fecha_modificacion, c.nombre
     ORDER BY v.fecha_venta DESC, v.id_venta DESC
     LIMIT ? OFFSET ?`,
    [...parameters, filters.limit, offset],
  );
  return { sales: rows.map(mapSale), total: Number(countRows[0].total) };
}

export async function findById(id) {
  return findByIdUsing(pool, id);
}

export async function create(sale) {
  return withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO ventas (id_cliente, fecha_venta, estado)
       VALUES (?, ?, ?)`,
      [sale.clientId, sale.saleDate, sale.status],
    );
    await insertDetails(connection, result.insertId, sale.details);
    return findByIdUsing(connection, result.insertId);
  });
}

export async function replace(id, sale) {
  return withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `UPDATE ventas
       SET id_cliente = ?, fecha_venta = ?, estado = ?
       WHERE id_venta = ?`,
      [sale.clientId, sale.saleDate, sale.status, id],
    );
    if (result.affectedRows === 0) return null;

    await connection.execute('DELETE FROM detalle_venta WHERE id_venta = ?', [id]);
    await insertDetails(connection, id, sale.details);
    return findByIdUsing(connection, id);
  });
}

export async function patch(id, changes) {
  return withTransaction(async (connection) => {
    const [existingRows] = await connection.execute(
      'SELECT 1 FROM ventas WHERE id_venta = ? FOR UPDATE',
      [id],
    );
    if (existingRows.length === 0) return null;

    const fields = [];
    const parameters = [];
    const columnMap = {
      clientId: 'id_cliente',
      saleDate: 'fecha_venta',
      status: 'estado',
    };
    for (const [key, column] of Object.entries(columnMap)) {
      if (changes[key] !== undefined) {
        fields.push(`${column} = ?`);
        parameters.push(changes[key]);
      }
    }
    if (fields.length > 0) {
      parameters.push(id);
      await connection.execute(
        `UPDATE ventas SET ${fields.join(', ')} WHERE id_venta = ?`,
        parameters,
      );
    }
    if (changes.details !== undefined) {
      await connection.execute('DELETE FROM detalle_venta WHERE id_venta = ?', [id]);
      await insertDetails(connection, id, changes.details);
    }
    return findByIdUsing(connection, id);
  });
}

export async function annul(id) {
  const [result] = await pool.execute(
    `UPDATE ventas SET estado = 'ANULADA' WHERE id_venta = ?`,
    [id],
  );
  if (result.affectedRows === 0) return null;
  return findById(id);
}
