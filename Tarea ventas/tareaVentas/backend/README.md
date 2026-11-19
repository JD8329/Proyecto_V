# API REST — `laboratorio_ventas`

Backend con Node.js, Express y MySQL/MariaDB para registrar ventas y consultar los indicadores previamente consolidados en `resumen_ventas_diarias`.

## Ejecución

Requiere Node.js 20 o superior y la base `laboratorio_ventas` disponible en XAMPP.

```powershell
cd C:\Users\Personal\Desktop\Tarea ventas\tareaVentas\backend
npm install
Copy-Item .env.example .env
npm run dev
```

La configuración local predeterminada utiliza `127.0.0.1:3306`, usuario `root`, contraseña vacía, base `laboratorio_ventas` y puerto HTTP `3001`.

El backend sirve también la interfaz ubicada en `../front`. Con el servidor activo, abra `http://localhost:3001`.

## Endpoints

| Método | Ruta                                                                 | Uso                                                                      |
| ------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| GET     | `/api/v1/health`                                                   | Comprueba servidor y base de datos.                                      |
| GET     | `/api/v1/clientes?search=`                                         | Lista clientes para el formulario.                                       |
| GET     | `/api/v1/productos?search=`                                        | Lista productos y precios de catálogo.                                  |
| GET     | `/api/v1/ventas`                                                   | Lista ventas con filtros y paginación.                                  |
| GET     | `/api/v1/ventas/:id`                                               | Consulta una venta con sus detalles.                                     |
| POST    | `/api/v1/ventas`                                                   | Registra la cabecera y los detalles en una transacción.                 |
| PUT     | `/api/v1/ventas/:id`                                               | Reemplaza toda la venta y sus detalles.                                  |
| PATCH   | `/api/v1/ventas/:id`                                               | Actualiza campos y, opcionalmente, reemplaza los detalles.               |
| PATCH   | `/api/v1/ventas/:id/anular`                                        | Anula una venta.                                                         |
| GET     | `/api/v1/resumen/indicadores?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`    | Obtiene los KPIs del período.                                           |
| GET     | `/api/v1/resumen/ventas-diarias?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` | Obtiene la serie diaria.                                                 |
| POST    | `/api/v1/resumen/actualizar`                                       | Ejecuta `sp_actualizar_resumen_ventas()` y actualiza la tabla resumen. |
| GET     | `/api/v1/resumen/estado`                                           | Indica si las ventas operativas difieren del resumen consolidado.        |

Filtros admitidos por el listado de ventas: `page`, `limit`, `clienteId`, `estado`, `fechaDesde` y `fechaHasta`.

## Registrar una venta

```json
{
  "clienteId": 1,
  "fechaVenta": "2026-11-02 10:30:00",
  "estado": "CONFIRMADA",
  "detalles": [
    {
      "productoId": 2,
      "cantidad": 2,
      "precioUnitario": 50.00
    }
  ]
}
```

`precioUnitario` es opcional. Cuando se omite, la API utiliza `precio_catalogo`; el valor finalmente utilizado queda almacenado en `detalle_venta` como precio histórico.

En una actualización parcial pueden enviarse `clienteId`, `fechaVenta`, `estado` o `detalles`. Si se incluyen los detalles, estos sustituyen completamente los anteriores.

## Separación del resumen

Los endpoints bajo `/api/v1/resumen` consultan exclusivamente `resumen_ventas_diarias`. Registrar, modificar o anular una venta no recalcula automáticamente el resumen: el cambio aparecerá cuando se ejecute `sp_actualizar_resumen_ventas()` o, posteriormente, el evento programado pendiente.

## Estructura

```text
src/config/          Configuración, pool y transacciones
src/controllers/     Adaptación HTTP
src/middlewares/     Manejo centralizado de errores
src/repositories/    Consultas SQL parametrizadas
src/routes/          Rutas Express
src/services/        Casos de uso y reglas de negocio
src/utils/           Respuestas y errores compartidos
src/validators/      Validación y normalización de entradas
test/                Pruebas automatizadas
```
