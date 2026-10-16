// EJEMPLO: consultar el listado de materias del API.
// Cargar desde una página servida por el frontend (http://127.0.0.1:5500).

async function listarMaterias() {
  // 1. Definir el endpoint.
  // El servidor del frontend reenvía esta ruta al backend.
  const endpoint = "/api/v1/materias";

  // 2. Preparar los filtros que enviaremos en la URL.
  // Elimina activa para consultar tanto materias activas como inactivas.
  const filtros = new URLSearchParams({
    activa: "true",
    page: "1",
    limit: "20",
    sort: "nombre",
    order: "asc"
  });

  // 3. Construir la URL completa.
  // /api/v1/materias?activa=true&page=1&limit=20&sort=nombre&order=asc
  const url = `${endpoint}?${filtros.toString()}`;
  console.log("URL que vamos a consultar:", url);

  // Buscar los elementos del HTML donde mostraremos el resultado.
  // Si no existen, el ejemplo seguirá mostrando los datos en la consola.
  const cuerpoTabla = document.querySelector("#materias-body");
  const mensajeEstado = document.querySelector("#estado");
  const resumenPaginacion = document.querySelector("#paginacion");
  const botonRecargar = document.querySelector("#recargar-materias");

  if (cuerpoTabla) cuerpoTabla.replaceChildren();
  if (resumenPaginacion) resumenPaginacion.textContent = "";
  if (botonRecargar) botonRecargar.disabled = true;
  if (mensajeEstado) {
    mensajeEstado.textContent = "Consultando materias…";
    mensajeEstado.dataset.type = "loading";
  }

  try {
    // 4. Enviar la petición HTTP.
    // GET consulta información y no necesita un cuerpo (body).
    // await espera hasta recibir la respuesta del servidor.
    const respuesta = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    // 5. Convertir el cuerpo JSON en un objeto JavaScript.
    // El backend devuelve: { success, data, meta }.
    const resultado = await respuesta.json();

    // 6. Comprobar si el servidor reportó un error.
    // respuesta.ok es true para estados HTTP entre 200 y 299.
    if (!respuesta.ok || resultado.success === false) {
      const mensaje = resultado.error?.message
        || `La consulta falló con el estado HTTP ${respuesta.status}`;
      throw new Error(mensaje);
    }

    // 7. Extraer las materias y la información de paginación.
    const materias = resultado.data;
    const paginacion = resultado.meta;

    // 8. Mostrar la información en la consola y en la tabla HTML.
    console.table(materias);
    console.log("Total de materias:", paginacion.total);
    console.log("Página actual:", paginacion.page);
    console.log("Total de páginas:", paginacion.pages);

    if (cuerpoTabla) {
      // Recorrer el arreglo recibido y crear una fila por cada materia.
      for (const materia of materias) {
        const fila = document.createElement("tr");
        const valores = [
          materia.id,
          materia.nombre,
          materia.codigo,
          materia.color,
          materia.creditos ?? "Sin asignar",
          materia.activa ? "Activa" : "Inactiva"
        ];

        // Cada valor se convierte en una celda de la fila.
        for (const valor of valores) {
          const celda = document.createElement("td");
          // textContent muestra el dato como texto, sin interpretarlo como HTML.
          celda.textContent = valor;
          fila.append(celda);
        }

        cuerpoTabla.append(fila);
      }
    }

    if (mensajeEstado) {
      mensajeEstado.textContent = materias.length === 0
        ? "No se encontraron materias activas."
        : "Materias consultadas correctamente.";
      mensajeEstado.dataset.type = "success";
    }

    if (resumenPaginacion && materias.length > 0) {
      resumenPaginacion.textContent = `Mostrando ${materias.length} de ${paginacion.total} materias activas. Página ${paginacion.page} de ${paginacion.pages}.`;
    }
  } catch (error) {
    // 9. Manejar problemas de conexión, respuestas inválidas
    // o errores reportados por el API.
    console.error("No se pudieron listar las materias:", error.message);
    if (mensajeEstado) {
      mensajeEstado.textContent = `No se pudieron listar las materias: ${error.message}`;
      mensajeEstado.dataset.type = "error";
    }
  } finally {
    // Volver a habilitar el botón tanto si la consulta funcionó como si falló.
    if (botonRecargar) botonRecargar.disabled = false;
  }
}

// 10. Ejecutar la función para iniciar la consulta.
listarMaterias();
