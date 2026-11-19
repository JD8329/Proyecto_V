# Informe breve de implementación

## 1. Arquitectura

Se implementó una separación lógica dentro de MySQL/MariaDB:

```text
Ventas transaccionales -> sp_actualizar_resumen_ventas -> resumen_ventas_diarias -> API REST -> Dashboard
```

- `clientes`, `productos`, `ventas` y `detalle_venta` representan datos operacionales.
- `resumen_ventas_diarias` contiene las consultas consolidadas.
- El backend expone operaciones CRUD de ventas y endpoints de solo lectura para el dashboard.
- El frontend consume exclusivamente los endpoints de resumen para tarjetas y gráfico.

## 2. Decisiones técnicas

- Se recalcula toda la tabla para simplificar anulaciones y cambios históricos.
- Las consultas del backend usan parámetros para evitar SQL dinámico inseguro.
- Las operaciones de cabecera y detalle usan una transacción.
- Se utiliza `COUNT(DISTINCT id_venta)` para que una venta con varios detalles cuente una sola vez.
- `ultima_actualizacion` muestra cuándo fue la última consolidación, no cuándo ocurrió la operación.
- Las reglas de integridad incluyen claves foráneas y restricciones de cantidad/precio.

## 3. Evidencias de implementación

Los entregables principales son:

- `01_esquema_y_datos.sql`: 30 ventas, ventas confirmadas y anuladas.
- `02_procedimiento_y_evento.sql`: procedimiento, evento cada cinco minutos y verificaciones.
- `laboratorio_ventas.sql`: volcado funcional de referencia.
- Backend en `backend/`.
- Dashboard en `front/`.
- Respuestas del cuestionario en `03_Cuestionario_API_endpoints_y_resumen.md`.

## 4. Matriz de pruebas

| Caso | Acción | Resultado esperado | Evidencia |
|---|---|---|---|
| P1 | Consolidar carga inicial | Los totales coinciden con la consulta de control | Ejecutar los scripts y comparar tablas |
| P2 | Ejecutar el procedimiento dos veces | Las cifras no cambian si las ventas no cambian | Comparar las cuatro métricas diarias |
| P3 | Registrar venta confirmada | Los indicadores cambian después de consolidar | `POST /api/v1/ventas` y posterior actualización |
| P4 | Anular venta confirmada | Sus unidades e ingresos desaparecen al consolidar | `PATCH /api/v1/ventas/:id/anular` |
| P5 | Modificar detalle | Los ingresos del día se recalculan | `PUT` o `PATCH` de la venta |
| P6 | Consultar período vacío | KPIs en cero y lista diaria vacía | Endpoint con rango válido sin datos |
| P7 | Enviar fechas inválidas o invertidas | HTTP `400` | Usar `desde` o `hasta` inválidos |
| P8 | Inspeccionar repositorio | El dashboard solo lee el resumen | Revisar `resumen.repository.js` |
| P9 | Esperar el evento | `ultima_actualizacion` cambia | `SHOW EVENTS` y ejecución de cinco minutos |

## 5. Validaciones automatizadas

Ejecutar desde `backend/`:

```powershell
npm install
npm test
npm run check
```

Las pruebas actuales verifican normalización, detalle obligatorio, productos repetidos, actualización parcial y rangos de fechas.

## 6. Desfase y conclusiones

El resumen puede tener hasta cinco minutos de desfase. Una operación nueva no aparece inmediatamente; cambia después del evento o del botón manual. Esto es una ventaja de carga separada, pero requiere advertir al usuario mediante `ultima_actualizacion`.

El recálculo completo es correcto y fácil de auditar para este laboratorio. En escala mayor podría ser costoso, por lo que sería apropiado una actualización incremental basada en días afectados o una arquitectura analítica separada.
