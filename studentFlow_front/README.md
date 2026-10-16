# StudentFlow Front

Base de HTML, CSS y JavaScript sin framework para consumir todos los endpoints actuales del backend. No requiere instalar dependencias. El usuario sigue siendo el usuario temporal `1` definido por el backend.

## Iniciar

Requisito: Node.js 22 o superior, MySQL y el backend configurados.

En una terminal de PowerShell, inicia el backend:

```powershell
cd D:\Downloads\camacho\2026B\programacionV\studentFlow_back
npm start
```

En otra terminal, inicia el frontend:

```powershell
cd D:\Downloads\camacho\2026B\programacionV\studentFlow_front
npm start
```

Abre **http://127.0.0.1:5500**. También puedes usar `npm run dev` para reiniciar el servidor local al editar archivos. Refresca el navegador para ver cambios en las páginas.

El servidor sirve únicamente `public/` y reenvía las solicitudes `/api/` al backend en `http://127.0.0.1:3000`. Así las páginas y el API comparten origen sin modificar el backend ni necesitar CORS durante el desarrollo. No abras el HTML con doble clic ni con Live Server: esos métodos no incluyen el proxy.

Si el backend usa otro puerto, configura la terminal antes de iniciar:

```powershell
$env:BACKEND_URL = "http://127.0.0.1:3001"
$env:FRONT_PORT = "5501"
npm start
```

`BACKEND_URL` es el origen del backend, sin `/api/v1`. `server.js` es un servidor para desarrollo local, no una configuración de despliegue.

## Archivos

```text
studentFlow_front/
  package.json
  server.js                       Servidor estático y proxy local
  public/
    index.html                    Página para probar los siete endpoints
    css/styles.css                Estilos de la página de ejemplo
    js/
      config.js                   Ruta base y tiempo máximo de espera
      api/
        http.js                   Fetch, errores, filtros y respuesta 204
        health.js                 Estado del backend
        materias.js               Seis funciones del CRUD de materias
      examples/
        datos.js                  Payloads editables de ejemplo
        endpoints.js              Ejemplo ejecutable de cada endpoint
      pages/
        pruebas.js                Eventos y presentación de la página de prueba
  tests/api.test.js               Pruebas del cliente con respuestas simuladas
```

## Endpoints disponibles

Todas las rutas parten de `/api/v1`.

| Función | Método | Ruta | Resultado |
| --- | --- | --- | --- |
| `consultarEstado()` | GET | `/health` | `{ success, data: { status, database } }` |
| `listarMaterias(filtros)` | GET | `/materias` | `{ success, data: [], meta }` |
| `obtenerMateria(id)` | GET | `/materias/:id` | `{ success, data: materia }` |
| `crearMateria(datos)` | POST | `/materias` | `{ success, data: materia }`, HTTP 201 |
| `reemplazarMateria(id, datos)` | PUT | `/materias/:id` | `{ success, data: materia }` |
| `actualizarMateria(id, cambios)` | PATCH | `/materias/:id` | `{ success, data: materia }` |
| `eliminarMateria(id)` | DELETE | `/materias/:id` | `null`, HTTP 204 sin cuerpo |

Filtros del listado:

| Campo | Valores |
| --- | --- |
| `search` | Texto a buscar en nombre o código |
| `activa` | `true` o `false`; omitir para incluir ambas |
| `page` | Entero desde 1; por defecto 1 |
| `limit` | Entero de 1 a 100; por defecto 20 |
| `sort` | `id`, `nombre`, `codigo`, `creditos`, `createdAt` |
| `order` | `asc` o `desc` |

La paginación se devuelve en `meta`: `page`, `limit`, `total` y `pages`.

En POST y PUT se envían `nombre`, `codigo` y `color` (`#RRGGBB`). `creditos` es un entero mayor o igual que cero o `null`; `activa` es un booleano. Si se omiten, el backend asigna `creditos: null` y `activa: true`. En PATCH se envía al menos uno de estos campos. PUT reemplaza la representación y PATCH conserva los campos omitidos.

## Probar el flujo completo

1. Selecciona **Estado del servicio** y ejecuta la consulta.
2. Selecciona **Crear materia**, revisa el ejemplo y pulsa el botón de creación.
3. El ID devuelto queda disponible en el campo ID para las siguientes operaciones. También puedes obtenerlo del listado.
4. Prueba **Listar materias**, **Consultar una materia**, **Reemplazar materia** y **Actualizar algunos campos**.
5. El ejemplo de PATCH desactiva la materia. Para encontrarla en el listado, elimina el filtro `activa` o usa `false`.
6. Si deseas borrar la materia de prueba, usa **Eliminar materia** con su ID.

Los ejemplos son datos para enviar al API real. No se insertan al abrir la página. Repetir una creación con el mismo nombre o código puede producir un 409; cambia ambos valores para crear otra materia. La eliminación pide confirmación en la página.

## Usar desde futuras páginas

Coloca las nuevas páginas HTML dentro de `public/` y sus scripts en `public/js/pages/`. Los módulos del API no dependen del DOM ni de la página de prueba.

Ejemplo de `public/materias.html`:

```html
<!doctype html>
<html lang="es">
  <meta charset="utf-8">
  <title>Mis materias</title>
  <p id="mensaje" role="status"></p>
  <ul id="materias"></ul>
  <script type="module" src="./js/pages/materias.js"></script>
</html>
```

Ejemplo de `public/js/pages/materias.js`:

```javascript
import { listarMaterias } from "../api/materias.js";

try {
  const { data, meta } = await listarMaterias({ page: 1, limit: 10 });
  const lista = document.querySelector("#materias");
  for (const materia of data) {
    const item = document.createElement("li");
    item.textContent = `${materia.nombre} (${materia.codigo})`;
    lista.append(item);
  }
  document.querySelector("#mensaje").textContent = `${meta.total} materias encontradas`;
} catch (error) {
  document.querySelector("#mensaje").textContent = error.message;
  console.error(error.status, error.code);
}
```

Para los demás métodos:

```javascript
import {
  obtenerMateria, crearMateria, reemplazarMateria,
  actualizarMateria, eliminarMateria
} from "../api/materias.js";
import { consultarEstado } from "../api/health.js";
import { materiaEjemplo, reemplazoEjemplo } from "../examples/datos.js";

// Ejecutar cada operación desde el evento correspondiente de la página.
await consultarEstado();
const { data: nueva } = await crearMateria(materiaEjemplo);
await obtenerMateria(nueva.id);
await reemplazarMateria(nueva.id, reemplazoEjemplo);
await actualizarMateria(nueva.id, { activa: false });
await eliminarMateria(nueva.id);
```

Las funciones arrojan `ApiError` con `message`, `status` y `code` cuando falla una solicitud. `status: 0` indica un fallo local de red o tiempo de espera. El proxy devuelve 502 si no puede contactar al backend. Los mensajes 400, 404, 409, 422 y 500 del API se conservan.

## Verificar

```powershell
npm test
```

Las pruebas simulan `fetch`: verifican los siete métodos y rutas, cuerpos JSON, filtros, paginación, errores y eliminación sin contenido. No necesitan MySQL y no modifican datos. Las pruebas del CRUD real se hacen desde la página con el backend y MySQL disponibles.
