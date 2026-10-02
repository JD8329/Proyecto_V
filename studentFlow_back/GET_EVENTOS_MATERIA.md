# Endpoint GET de eventos por materia

## Objetivo

El endpoint `GET /api/v1/materias/:id/eventos` devuelve los eventos asociados a una materia, siempre que la materia pertenezca al usuario de la solicitud.

- `id`: identificador de materia recibido en `request.params.id`.
- `userId`: identificador obtenido de `request.user.id`.
- Respuesta correcta: HTTP 200 con `{ "success": true, "data": [...] }`.
- Si la materia existe, pertenece al usuario y no tiene eventos, devuelve `data: []`.

## Archivos involucrados

### Rutas: `src/routes/materias.routes.js`

Se importa `listEventosByMateria` desde el controlador y se registra la ruta:

```js
router.get("/:id/eventos", listEventosByMateria);
```

El router de materias ya está montado bajo `/api/v1/materias`, por eso la ruta completa es `/api/v1/materias/:id/eventos`.

### Controlador: `src/controllers/materias.controller.js`

`listEventosByMateria` valida el id con `validateMateriaId`, toma el usuario de `request.user.id`, llama al servicio y envía el arreglo con `sendSuccess`. Los errores se pasan al middleware central mediante `next(error)`.

### Servicio: `src/services/materias.service.js`

`listEventosByMateria(id, userId)` primero llama a `getMateriaById` para confirmar que la materia pertenece al usuario. Después solicita al repositorio los eventos.

Este paso define un comportamiento importante: si la materia no existe o pertenece a otra persona, `getMateriaById` produce HTTP 404. La consulta del repositorio por sí sola no se ejecuta en esos casos.

### Repositorio: `src/repositories/materias.repositorio.js`

`findEventosByMateriaAndUserId(id, userId)` ejecuta una consulta parametrizada con `pool.execute`. Une `evento` con `materia` y filtra por materia y propietario:

```sql
SELECT
    e.id_evento AS id,
    e.id_materia AS materiaId,
    e.hora_inicio AS horaInicio
FROM evento e
INNER JOIN materia m ON m.id_materia = e.id_materia
WHERE m.id_materia = ? AND m.id_usuario = ?
```

Los parámetros se envían como `[id, userId]`; el repositorio devuelve `rows`. Actualmente la respuesta contiene `id`, `materiaId` y `horaInicio`. Para exponer más datos del evento, hay que añadir al `SELECT` las columnas que existan en el esquema real y sus alias camelCase correspondientes.

## Flujo de la solicitud

```text
GET /api/v1/materias/:id/eventos
  -> materias.routes.js
  -> listEventosByMateria (controlador)
  -> validateMateriaId
  -> listEventosByMateria (servicio)
  -> getMateriaById (verificación de propietario)
  -> findEventosByMateriaAndUserId (repositorio)
  -> MySQL
  -> sendSuccess: { success: true, data: eventos }
```

El middleware temporal `attachTemporaryUser` actualmente asigna `request.user.id = 1`. Por lo tanto, mientras se use ese middleware, la consulta se realiza como el usuario 1. Cuando exista autenticación real, `request.user.id` deberá venir del usuario autenticado.

## Procedimiento para implementarlo

1. Añadir el controlador a la importación de `materias.routes.js` y registrar `GET /:id/eventos`.
2. Crear `listEventosByMateria` en el controlador. Validar `request.params.id`, obtener `request.user.id`, invocar al servicio y manejar errores con `next(error)`.
3. Crear `listEventosByMateria(id, userId)` en el servicio. Seguir el patrón de tareas: comprobar la propiedad de la materia con `getMateriaById` y luego llamar al repositorio.
4. Crear `findEventosByMateriaAndUserId(id, userId)` en el repositorio. Hacer un `SELECT` de columnas explícitas, unir `evento` con `materia`, usar placeholders `?` y devolver `rows`.
5. Probar el endpoint con una materia del usuario que tenga eventos, una materia sin eventos y un identificador inválido.

## Cómo probarlo

Desde la carpeta `studentFlow_back`, iniciar el servidor:

```powershell
npm run dev
```

En otra terminal de PowerShell, consultar una materia:

```powershell
$r = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/materias/1/eventos" -Method Get
$r | ConvertTo-Json -Depth 5
```

Con un evento asociado, la respuesta tiene esta forma:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "materiaId": 1,
      "horaInicio": "08:00:00"
    }
  ]
}
```

Para comprobar la validación del identificador:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/materias/abc/eventos" -Method Get
```

El servidor responde con HTTP 400 y un error `INVALID_ID`. PowerShell muestra una excepción para respuestas HTTP de error; eso es esperado. La prueba ya realizada devolvió correctamente ese código y mensaje.

## Resultados esperados

- Materia del usuario con eventos: HTTP 200 y los eventos en `data`.
- Materia del usuario sin eventos: HTTP 200 y `data: []`.
- Materia inexistente o de otro usuario: HTTP 404 por la verificación del servicio.
- Identificador inválido, como `abc`, `0` o `-1`: HTTP 400 por `validateMateriaId`.
- Error de base de datos: se propaga al middleware central de errores.
