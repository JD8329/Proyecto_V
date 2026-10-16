// EJEMPLO COMPLETO: Estado del servicio (GET).
// Página: llamadoCompleto/estado.html, servida por el servidor del proyecto.
// Toda la solicitud y la presentación del resultado están en este archivo.

async function consultarEstado() {

  const mensajeEstado = document.querySelector("#estado");
  const boton = document.querySelector("#enviar");
  document.querySelector("#servicio").textContent = "Pendiente";
  document.querySelector("#base-datos").textContent = "Pendiente";
  mensajeEstado.textContent = "Enviando solicitud…";
  mensajeEstado.dataset.type = "loading";
  boton.disabled = true;

  try {
    // 1. Definir el endpoint. El servidor del frontend lo reenvía al backend.
    const endpoint = "/api/v1/health";

    // 2. Este endpoint no necesita filtros ni un cuerpo de datos.

    // 3. Construir la URL.
    const url = endpoint;
    console.log("URL de la solicitud:", url);

    // 4. Enviar la petición GET y esperar la respuesta con await.
    // Esta petición no necesita body: solo consulta el estado.
    const respuesta = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    // 5. Leer el cuerpo JSON y convertirlo en un objeto JavaScript.
    const resultado = await respuesta.json();

    // 6. Comprobar el estado HTTP y los errores reportados por el API.
    // respuesta.ok es true para estados HTTP entre 200 y 299.
    if (!respuesta.ok || resultado.success === false) {
      throw new Error(resultado.error?.message
        || `La solicitud falló con el estado HTTP ${respuesta.status}`);
    }

    // 7. Extraer el estado que devuelve el backend.
    const estadoServicio = resultado.data;
    console.log("Estado recibido:", estadoServicio);

    // 8. Mostrar el resultado en los elementos del HTML.
    document.querySelector("#servicio").textContent = estadoServicio.status;
    document.querySelector("#base-datos").textContent = estadoServicio.database;
    mensajeEstado.textContent = `HTTP ${respuesta.status} · Servicio y base de datos disponibles.`;
    mensajeEstado.dataset.type = "success";
  } catch (error) {
    // 9. Mostrar errores de conexión, validación o respuestas del backend.
    console.error("No se pudo completar la operación:", error.message);
    mensajeEstado.textContent = error.message;
    mensajeEstado.dataset.type = "error";
  } finally {
    // Permitir otra solicitud tanto si funcionó como si falló.
    boton.disabled = false;
  }
}

// 10. Consultar al abrir la página y al pulsar el botón.
document.querySelector("#enviar").addEventListener("click", consultarEstado);
consultarEstado();

