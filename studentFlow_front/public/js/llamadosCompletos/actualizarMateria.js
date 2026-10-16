// EJEMPLO COMPLETO: Actualizar algunos campos (PATCH).
// Página: llamadoCompleto/actualizar.html, servida por el servidor del proyecto.
// Toda la solicitud y la presentación del resultado están en este archivo.

async function actualizarMateria(evento) {
  // Evitar que el formulario recargue la página al enviarse.
  evento.preventDefault();

  const mensajeEstado = document.querySelector("#estado");
  const boton = document.querySelector("#enviar");
  const cuerpoTabla = document.querySelector("#resultado-body");
  cuerpoTabla.replaceChildren();
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
    const cambios = {};
    // Solo agregamos los campos marcados. Así PATCH conserva los demás.
    if (document.querySelector("#cambiar-nombre").checked) {
      cambios.nombre = document.querySelector("#nombre").value.trim();
    }
    if (document.querySelector("#cambiar-codigo").checked) {
      cambios.codigo = document.querySelector("#codigo").value.trim();
    }
    if (document.querySelector("#cambiar-color").checked) {
      cambios.color = document.querySelector("#color").value;
    }
    if (document.querySelector("#cambiar-creditos").checked) {
      const valor = document.querySelector("#creditos").value;
      cambios.creditos = valor === "" ? null : Number(valor);
    }
    if (document.querySelector("#cambiar-activa").checked) {
      cambios.activa = document.querySelector("#activa").value === "true";
    }
    if (Object.keys(cambios).length === 0) {
      throw new Error("Marca al menos un campo para actualizar.");
    }

    // 3. Construir la URL con el ID en la ruta.
    const url = `${endpoint}/${idMateria}`;
    console.log("URL de la solicitud:", url);
    console.log("Datos enviados:", cambios);

    // 4. Enviar la petición PATCH y esperar la respuesta con await.
    // Content-Type describe el cuerpo; Accept indica la respuesta esperada.
    // JSON.stringify convierte nuestro objeto en texto JSON.
    const respuesta = await fetch(url, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(cambios)
    });

    // 5. Leer el cuerpo JSON y convertirlo en un objeto JavaScript.
    const resultado = await respuesta.json();

    // 6. Comprobar el estado HTTP y los errores reportados por el API.
    // respuesta.ok es true para estados HTTP entre 200 y 299.
    if (!respuesta.ok || resultado.success === false) {
      throw new Error(resultado.error?.message
        || `La solicitud falló con el estado HTTP ${respuesta.status}`);
    }

    // 7. Extraer la materia que devuelve el backend.
    const materia = resultado.data;
    console.log("Materia recibida:", materia);

    // 8. Crear una fila y mostrar cada dato como texto en la tabla.
    const fila = document.createElement("tr");
    const valores = [
      materia.id, materia.nombre, materia.codigo, materia.color,
      materia.creditos ?? "Sin asignar", materia.activa ? "Activa" : "Inactiva"
    ];
    for (const valor of valores) {
      const celda = document.createElement("td");
      celda.textContent = valor;
      fila.append(celda);
    }
    cuerpoTabla.append(fila);
    mensajeEstado.textContent = `HTTP ${respuesta.status} · Cambios guardados.`;
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

// 10. Ejecutar la función al enviar el formulario; abrir la página no envía la operación.
document.querySelector("#formulario-materia").addEventListener("submit", actualizarMateria);

