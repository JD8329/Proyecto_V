# Aplicativo de recordatorios

## Objetivo

Administrar los recordatorios del usuario actual y mostrar la tarea y la materia asociadas. La tabla `recordatorio` tiene los campos `id_recordatorio`, `id_tarea`, `mensaje`, `fecha_hora`, `canal`, `leido` y `created_at`. Los canales permitidos por el esquema son `in_app` y `email`.

## Relaciones y acceso

El recordatorio referencia a `tarea` por `id_tarea`; `tarea` referencia a `materia` por `id_materia`; `materia` identifica a su propietario mediante `id_usuario`. Por eso, las consultas de recordatorios unen `recordatorio`, `tarea` y `materia`, y limitan los resultados a `materia.id_usuario = request.user.id`. La lista de tareas para asociar recordatorios usa la misma relación y filtro.

Las uniones son de muchos-a-uno desde recordatorio hacia tarea y de tarea hacia materia, así que no duplican filas. El proyecto todavía usa el middleware temporal que asigna el usuario `1`.

**Solo se escriben filas de `recordatorio`.** Crear usa `INSERT INTO recordatorio ... SELECT` con una comprobación de propiedad en lectura. Actualizar usa `UPDATE recordatorio` y eliminar usa `DELETE FROM recordatorio`; las tablas `tarea` y `materia` solo aparecen en consultas de lectura/autorización. No se cambian esas tablas ni el esquema.

## Interfaz

Con el backend y frontend iniciados según [studentFlow_front/README.md](./studentFlow_front/README.md), abre `http://127.0.0.1:5501/recordatorios.html`. La página permite:

- Consultar los recordatorios paginados, buscar por mensaje/tarea/materia y filtrar por leído.
- Consultar una fila para editarla, crear, reemplazar parcialmente y eliminar un recordatorio.
- Elegir una tarea propia de una lista que solo se consulta.

## API

Todas las rutas parten de `/api/v1/recordatorios`.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/` | Lista paginada de recordatorios del usuario |
| GET | `/tareas` | Tareas propias disponibles para asociar |
| GET | `/:id` | Consulta un recordatorio propio |
| POST | `/` | Crea un recordatorio; responde HTTP 201 |
| PUT | `/:id` | Reemplaza los campos del recordatorio |
| PATCH | `/:id` | Actualiza únicamente los campos enviados |
| DELETE | `/:id` | Elimina el recordatorio propio; responde HTTP 204 |

Los filtros opcionales de la consulta GET son `leido=true|false`, `search` (texto para buscar), `page` (página, por defecto 1), `limit` (cantidad por página, por defecto 20 y máximo 100), `sort` (campo de orden: `id|mensaje|fechaHora|canal|leido`) y `order` (sentido: `asc|desc`).

POST y PUT requieren `tareaId`, `mensaje` (1–255 caracteres), `fechaHora` (`YYYY-MM-DDTHH:mm[:ss]`) y `canal` (`in_app` o `email`). `leido` es opcional y por defecto es `false`. PATCH admite esos mismos campos de forma parcial y requiere al menos uno. La tarea referenciada debe pertenecer al usuario actual. Una tarea inválida o de otro usuario produce HTTP 404; el identificador inválido produce HTTP 422.

Ejemplo de creación:

```http
POST /api/v1/recordatorios
Content-Type: application/json

{
  "tareaId": 12,
  "mensaje": "Revisar los materiales antes de la entrega",
  "fechaHora": "2026-08-21T18:30",
  "canal": "in_app",
  "leido": false
}
```

La respuesta de consulta contiene `{ "success": true, "data": [...] , "meta": { "page": 1, "limit": 20, "total": 1, "pages": 1 } }`. Cada fila incluye `id`, `tareaId`, `tareaTitulo`, `materiaNombre`, `mensaje`, `fechaHora`, `canal`, `leido` y `createdAt`.

## Verificación

Desde `studentFlow_back`, ejecuta `npm test` para las pruebas de validación y de alcance SQL sin escribir en la base de datos. Desde `studentFlow_front`, ejecuta `npm test` para las pruebas del cliente HTTP. La interfaz con la base de datos real requiere iniciar ambos servicios y utiliza el usuario temporal `1`.
