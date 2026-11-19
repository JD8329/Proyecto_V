USE laboratorio_ventas;

DROP PROCEDURE IF EXISTS sp_actualizar_resumen_ventas;

DELIMITER $$
CREATE PROCEDURE sp_actualizar_resumen_ventas()
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  DELETE FROM resumen_ventas_diarias;

  INSERT INTO resumen_ventas_diarias
    (fecha, cantidad_ventas, unidades_vendidas, ingresos,
     ticket_promedio, ultima_actualizacion)
  SELECT
    DATE(v.fecha_venta),
    COUNT(DISTINCT v.id_venta),
    SUM(d.cantidad),
    SUM(d.cantidad * d.precio_unitario),
    ROUND(SUM(d.cantidad * d.precio_unitario) / COUNT(DISTINCT v.id_venta), 2),
    NOW()
  FROM ventas AS v
  INNER JOIN detalle_venta AS d ON d.id_venta = v.id_venta
  WHERE v.estado = 'CONFIRMADA'
  GROUP BY DATE(v.fecha_venta);

  COMMIT;
END$$
DELIMITER ;

SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS ev_actualizar_resumen_ventas;
CREATE EVENT ev_actualizar_resumen_ventas
ON SCHEDULE EVERY 5 MINUTE
STARTS CURRENT_TIMESTAMP
DO CALL sp_actualizar_resumen_ventas();

CALL sp_actualizar_resumen_ventas();

-- Verificaciones
SHOW VARIABLES LIKE 'event_scheduler';
SHOW EVENTS FROM laboratorio_ventas;
SELECT * FROM resumen_ventas_diarias ORDER BY fecha;

-- Consulta independiente de control
SELECT DATE(v.fecha_venta) AS fecha,
       COUNT(DISTINCT v.id_venta) AS ventas_control,
       SUM(d.cantidad) AS unidades_control,
       SUM(d.cantidad * d.precio_unitario) AS ingresos_control
FROM ventas AS v
INNER JOIN detalle_venta AS d ON d.id_venta = v.id_venta
WHERE v.estado = 'CONFIRMADA'
GROUP BY DATE(v.fecha_venta)
ORDER BY fecha;
