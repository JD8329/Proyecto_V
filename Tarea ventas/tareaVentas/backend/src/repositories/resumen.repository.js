import { pool } from '../config/database.js';

export async function refreshSummary() {
  await pool.query('CALL sp_actualizar_resumen_ventas()');
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS diasConsolidados,
            MAX(ultima_actualizacion) AS ultimaActualizacion
     FROM resumen_ventas_diarias`,
  );
  return {
    diasConsolidados: Number(rows[0].diasConsolidados),
    ultimaActualizacion: rows[0].ultimaActualizacion,
  };
}

export async function getSummaryStatus() {
  const [rows] = await pool.query(`
    WITH actual AS (
      SELECT DATE(v.fecha_venta) AS fecha,
             COUNT(DISTINCT v.id_venta) AS cantidad_ventas,
             SUM(d.cantidad) AS unidades_vendidas,
             SUM(d.cantidad * d.precio_unitario) AS ingresos,
             ROUND(
               SUM(d.cantidad * d.precio_unitario) / COUNT(DISTINCT v.id_venta),
               2
             ) AS ticket_promedio
      FROM ventas AS v
      INNER JOIN detalle_venta AS d ON d.id_venta = v.id_venta
      WHERE v.estado = 'CONFIRMADA'
      GROUP BY DATE(v.fecha_venta)
    )
    SELECT EXISTS (
      SELECT 1
      FROM actual AS a
      LEFT JOIN resumen_ventas_diarias AS r ON r.fecha = a.fecha
      WHERE r.fecha IS NULL
         OR r.cantidad_ventas <> a.cantidad_ventas
         OR r.unidades_vendidas <> a.unidades_vendidas
         OR r.ingresos <> a.ingresos
         OR r.ticket_promedio <> a.ticket_promedio
      UNION ALL
      SELECT 1
      FROM resumen_ventas_diarias AS r
      LEFT JOIN actual AS a ON a.fecha = r.fecha
      WHERE a.fecha IS NULL
    ) AS pendiente
  `);
  return { pendiente: Boolean(rows[0].pendiente) };
}

export async function findIndicators({ from, to }) {
  const [rows] = await pool.execute(
    `SELECT COALESCE(SUM(cantidad_ventas), 0) AS totalVentas,
            COALESCE(SUM(unidades_vendidas), 0) AS totalUnidades,
            COALESCE(SUM(ingresos), 0) AS ingresosTotal,
            CASE WHEN SUM(cantidad_ventas) > 0
              THEN ROUND(SUM(ingresos) / SUM(cantidad_ventas), 2)
              ELSE 0
            END AS ticketPromedio,
            MAX(ultima_actualizacion) AS ultimaActualizacion
     FROM resumen_ventas_diarias
     WHERE fecha BETWEEN ? AND ?`,
    [from, to],
  );
  const row = rows[0];
  return {
    totalVentas: Number(row.totalVentas),
    totalUnidades: Number(row.totalUnidades),
    ingresosTotal: Number(row.ingresosTotal),
    ticketPromedio: Number(row.ticketPromedio),
    ultimaActualizacion: row.ultimaActualizacion,
  };
}

export async function findDailySales({ from, to }) {
  const [rows] = await pool.execute(
    `SELECT fecha,
            cantidad_ventas AS cantidadVentas,
            unidades_vendidas AS unidadesVendidas,
            ingresos,
            ticket_promedio AS ticketPromedio,
            ultima_actualizacion AS ultimaActualizacion
     FROM resumen_ventas_diarias
     WHERE fecha BETWEEN ? AND ?
     ORDER BY fecha`,
    [from, to],
  );
  return rows.map((row) => ({
    ...row,
    cantidadVentas: Number(row.cantidadVentas),
    unidadesVendidas: Number(row.unidadesVendidas),
    ingresos: Number(row.ingresos),
    ticketPromedio: Number(row.ticketPromedio),
  }));
}
