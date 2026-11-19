# Guía explicativa detallada: ventas, consolidación y dashboard con MySQL

**Documento de apoyo para docentes y estudiantes de quinto semestre**
**Complementa:** `01_Ejercicio_academico_MySQL_dashboard.md`
**Alcance:** desarrollo explicado de una solución con un solo motor de datos (MySQL), procesamiento periódico, endpoints de consulta y dashboard.

## 1. ¿Qué se quiere aprender realmente?

El propósito no es sustituir SQL por NoSQL. El propósito es construir y **entender** el recorrido de los datos desde el momento de una compra hasta su presentación como indicadores administrativos.

Una operación de venta necesita registrar datos correctos, preservar relaciones y permitir auditoría. Un dashboard, en cambio, necesita responder preguntas como: «¿cuánto vendimos?», «¿cuántas órdenes se realizaron?» o «¿cómo evolucionaron las ventas por día?». Estas preguntas pueden resolverse con SQL, pero no es obligatorio repetir su cálculo sobre las tablas operativas cada vez que alguien abre una gráfica.

En este ejercicio se crea una **tabla de resumen persistente** y se actualiza con un procedimiento almacenado. La API solo consulta esa tabla y la interfaz muestra el resultado.

La actualización se hará **cada cinco minutos**. Por lo tanto, el dashboard no presenta necesariamente la venta que acaba de registrarse: existe un **desfase temporal intencional** entre la operación y el reporte. Esa decisión debe explicarse y evaluarse, no ocultarse.

### 1.1. Separación lógica, no necesariamente física

Todo vive en MySQL, pero existen distintas funciones:

| Capa               | Responsabilidad                              | Tablas o componentes                                        |
| ------------------ | -------------------------------------------- | ----------------------------------------------------------- |
| Operativa          | Guardar compras, clientes y productos.       | `clientes`, `productos`, `ventas`, `detalle_venta`. |
| Consolidación     | Calcular indicadores estables para consulta. | `sp_actualizar_resumen_ventas()` y evento.                |
| Lectura analítica | Servir indicadores de forma sencilla.        | `resumen_ventas_diarias`.                                 |
| Servicios          | Validar parámetros y entregar JSON.         | API REST.                                                   |
| Presentación      | Mostrar KPIs, tendencia y fecha de corte.    | Dashboard web.                                              |

> **Precisión técnica:** esta práctica no implementa por sí sola una arquitectura CQRS completa, ni un ETL entre motores distintos. Implementa una **proyección de lectura** dentro de MySQL, alimentada por una tarea periódica de consolidación.

## 2. Requisitos de ejecución y organización del proyecto

- MySQL 8.x con permisos para crear tablas y procedimientos. Para la automatización, también se requieren permisos para crear eventos y que el servidor tenga habilitado `event_scheduler`.
- MySQL Workbench o un cliente SQL equivalente.
- Node.js y npm para el ejemplo de backend (los estudiantes pueden escoger otro lenguaje si respetan el contrato REST).
- Navegador web. La interfaz de ejemplo utiliza HTML/JavaScript; no necesita una plataforma frontend compleja.

Propuesta de carpetas:

```text
laboratorio-ventas/
  sql/
    01_esquema_y_datos.sql
    02_procedimiento_y_evento.sql
  backend/
    server.js
    .env               # local, NO versionar
    .env.example       # sí se puede entregar
    public/
      index.html
  evidencias/
    pruebas.md
```

## 3. Diseñar el modelo de datos

### 3.1. Tablas transaccionales

Se emplean cuatro tablas:

- `clientes`: identifica a quien compra.
- `productos`: catálogo de artículos.
- `ventas`: cabecera de cada compra, con fecha y estado.
- `detalle_venta`: líneas de producto vendidas, cantidad y **precio histórico de la venta**.

La relación principal es:

```text
clientes (1) ----- (N) ventas (1) ----- (N) detalle_venta
                                              (N)
                                               |
                                              (1)
                                           productos
```

**¿Por qué guardar `precio_unitario` en `detalle_venta` si el producto ya tiene precio?** Porque el precio del catálogo podría cambiar mañana y eso no debe alterar el valor histórico de una compra ya registrada.

### 3.2. Tabla de indicadores

`resumen_ventas_diarias` tendrá **una fila por fecha con ventas confirmadas**. Una fila contiene:

- `cantidad_ventas`: número de ventas distintas confirmadas, no número de líneas de detalle.
- `unidades_vendidas`: suma de cantidades de los detalles.
- `ingresos`: suma de `cantidad × precio_unitario` de los detalles.
- `ticket_promedio`: `ingresos / cantidad_ventas`.
- `ultima_actualizacion`: momento en que se recalculó el resumen.

En esta práctica se excluyen las ventas anuladas y no se incluyen impuestos, descuentos ni devoluciones parciales. Introducir esos elementos exigiría ajustar las reglas de negocio.

## 4. Crear la base de datos y cargar un conjunto demostrativo

Ejecutar desde MySQL Workbench o un cliente equivalente. Los scripts suponen una **base de laboratorio nueva**; no ejecutarlos sobre datos reales. El primer bloque crea tablas y carga **7 ventas didácticas**. Para cumplir la actividad evaluable deben ampliarse a **al menos 30**.

```sql
CREATE DATABASE IF NOT EXISTS laboratorio_ventas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE laboratorio_ventas;

CREATE TABLE clientes (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE productos (
    id_producto INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    precio_catalogo DECIMAL(12,2) NOT NULL,
    CONSTRAINT ck_precio_catalogo CHECK (precio_catalogo >= 0)
) ENGINE=InnoDB;

CREATE TABLE ventas (
    id_venta INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente INT NOT NULL,
    fecha_venta DATETIME NOT NULL,
    estado ENUM('CONFIRMADA', 'ANULADA') NOT NULL DEFAULT 'CONFIRMADA',
    fecha_modificacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente),
    INDEX idx_ventas_estado_fecha (estado, fecha_venta)
) ENGINE=InnoDB;

CREATE TABLE detalle_venta (
    id_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    CONSTRAINT ck_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_precio_venta CHECK (precio_unitario >= 0),
    CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta)
        REFERENCES ventas(id_venta),
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto),
    INDEX idx_detalle_venta (id_venta)
) ENGINE=InnoDB;

CREATE TABLE resumen_ventas_diarias (
    fecha DATE PRIMARY KEY,
    cantidad_ventas INT NOT NULL,
    unidades_vendidas INT NOT NULL,
    ingresos DECIMAL(14,2) NOT NULL,
    ticket_promedio DECIMAL(14,2) NOT NULL,
    ultima_actualizacion DATETIME NOT NULL
) ENGINE=InnoDB;

INSERT INTO clientes (id_cliente, nombre) VALUES
(1, 'Ana'), (2, 'Luis'), (3, 'María');

INSERT INTO productos (id_producto, nombre, precio_catalogo) VALUES
(1, 'Teclado', 100.00),
(2, 'Mouse', 50.00),
(3, 'Monitor', 600.00),
(4, 'Audífonos', 200.00);

INSERT INTO ventas (id_venta, id_cliente, fecha_venta, estado) VALUES
(1, 1, '2026-10-28 10:15:00', 'CONFIRMADA'),
(2, 2, '2026-10-28 12:00:00', 'CONFIRMADA'),
(3, 3, '2026-10-29 08:15:00', 'CONFIRMADA'),
(4, 1, '2026-10-29 18:10:00', 'ANULADA'),
(5, 2, '2026-11-01 09:00:00', 'CONFIRMADA'),
(6, 3, '2026-11-02 07:20:00', 'CONFIRMADA'),
(7, 1, '2026-11-02 08:00:00', 'CONFIRMADA');

INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES
(1, 2, 2, 50.00), (1, 1, 1, 100.00),
(2, 3, 1, 600.00),
(3, 4, 1, 200.00), (3, 2, 1, 50.00),
(4, 3, 1, 600.00),
(5, 1, 3, 100.00),
(6, 2, 1, 50.00), (6, 4, 1, 200.00),
(7, 3, 2, 600.00);
```

**Nota sobre registros:** en un sistema productivo la venta y sus detalles se insertarían dentro de una misma transacción, para evitar cabeceras sin líneas. En este laboratorio se cargan manualmente para facilitar la observación del proceso.

## 5. Crear el procedimiento almacenado de consolidación

La estrategia inicial será el **recálculo completo** del resumen. Es deliberadamente sencilla: elimina el resumen anterior y lo vuelve a generar a partir del estado vigente de las ventas. Por eso una anulación o una corrección de un precio queda reflejada al ejecutar nuevamente el procedimiento.

```sql
USE laboratorio_ventas;

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

CALL sp_actualizar_resumen_ventas();
SELECT * FROM resumen_ventas_diarias ORDER BY fecha;
```

### 5.1. ¿Qué hace cada parte?

1. `START TRANSACTION`: agrupa la sustitución del resumen en una transacción de InnoDB.
2. `DELETE`: retira los indicadores anteriores; en un entorno pequeño permite recalcular desde cero.
3. `JOIN`: relaciona cada venta con sus detalles.
4. `WHERE v.estado = 'CONFIRMADA'`: excluye anulaciones.
5. `COUNT(DISTINCT v.id_venta)`: evita contar dos veces una venta con dos o más productos.
6. `SUM(d.cantidad)`: calcula unidades.
7. `SUM(d.cantidad * d.precio_unitario)`: calcula ingresos con precios históricos.
8. `GROUP BY DATE(v.fecha_venta)`: genera una fila por día.
9. `NOW()`: informa cuándo se produjo la consolidación.
10. `COMMIT`: confirma la sustitución; el manejador revierte cambios ante errores SQL.

**Importante:** recalcular todo funciona bien para un laboratorio. Cuando los datos crecen, un `DELETE + INSERT` completo cada cinco minutos puede consumir recursos y competir con las transacciones. Esa limitación será parte del análisis final.

### 5.2. Resultado esperado con los 7 registros de ejemplo

| Fecha                          | Ventas confirmadas |     Unidades |          Ingresos |  Ticket promedio |
| ------------------------------ | -----------------: | -----------: | ----------------: | ---------------: |
| 2026-10-28                     |                  2 |            4 |            800.00 |           400.00 |
| 2026-10-29                     |                  1 |            2 |            250.00 |           250.00 |
| 2026-11-01                     |                  1 |            3 |            300.00 |           300.00 |
| 2026-11-02                     |                  2 |            4 |           1450.00 |           725.00 |
| **Totales del período** |        **6** | **13** | **2800.00** | **466.67** |

**Aclaración:** el ticket promedio total del período es **2800 / 6 = 466.67**, no el promedio simple de los cuatro tickets diarios. Los promedios deben ponderarse por la cantidad de ventas.

### 5.3. Consulta de control independiente

Antes de construir la API, comprobar el resultado directamente contra la fuente:

```sql
SELECT
    DATE(v.fecha_venta) AS fecha,
    COUNT(DISTINCT v.id_venta) AS cantidad_ventas,
    SUM(d.cantidad) AS unidades,
    SUM(d.cantidad * d.precio_unitario) AS ingresos
FROM ventas v
JOIN detalle_venta d ON d.id_venta = v.id_venta
WHERE v.estado = 'CONFIRMADA'
GROUP BY DATE(v.fecha_venta)
ORDER BY fecha;
```

Esta consulta **es una herramienta del desarrollador para verificar** los resultados; **no debe utilizarse en los endpoints del dashboard**.

## 6. Programar actualización automática cada cinco minutos

MySQL incluye el **Event Scheduler**, que ejecuta instrucciones a intervalos definidos. Es distinto de un disparador (*trigger*): el evento se activa por horario; el trigger lo haría ante una modificación de una tabla.

Primero, revisar el estado del programador:

```sql
SHOW VARIABLES LIKE 'event_scheduler';
```

Si está desactivado y se cuenta con permisos de administración:

```sql
SET GLOBAL event_scheduler = 1;
```

Para entornos donde el parámetro se gestiona centralmente, solicitar su habilitación al administrador. Puede ser necesario configurarlo de forma persistente en la configuración del servidor después de reiniciar; el cambio de sesión no equivale siempre a una configuración permanente.

Crear el evento:

```sql
USE laboratorio_ventas;

CREATE EVENT ev_actualizar_resumen_ventas
ON SCHEDULE EVERY 5 MINUTE
STARTS CURRENT_TIMESTAMP + INTERVAL 5 MINUTE
DO CALL sp_actualizar_resumen_ventas();

SHOW EVENTS FROM laboratorio_ventas;
```

**Secuencia observable:**

1. Ejecutar `CALL sp_actualizar_resumen_ventas()` para crear un primer resumen inmediatamente.
2. Registrar una nueva venta o anular una existente.
3. Consultar la tabla resumen **antes** de la siguiente ejecución: sus indicadores permanecen iguales.
4. Esperar el ciclo programado (o ejecutar manualmente el procedimiento para una demostración rápida).
5. Volver a consultar el resumen: se incorporan los cambios y cambia `ultima_actualizacion`.

Un evento puede no ejecutarse si `event_scheduler` está desactivado, el usuario no tiene permisos adecuados o el servidor está detenido. En producción también podría emplearse un planificador externo, pero **no es necesario** para cumplir el laboratorio.

## 7. Exponer la tabla resumen mediante una API REST

### 7.1. Contrato de servicios

La API ofrece **dos endpoints**. Ambos reciben fechas inclusivas en formato `AAAA-MM-DD`.

**Consulta 1: KPIs del período**

```http
GET /api/indicadores?desde=2026-10-28&hasta=2026-11-02
```

Ejemplo de cuerpo JSON:

```json
{
  "total_ventas": 6,
  "total_unidades": 13,
  "ingresos_total": "2800.00",
  "ticket_promedio": "466.67",
  "ultima_actualizacion": "2026-11-02 08:05:00"
}
```

La marca de tiempo es **ilustrativa**: en el entorno real depende de cuándo se ejecute el procedimiento.

**Consulta 2: serie diaria para el gráfico**

```http
GET /api/ventas-diarias?desde=2026-10-28&hasta=2026-11-02
```

La respuesta es una lista de objetos con `fecha`, `cantidad_ventas`, `unidades_vendidas`, `ingresos`, `ticket_promedio` y `ultima_actualizacion`.

**Reglas:** fechas inválidas o invertidas → HTTP 400; período vacío → lista vacía para la serie y ceros para los KPIs; error inesperado → HTTP 500 sin divulgar detalles internos.

### 7.2. Preparar el backend

En la carpeta `backend`:

```bash
npm init -y
npm install express mysql2 dotenv
```

Archivo **`.env.example`** (copiarlo a `.env` y reemplazar valores localmente):

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=usuario_consulta
DB_PASSWORD=CAMBIAR_LOCALMENTE
DB_NAME=laboratorio_ventas
PORT=3000
```

El usuario de la API debe tener permisos de lectura sobre `resumen_ventas_diarias`. Por ejemplo, **un administrador de la base** puede preparar el usuario (ajustar contraseña y host según el laboratorio):

```sql
CREATE USER 'usuario_consulta'@'localhost'
  IDENTIFIED BY 'CAMBIAR_POR_CLAVE_SEGURA';
GRANT SELECT ON laboratorio_ventas.resumen_ventas_diarias
  TO 'usuario_consulta'@'localhost';
```

El usuario que registra ventas y el que ejecuta la consolidación requieren permisos distintos. **No utilizar la cuenta de administrador de MySQL en el backend público.**

### 7.3. Ejemplo funcional de `server.js`

Este servidor sirve simultáneamente la página web y los dos endpoints. Al utilizar `dateStrings: true`, las fechas `DATE` se entregan como cadenas, sin conversiones accidentales de zona horaria por parte del driver.

```javascript
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 5
});

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

function validarRango(req, res, next) {
  const { desde, hasta } = req.query;
  if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) {
    return res.status(400).json({
      error: 'Indique desde y hasta válidos (AAAA-MM-DD), con desde <= hasta.'
    });
  }
  next();
}

app.get('/api/indicadores', validarRango, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        COALESCE(SUM(cantidad_ventas), 0) AS total_ventas,
        COALESCE(SUM(unidades_vendidas), 0) AS total_unidades,
        COALESCE(SUM(ingresos), 0) AS ingresos_total,
        CASE WHEN SUM(cantidad_ventas) > 0
          THEN ROUND(SUM(ingresos) / SUM(cantidad_ventas), 2)
          ELSE 0 END AS ticket_promedio,
        MAX(ultima_actualizacion) AS ultima_actualizacion
      FROM resumen_ventas_diarias
      WHERE fecha BETWEEN ? AND ?
    `, [req.query.desde, req.query.hasta]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar los indicadores.' });
  }
});

app.get('/api/ventas-diarias', validarRango, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT fecha, cantidad_ventas, unidades_vendidas,
             ingresos, ticket_promedio, ultima_actualizacion
      FROM resumen_ventas_diarias
      WHERE fecha BETWEEN ? AND ?
      ORDER BY fecha
    `, [req.query.desde, req.query.hasta]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar las ventas diarias.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Dashboard: http://localhost:${port}`));
```

**¿Por qué esta API respeta la arquitectura?** Porque las consultas SQL de ambos endpoints se hacen únicamente a `resumen_ventas_diarias`. El navegador **nunca se conecta directamente a MySQL**: se comunica con el servidor web por HTTP.

**¿Por qué usar `?` en SQL?** Son parámetros que evitan concatenar los valores recibidos desde la URL en la consulta.

**¿Por qué los importes salen a veces como texto?** El driver puede entregar `DECIMAL` como cadena para no perder exactitud. El dashboard puede convertirlos a número al dibujar, pero no debería efectuar cálculos contables complejos con aritmética de coma flotante de JavaScript.

## 8. Construir un dashboard web que consuma los endpoints

Para que el ejercicio tenga una representación visual real, este ejemplo usa **HTML + JavaScript sin dependencias externas**. El gráfico aparece como barras horizontales construidas con HTML y CSS, lo cual evita instalar una biblioteca. Los estudiantes pueden sustituirlo por Chart.js, ECharts u otra biblioteca como ampliación.

Crear `backend/public/index.html`:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard de ventas</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #233044; }
    .filtros { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .tarjetas { display: flex; flex-wrap: wrap; gap: 12px; }
    .tarjeta { border: 1px solid #d0d8e0; padding: 14px; min-width: 160px; }
    .valor { font-size: 1.5rem; font-weight: bold; display: block; }
    .fila { display: flex; gap: 12px; align-items: center; margin: 10px 0; }
    .fecha { width: 100px; flex-shrink: 0; }
    .pista { background: #edf1f5; width: 300px; max-width: 55vw; height: 22px; }
    .barra { background: #336b9a; height: 100%; }
    #mensaje { color: #a12d25; }
  </style>
</head>
<body>
  <h1>Indicadores de ventas</h1>
  <div class="filtros">
    <label>Desde <input id="desde" type="date"></label>
    <label>Hasta <input id="hasta" type="date"></label>
    <button id="consultar">Consultar</button>
  </div>
  <p id="mensaje" role="alert"></p>
  <div class="tarjetas">
    <div class="tarjeta">Ventas <span id="ventas" class="valor">—</span></div>
    <div class="tarjeta">Unidades <span id="unidades" class="valor">—</span></div>
    <div class="tarjeta">Ingresos <span id="ingresos" class="valor">—</span></div>
    <div class="tarjeta">Ticket promedio <span id="ticket" class="valor">—</span></div>
  </div>
  <h2>Ingresos por día</h2>
  <div id="grafico"></div>
  <p id="actualizado">Última consolidación: —</p>
  <p><small>Los datos se consolidan aproximadamente cada cinco minutos.</small></p>
  <script>
    const $ = (id) => document.getElementById(id);
    const formatoFecha = (d) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 30);
    $('desde').value = formatoFecha(inicio);
    $('hasta').value = formatoFecha(hoy);
    const moneda = (valor) =>
      Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    async function consultar() {
      $('mensaje').textContent = '';
      const qs = new URLSearchParams({ desde: $('desde').value, hasta: $('hasta').value });
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/indicadores?${qs}`),
          fetch(`/api/ventas-diarias?${qs}`)
        ]);
        if (!r1.ok || !r2.ok) throw new Error('No fue posible consultar el período. Revise las fechas.');
        const indicadores = await r1.json();
        const dias = await r2.json();
        $('ventas').textContent = indicadores.total_ventas;
        $('unidades').textContent = indicadores.total_unidades;
        $('ingresos').textContent = moneda(indicadores.ingresos_total);
        $('ticket').textContent = moneda(indicadores.ticket_promedio);
        $('actualizado').textContent =
          `Última consolidación: ${indicadores.ultima_actualizacion || 'Sin datos en el período'}`;

        const maximo = Math.max(...dias.map(d => Number(d.ingresos)), 1);
        const grafico = $('grafico');
        grafico.replaceChildren();
        if (dias.length === 0) grafico.textContent = 'No hay ventas confirmadas en este período.';
        for (const dia of dias) {
          const fila = document.createElement('div');
          fila.className = 'fila';
          const fecha = document.createElement('span');
          fecha.className = 'fecha';
          fecha.textContent = dia.fecha;
          const pista = document.createElement('div');
          pista.className = 'pista';
          const barra = document.createElement('div');
          barra.className = 'barra';
          barra.style.width = `${100 * Number(dia.ingresos) / maximo}%`;
          pista.append(barra);
          const valor = document.createElement('span');
          valor.textContent = moneda(dia.ingresos);
          fila.append(fecha, pista, valor);
          grafico.append(fila);
        }
      } catch (e) {
        $('mensaje').textContent = e.message;
      }
    }
    $('consultar').addEventListener('click', consultar);
    consultar();
  </script>
</body>
</html>
```

Ejecutar el backend:

```bash
node server.js
```

Abrir en el navegador `http://localhost:3000`. Si el servidor se abre sin errores pero las consultas fallan, verificar que el procedimiento se ejecutó al menos una vez, que la conexión a MySQL usa la base correcta y que el usuario configurado tiene permisos de lectura.

### 8.1. Tres aspectos que deben explicarse al estudiante

**El dashboard no realiza los cálculos de negocio.** Solo presenta los indicadores que entrega la API.

**La API no calcula los resúmenes.** Recupera información ya consolidada mediante `SELECT`.

**El procedimiento sí realiza el procesamiento analítico.** Así, la responsabilidad del cálculo queda en un lugar definido del sistema.

## 9. Probar los cambios: venta nueva, anulación y corrección

### Caso A. Anular una venta confirmada

La venta `1` del ejemplo tuvo ingresos por **200.00** el 28 de octubre. Anularla:

```sql
UPDATE ventas
SET estado = 'ANULADA'
WHERE id_venta = 1;

-- Antes de consolidar, el resumen sigue mostrando el valor anterior.
SELECT * FROM resumen_ventas_diarias WHERE fecha = '2026-10-28';

CALL sp_actualizar_resumen_ventas();
SELECT * FROM resumen_ventas_diarias WHERE fecha = '2026-10-28';
```

**Resultado esperado tras consolidar:** el 28 de octubre pasa de **2 ventas, 4 unidades y 800.00** a **1 venta, 1 unidad y 600.00**, con ticket promedio **600.00**.

### Caso B. Corregir un precio unitario histórico de prueba

Solo en este laboratorio, modificar el detalle de la venta `6` (Mouse de 50.00 a 60.00):

```sql
UPDATE detalle_venta
SET precio_unitario = 60.00
WHERE id_venta = 6 AND id_producto = 2;

CALL sp_actualizar_resumen_ventas();
SELECT * FROM resumen_ventas_diarias WHERE fecha = '2026-11-02';
```

El total del 2 de noviembre aumenta de **1450.00 a 1460.00** y el ticket promedio diario pasa de **725.00 a 730.00**. En sistemas reales estos cambios suelen requerir trazabilidad, autorización y políticas de ajuste; aquí se utilizan para comprobar la consolidación.

### Caso C. Agregar una venta nueva

```sql
START TRANSACTION;
INSERT INTO ventas (id_cliente, fecha_venta, estado)
VALUES (2, '2026-11-02 08:10:00', 'CONFIRMADA');
SET @id_nueva_venta = LAST_INSERT_ID();
INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
VALUES (@id_nueva_venta, 1, 1, 100.00);
COMMIT;

-- Consultar resumen antes del procedimiento.
-- Posteriormente esperar el evento o llamar manualmente:
CALL sp_actualizar_resumen_ventas();
```

El estudiante debe verificar el impacto sobre cantidad de ventas, unidades, ingresos y ticket promedio. **No ejecutar esta inserción varias veces** sin tener en cuenta que cada ejecución registra una venta adicional.

### Caso D. Prueba de repetibilidad

```sql
CALL sp_actualizar_resumen_ventas();
SELECT fecha, cantidad_ventas, unidades_vendidas, ingresos
FROM resumen_ventas_diarias ORDER BY fecha;

CALL sp_actualizar_resumen_ventas();
SELECT fecha, cantidad_ventas, unidades_vendidas, ingresos
FROM resumen_ventas_diarias ORDER BY fecha;
```

Si ninguna venta cambió entre ejecuciones, las cifras deben ser idénticas; **solo cambia `ultima_actualizacion`** (si la segunda ejecución ocurre en otro segundo).

## 10. Consideraciones de ingeniería para discutir en clase

### 10.1. ¿Por qué no hacer un `SUM()` en cada endpoint?

Es perfectamente posible y, con pocos registros, puede incluso resultar suficiente. Pero hacerlo en todas las solicitudes mezcla cálculos operativos y necesidades del dashboard. La tabla consolidada permite discutir costos de consulta, organización del código y frecuencia de actualización.

**No se debe prometer mejor rendimiento sin medirlo.** Puede proponerse medir la latencia de consultas directas y consolidadas con un volumen creciente de ventas, en un ambiente controlado.

### 10.2. ¿Es analítica en tiempo real?

No. Es **consulta sobre un resumen actualizado periódicamente**. Con una ejecución cada cinco minutos, una venta recién creada puede tardar hasta aproximadamente ese intervalo (o más si hay fallos) en aparecer en el dashboard.

### 10.3. ¿Qué pasa con los días sin ventas?

No se genera una fila de resumen si ese día no existen ventas confirmadas. La API devuelve una lista sin ese día. Si se necesita una gráfica con todas las fechas, el frontend puede completar los días vacíos con cero, o la API puede generar la serie de fechas. No debe confundirse «sin fila» con «error de base de datos».

### 10.4. ¿Por qué se requiere cuidado con la anulación?

Cuando una venta se anula, no basta con «agregar la venta nueva» al resumen. Hay que **restar o recalcular** lo que la venta anulada había aportado. El recálculo completo resuelve este problema de forma sencilla para el laboratorio.

### 10.5. ¿La arquitectura elimina cualquier carga sobre el OLTP?

No. La lectura del dashboard se hace sobre el resumen, pero el procedimiento de consolidación **sigue leyendo las tablas transaccionales**. En producciones de gran escala pueden necesitarse índices, réplicas, actualizaciones incrementales u otra infraestructura analítica.

### 10.6. ¿Y si se desea una actualización incremental?

Sería una segunda etapa. Una solución sólida puede registrar una **cola de fechas afectadas** por inserciones, modificaciones y anulaciones, y recalcular únicamente esas fechas. Si una venta cambia de fecha, deben marcarse **ambos días, el anterior y el nuevo**. También hay que contemplar cambios en los detalles, ejecuciones simultáneas e interrupciones del proceso.

En consecuencia, **filtrar solo por `fecha_modificacion` de la cabecera no resuelve todos los casos**: cambiar un detalle no siempre actualiza automáticamente esa columna, y cambiar la fecha de la venta puede afectar dos grupos diarios.

### 10.7. Seguridad y operación

- El backend del dashboard debería operar con un usuario que solo tenga `SELECT` sobre el resumen.
- Las credenciales van en variables de entorno; el repositorio no debe incluir `.env` real.
- Las fechas deben validarse y utilizar parámetros en las consultas.
- El procedimiento y el evento requieren permisos específicos. No deben exponerse como endpoints públicos.
- El servidor y MySQL deben usar una zona horaria acordada para interpretar fechas y mostrar `ultima_actualizacion`.
- Si no existe ninguna venta confirmada, el resumen estará vacío; los KPIs globales deben devolver ceros, sin provocar fallos.

## 11. Evidencias y matriz de validación

Se recomienda entregar una tabla completada por el equipo:

| Prueba            | Consulta / acción       | Resultado previsto             | Resultado observado | Cumple |
| ----------------- | ------------------------ | ------------------------------ | ------------------- | ------ |
| Totales iniciales | Ejecutar procedimiento   | 6 ventas, 13 unidades, 2800.00 | ____                | ____   |
| Excluir anulada   | Revisar 2026-10-29       | 1 venta y 250.00               | ____                | ____   |
| Anular venta 1    | Anular y consolidar      | 2026-10-28: 600.00             | ____                | ____   |
| Modificar detalle | Cambiar 50 a 60          | 2026-11-02: 1460.00            | ____                | ____   |
| Repetibilidad     | Ejecutar 2 veces         | Totales iguales                | ____                | ____   |
| Sin ventas        | Consultar fechas vacías | 0 / lista vacía               | ____                | ____   |
| Fecha inválida   | `desde=2026-02-30`     | HTTP 400                       | ____                | ____   |
| Separación       | Revisar backend          | Solo lee tabla resumen         | ____                | ____   |
| Programación     | Esperar ciclo de 5 min   | Se actualiza marca de tiempo   | ____                | ____   |

**Atención:** los valores numéricos de esta tabla corresponden a las **7 ventas iniciales del ejemplo** y a los cambios **en el orden indicado**. Los grupos que carguen 30 o más ventas deberán sustituirlos por sus valores calculados y documentados.

## 12. Cierre conceptual y discusión final

El estudiante habrá construido una cadena funcional:

**registro de compras → consolidación periódica en MySQL → tabla resumen → API de lectura → dashboard**.

La práctica enseña que un motor relacional puede soportar tanto transacciones como reportes agregados si el volumen y los requisitos lo permiten. Enseña también que una arquitectura de datos exige decidir **qué calcular, cuándo calcularlo, dónde almacenarlo y qué retraso de actualización es aceptable**.

Antes de pasar a una práctica SQL → NoSQL, conviene que el grupo pueda justificar esta primera solución y sus límites. Solo entonces tendría sentido comparar, bajo condiciones equivalentes, un modelo SQL con una arquitectura que incorpore MongoDB u otra tecnología.

---

**Uso docente recomendado:** el archivo `01_Ejercicio_academico_MySQL_dashboard.md` funciona como enunciado evaluable; esta guía constituye la explicación técnica y los ejemplos de referencia. Puede entregarse completa como material de apoyo o reservar las secciones con código para después de que los estudiantes intenten su propia solución.
