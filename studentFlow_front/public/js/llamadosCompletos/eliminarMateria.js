// EJEMPLO COMPLETO: Eliminar materia (DELETE).
// Página: llamadoCompleto/eliminar.html, servida por el servidor del proyecto.
// Toda la solicitud y la presentación del resultado están en este archivo.

async function eliminarMateria(evento) {
  // Evitar que el formulario recargue la página al enviarse.
  evento.preventDefault();

  const mensajeEstado = document.querySelector("#estado");
  const boton = document.querySelector("#enviar");
  const resultadoTexto = document.querySelector("#resultado");
  resultadoTexto.textContent = "";
  mensajeEstado.textContent = "Enviando solicitud…";
  mensajeEstado.dataset.type = "loading";
  boton.disabled = true;

  try {
    // 1. Definir el endpoint. El servidor del frontend lo reenvía al backend.
    const endpoint = "/api/v1/materias";

    // 2. Leer el ID del formulario y comprobar que sea válido.
    const idMateria = Number(document.querySelector("#materia-id").value);
    if (!Number.isSafeInteger(idMateria) || idMateria < 1) {
      throw new Error("El ID debe ser un entero mayor que cero.");
    }
    // La eliminación se realiza solo si el usuario confirma el ID elegido.
    if (!window.confirm(`¿Eliminar la materia con ID ${idMateria}?`)) {
      mensajeEstado.textContent = "Eliminación cancelada.";
      mensajeEstado.dataset.type = "";
      return;
    }

    // 3. Construir la URL con el ID en la ruta.
    const url = `${endpoint}/${idMateria}`;
    console.log("URL de la solicitud:", url);

    // 4. Enviar la petición DELETE y esperar la respuesta con await.
    // Esta petición no necesita body: el ID se envía en la ruta.
    const respuesta = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json"
      }
    });

    // 5. DELETE responde 204 cuando tiene éxito y no devuelve cuerpo.
    // No debemos llamar a respuesta.json() en ese caso.
    if (respuesta.status === 204) {
      // 6. Mostrar el estado HTTP de la eliminación.
      mensajeEstado.textContent = "HTTP 204 · Materia eliminada correctamente.";
      mensajeEstado.dataset.type = "success";

      // 7. Informar qué registro se eliminó, sin esperar datos JSON.
      resultadoTexto.textContent = `Se eliminó la materia con ID ${idMateria}. La respuesta no contiene JSON.`;
      console.log(resultadoTexto.textContent);

      // 8. Terminar la función tras completar la eliminación.
      return;
    }

    // Si no recibimos 204, leer el mensaje de error que devuelve el backend.
    const resultado = await respuesta.json();
    throw new Error(resultado.error?.message
      || `Se esperaba HTTP 204, pero el servidor respondió HTTP ${respuesta.status}`);
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

// 10. Ejecutar la función al enviar el formulario; abrir la página no envía la operación.
document.querySelector("#formulario-materia").addEventListener("submit", eliminarMateria);

