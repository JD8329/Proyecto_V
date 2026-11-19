-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 06-11-2026 a las 13:09:31
-- Versión del servidor: 10.4.27-MariaDB
-- Versión de PHP: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `laboratorio_ventas`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_resumen_ventas` ()   BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    DELETE FROM resumen_ventas_diarias;

    INSERT INTO resumen_ventas_diarias
       (fecha, cantidad_ventas, unidades_vendidas,
        ingresos, ticket_promedio, ultima_actualizacion)
    SELECT
        DATE(v.fecha_venta) AS fecha,
        COUNT(DISTINCT v.id_venta) AS cantidad_ventas,
        SUM(d.cantidad) AS unidades_vendidas,
        SUM(d.cantidad * d.precio_unitario) AS ingresos,
        ROUND(
            SUM(d.cantidad * d.precio_unitario)
              / COUNT(DISTINCT v.id_venta), 2
        ) AS ticket_promedio,
        NOW() AS ultima_actualizacion
    FROM ventas AS v
    INNER JOIN detalle_venta AS d
        ON d.id_venta = v.id_venta
    WHERE v.estado = 'CONFIRMADA'
    GROUP BY DATE(v.fecha_venta);

    COMMIT;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id_cliente` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id_cliente`, `nombre`) VALUES
(1, 'Ana'),
(2, 'Luis'),
(3, 'María');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_venta`
--

CREATE TABLE `detalle_venta` (
  `id_detalle` int(11) NOT NULL,
  `id_venta` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL
) ;

--
-- Volcado de datos para la tabla `detalle_venta`
--

INSERT INTO `detalle_venta` (`id_detalle`, `id_venta`, `id_producto`, `cantidad`, `precio_unitario`) VALUES
(1, 1, 2, 2, '50.00'),
(2, 1, 1, 1, '100.00'),
(3, 2, 3, 1, '600.00'),
(4, 3, 4, 1, '200.00'),
(5, 3, 2, 1, '50.00'),
(6, 4, 3, 1, '600.00'),
(7, 5, 1, 3, '100.00'),
(8, 6, 2, 1, '50.00'),
(9, 6, 4, 1, '200.00'),
(10, 7, 3, 2, '600.00'),
(11, 8, 3, 2, '600.00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `precio_catalogo` decimal(12,2) NOT NULL
) ;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `nombre`, `precio_catalogo`) VALUES
(1, 'Teclado', '100.00'),
(2, 'Mouse', '50.00'),
(3, 'Monitor', '600.00'),
(4, 'Audífonos', '200.00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `resumen_ventas_diarias`
--

CREATE TABLE `resumen_ventas_diarias` (
  `fecha` date NOT NULL,
  `cantidad_ventas` int(11) NOT NULL,
  `unidades_vendidas` int(11) NOT NULL,
  `ingresos` decimal(14,2) NOT NULL,
  `ticket_promedio` decimal(14,2) NOT NULL,
  `ultima_actualizacion` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `resumen_ventas_diarias`
--

INSERT INTO `resumen_ventas_diarias` (`fecha`, `cantidad_ventas`, `unidades_vendidas`, `ingresos`, `ticket_promedio`, `ultima_actualizacion`) VALUES
('2026-10-28', 2, 4, '800.00', '400.00', '2026-11-02 15:16:59'),
('2026-10-29', 1, 2, '250.00', '250.00', '2026-11-02 15:16:59'),
('2026-11-01', 1, 3, '300.00', '300.00', '2026-11-02 15:16:59'),
('2026-11-02', 3, 6, '2650.00', '883.33', '2026-11-02 15:16:59');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id_venta` int(11) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `fecha_venta` datetime NOT NULL,
  `estado` enum('CONFIRMADA','ANULADA') NOT NULL DEFAULT 'CONFIRMADA',
  `fecha_modificacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id_venta`, `id_cliente`, `fecha_venta`, `estado`, `fecha_modificacion`) VALUES
(1, 1, '2026-10-28 10:15:00', 'CONFIRMADA', '2026-11-02 09:03:40'),
(2, 2, '2026-10-28 12:00:00', 'CONFIRMADA', '2026-11-02 09:03:40'),
(3, 3, '2026-10-29 08:15:00', 'CONFIRMADA', '2026-11-02 09:03:40'),
(4, 1, '2026-10-29 18:10:00', 'ANULADA', '2026-11-02 09:03:40'),
(5, 2, '2026-11-01 09:00:00', 'CONFIRMADA', '2026-11-02 09:03:40'),
(6, 3, '2026-11-02 07:20:00', 'CONFIRMADA', '2026-11-02 09:03:40'),
(7, 1, '2026-11-02 08:00:00', 'CONFIRMADA', '2026-11-02 09:03:40'),
(8, 2, '2026-11-02 15:11:20', 'CONFIRMADA', '2026-11-02 15:11:35');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id_cliente`);

--
-- Indices de la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_detalle_producto` (`id_producto`),
  ADD KEY `idx_detalle_venta` (`id_venta`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`);

--
-- Indices de la tabla `resumen_ventas_diarias`
--
ALTER TABLE `resumen_ventas_diarias`
  ADD PRIMARY KEY (`fecha`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id_venta`),
  ADD KEY `fk_venta_cliente` (`id_cliente`),
  ADD KEY `idx_ventas_estado_fecha` (`estado`,`fecha_venta`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id_cliente` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id_venta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `detalle_venta`
--
ALTER TABLE `detalle_venta`
  ADD CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_detalle_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`);

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_venta_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
