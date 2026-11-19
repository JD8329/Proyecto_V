# Cuestionario sobre API, endpoints y resumen de ventas

## API y endpoints de ventas

1. ¿Cuál es el propósito del endpoint `GET /api/v1/health` dentro del sistema de ventas?

2. ¿Qué método HTTP y qué endpoint se utilizan para consultar la lista de clientes disponibles?

3. ¿Qué método HTTP y qué endpoint permiten obtener los productos que pueden agregarse al detalle de una venta?

4. ¿Qué información debería enviar el cliente en el cuerpo de una petición `POST /api/v1/ventas` para registrar una nueva venta?

5. ¿Por qué el registro de la cabecera y el detalle de una venta debe ejecutarse dentro de una transacción de base de datos?

6. ¿Qué respuesta debería entregar la API cuando se intenta crear una venta sin productos en su detalle?

7. ¿Cómo se consulta una venta específica mediante el endpoint `GET /api/v1/ventas/:id`?

8. ¿Qué representa el parámetro `:id` utilizado en varios endpoints de ventas?

9. ¿Qué diferencias existen entre utilizar `PUT` y `PATCH` para actualizar una venta?

10. ¿Qué campos de la cabecera y del detalle podrían modificarse mediante `PUT /api/v1/ventas/:id` o `PATCH /api/v1/ventas/:id`?

11. ¿Por qué la API debe validar el formato de `fechaVenta` antes de guardar o actualizar una venta?

12. ¿Qué debería ocurrir si se intenta consultar, actualizar o anular una venta cuyo identificador no existe?

13. ¿Cuál es la función del endpoint `PATCH /api/v1/ventas/:id/anular` y por qué se utiliza una anulación en lugar de eliminar físicamente la venta?

14. ¿Qué filtros podrían enviarse a `GET /api/v1/ventas` para consultar ventas por cliente, estado o rango de fechas?

15. ¿Cómo ayudan la paginación y el límite de registros a mejorar el funcionamiento del endpoint que lista las ventas?

16. ¿Qué diferencia hay entre los datos operacionales obtenidos desde `GET /api/v1/ventas` y los datos consolidados consultados desde los endpoints de resumen?

17. ¿Qué información proporciona el endpoint `GET /api/v1/resumen/indicadores` al panel principal?

18. ¿Para qué se utiliza el endpoint `GET /api/v1/resumen/ventas-diarias` y cómo podría representarse su respuesta en el frontend?

19. ¿Qué verifica el endpoint `GET /api/v1/resumen/estado` para determinar si existen cambios pendientes de consolidación?

20. ¿Por qué es importante que la API utilice códigos de estado HTTP adecuados y mensajes de error claros en todos sus endpoints?

## Procedimiento y actualización del resumen

21. ¿Cuál es el objetivo del procedimiento almacenado `sp_actualizar_resumen_ventas`?

22. ¿Qué operaciones realiza el procedimiento para reconstruir la información de la tabla `resumen_ventas_diarias`?

23. ¿Cómo se invoca `sp_actualizar_resumen_ventas` desde el endpoint `POST /api/v1/resumen/actualizar`?

24. ¿Por qué el botón **Actualizar resumen** debe habilitarse únicamente cuando `GET /api/v1/resumen/estado` indique que existen cambios pendientes?

25. ¿Qué datos deberían volver a consultarse en el frontend después de ejecutar correctamente el procedimiento de actualización del resumen?

## Respuestas

1. `GET /api/v1/health` verifica que el servidor REST responda y que el backend pueda conectarse a MySQL/MariaDB. Permite comprobar rápidamente la disponibilidad de la aplicación.

2. `GET /api/v1/clientes?search=` lista los clientes disponibles. El parámetro opcional `search` permite filtrar por coincidencia en el nombre.

3. `GET /api/v1/productos?search=` devuelve los productos del catálogo y sus precios, para cargarlos en el detalle de una venta.

4. Debe enviar `clienteId`, `fechaVenta`, `estado` y un arreglo `detalles`. Cada detalle contiene `productoId`, `cantidad` y, opcionalmente, `precioUnitario`.

5. La cabecera y el detalle son una única operación de negocio. Una transacción evita guardar la venta sin sus detalles o dejar detalles huérfanos si ocurre un error.

6. La API debe rechazarla con HTTP `422` o `400`, según el tipo de validación, y un mensaje que indique que se requiere al menos un detalle. Un HTTP `201` no sería correcto.

7. Se usa `GET /api/v1/ventas/:id`; por ejemplo, `/api/v1/ventas/15`.

8. `:id` es el identificador numérico de la venta, que corresponde a `ventas.id_venta`.

9. `PUT` reemplaza toda la representación de la venta y requiere cabecera completa y detalles completos. `PATCH` modifica solo los campos enviados y puede actualizar los detalles de forma opcional.

10. La cabecera permite modificar cliente, fecha y estado. Los detalles permiten sustituir líneas completas: producto, cantidad y precio unitario.

11. El formato debe validarse para evitar fechas imposibles o cadenas ambiguas que puedan filtrarse como SQL o registrarse con un significado incorrecto. Además, se usa una representación normalizada antes de guardar.

12. El recurso inexistente debe responder HTTP `404`, con un código como `NOT_FOUND` y un mensaje claro. No debe devolverse una respuesta `200` con datos vacíos.

13. `PATCH /api/v1/ventas/:id/anular` cambia el estado a `ANULADA`. Se evita borrar físicamente para conservar trazabilidad, integridad histórica y la posibilidad de auditar la operación.

14. Pueden enviarse `clienteId`, `estado`, `fechaDesde`, `fechaHasta`, `page` y `limit`.

15. La paginación limita el volumen transferido y permite recorrer resultados por bloques. El límite evita consultas excesivas y mejora el tiempo de respuesta y el uso de memoria.

16. Los endpoints operacionales leen `ventas`, `detalle_venta`, `clientes` y `productos`, conservando registros individuales. Los datos consolidados leen exclusivamente `resumen_ventas_diarias` y representan indicadores diarios.

17. Retorna, para el período solicitado, ventas totales, unidades vendidas, ingresos totales, ticket promedio ponderado y la última fecha de consolidación.

18. Se usa para obtener una serie por fecha. El frontend puede convertirla en barras o líneas, mostrando ingresos, ventas o unidades en cada fecha.

19. Compara un cálculo actual de las tablas transaccionales con las filas y cifras almacenadas en `resumen_ventas_diarias`. `pendiente=true` significa que el resumen difiere o tiene filas faltantes o sobrantes.

20. Los códigos HTTP permiten que el cliente distinga éxito, validación, ausencia de recursos y fallos internos. Los mensajes claros hacen visibles los errores sin revelar detalles técnicos o credenciales.

21. Su objetivo es reconstruir `resumen_ventas_diarias` a partir del estado vigente de las ventas confirmadas.

22. Inicia una transacción, elimina el resumen anterior, consulta ventas confirmadas y sus detalles, agrupa por día, inserta las cifras nuevas y confirma la transacción. Ante error ejecuta `ROLLBACK`.

23. El controlador recibe `POST /api/v1/resumen/actualizar`, lo pasa al servicio y el repositorio ejecuta `CALL sp_actualizar_resumen_ventas()`. La respuesta incluye el número de días consolidados y la fecha máxima de actualización.

24. El botón evita una recalculación innecesaria cuando el estado indica que el resumen ya refleja las operaciones confirmadas y anuladas.

25. Deben volver a consultarse los indicadores de fecha seleccionada y la serie diaria. También debe consultarse el estado de consolidación para activar o desactivar el botón.
