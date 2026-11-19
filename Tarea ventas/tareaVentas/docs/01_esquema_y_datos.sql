-- Entregable RF-01: esquema y datos demostrativos
-- Compatible con MariaDB 10.4/MySQL 8.x

CREATE DATABASE IF NOT EXISTS laboratorio_ventas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE laboratorio_ventas;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS detalle_venta;
DROP TABLE IF EXISTS resumen_ventas_diarias;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS clientes;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE clientes (
  id_cliente INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE productos (
  id_producto INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  precio_catalogo DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id_producto),
  CONSTRAINT ck_precio_catalogo CHECK (precio_catalogo >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ventas (
  id_venta INT NOT NULL AUTO_INCREMENT,
  id_cliente INT NOT NULL,
  fecha_venta DATETIME NOT NULL,
  estado ENUM('CONFIRMADA','ANULADA') NOT NULL DEFAULT 'CONFIRMADA',
  fecha_modificacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_venta),
  KEY idx_ventas_estado_fecha (estado, fecha_venta),
  CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE detalle_venta (
  id_detalle INT NOT NULL AUTO_INCREMENT,
  id_venta INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id_detalle),
  KEY idx_detalle_venta (id_venta),
  KEY fk_detalle_producto (id_producto),
  CONSTRAINT ck_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_precio_venta CHECK (precio_unitario >= 0),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas (id_venta) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE resumen_ventas_diarias (
  fecha DATE NOT NULL,
  cantidad_ventas INT NOT NULL,
  unidades_vendidas INT NOT NULL,
  ingresos DECIMAL(14,2) NOT NULL,
  ticket_promedio DECIMAL(14,2) NOT NULL,
  ultima_actualizacion DATETIME NOT NULL,
  PRIMARY KEY (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO clientes (id_cliente, nombre) VALUES
(1,'Ana'), (2,'Luis'), (3,'María'), (4,'Carlos'), (5,'Laura');

INSERT INTO productos (id_producto, nombre, precio_catalogo) VALUES
(1,'Teclado',100.00), (2,'Mouse',50.00),
(3,'Monitor',600.00), (4,'Audífonos',200.00),
(5,'Webcam',180.00);

-- 30 ventas distribuidas en seis días; los identificadores pares también incluyen anuladas.
INSERT INTO ventas (id_venta, id_cliente, fecha_venta, estado) VALUES
(1,1,'2026-10-28 09:10:00','CONFIRMADA'), (2,2,'2026-10-28 10:20:00','CONFIRMADA'),
(3,3,'2026-10-28 15:40:00','ANULADA'),    (4,4,'2026-10-29 08:30:00','CONFIRMADA'),
(5,5,'2026-10-29 11:15:00','CONFIRMADA'), (6,1,'2026-10-29 18:05:00','ANULADA'),
(7,2,'2026-10-30 09:00:00','CONFIRMADA'), (8,3,'2026-10-30 12:30:00','CONFIRMADA'),
(9,4,'2026-10-30 16:45:00','CONFIRMADA'), (10,5,'2026-10-31 08:20:00','ANULADA'),
(11,1,'2026-10-31 10:10:00','CONFIRMADA'),(12,2,'2026-10-31 14:35:00','CONFIRMADA'),
(13,3,'2026-11-01 09:25:00','CONFIRMADA'),(14,4,'2026-11-01 13:00:00','ANULADA'),
(15,5,'2026-11-01 17:20:00','CONFIRMADA'),(16,1,'2026-11-02 08:05:00','CONFIRMADA'),
(17,2,'2026-11-02 09:15:00','CONFIRMADA'),(18,3,'2026-11-02 10:40:00','CONFIRMADA'),
(19,4,'2026-11-02 12:25:00','ANULADA'),   (20,5,'2026-11-02 15:10:00','CONFIRMADA'),
(21,1,'2026-11-03 08:45:00','CONFIRMADA'),(22,2,'2026-11-03 10:50:00','CONFIRMADA'),
(23,3,'2026-11-03 13:35:00','CONFIRMADA'),(24,4,'2026-11-03 16:10:00','ANULADA'),
(25,5,'2026-11-04 09:05:00','CONFIRMADA'),(26,1,'2026-11-04 11:30:00','CONFIRMADA'),
(27,2,'2026-11-04 14:15:00','CONFIRMADA'),(28,3,'2026-11-04 16:50:00','ANULADA'),
(29,4,'2026-11-05 09:40:00','CONFIRMADA'),(30,5,'2026-11-05 12:20:00','CONFIRMADA');

INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES
(1,2,2,50),(1,1,1,100),(2,3,1,600),(3,4,1,200),(4,1,3,100),
(5,2,2,50),(5,5,1,180),(6,3,1,600),(7,4,2,200),(8,2,4,50),
(9,3,1,600),(9,1,1,100),(10,5,1,180),(11,1,2,100),(12,4,1,200),
(13,3,1,600),(13,2,2,50),(14,1,1,100),(15,5,2,180),(16,2,3,50),
(17,4,1,200),(18,3,2,600),(18,1,1,100),(19,5,1,180),(20,2,5,50),
(21,1,2,100),(22,3,1,600),(23,4,2,200),(23,2,1,50),(24,5,2,180),
(25,1,1,100),(25,2,2,50),(26,3,1,600),(27,4,1,200),(27,5,1,180),
(28,2,3,50),(29,3,1,600),(29,1,1,100),(30,5,2,180),(30,2,2,50);

-- Consultas de verificación de carga
SELECT COUNT(*) AS ventas_cargadas FROM ventas;
SELECT estado, COUNT(*) AS cantidad FROM ventas GROUP BY estado;
SELECT COUNT(*) AS ventas_con_detalle
FROM (SELECT DISTINCT id_venta FROM detalle_venta) AS ventas_detalle;
