import { ejemplos } from "../examples/endpoints.js";

const form = document.querySelector("#endpoint-form");
const operacion = document.querySelector("#operacion");
const idInput = document.querySelector("#materia-id");
const datos = document.querySelector("#datos");
const ejecutar = document.querySelector("#ejecutar");
const estado = document.querySelector("#estado");
const resultado = document.querySelector("#resultado");

for (const [key, ejemplo] of Object.entries(ejemplos)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = `${ejemplo.metodo} · ${ejemplo.etiqueta}`;
  operacion.append(option);
}

function cargarEjemplo() {
  const ejemplo = ejemplos[operacion.value];
  document.querySelector("#ruta").textContent = `${ejemplo.metodo} /api/v1${ejemplo.ruta}`;
  document.querySelector("#descripcion").textContent = ejemplo.descripcion;
  document.querySelector("#id-group").hidden = !ejemplo.requiereId;
  idInput.required = Boolean(ejemplo.requiereId);
  idInput.disabled = !ejemplo.requiereId;
  document.querySelector("#body-group").hidden = !ejemplo.entrada;
  document.querySelector("#datos-label").textContent = ejemplo.entrada || "Datos JSON";
  datos.value = ejemplo.datos ? JSON.stringify(ejemplo.datos, null, 2) : "";
  ejecutar.classList.toggle("danger", operacion.value === "eliminar");
  ejecutar.textContent = ejemplo.metodo === "GET" ? "Ejecutar consulta" : ejemplo.etiqueta;
}

operacion.addEventListener("change", cargarEjemplo);
document.querySelector("#restablecer").addEventListener("click", cargarEjemplo);

form.addEventListener("submit", async event => {
  event.preventDefault();
  const seleccion = operacion.value;
  const ejemplo = ejemplos[seleccion];
  const id = idInput.value;
  let entrada;
  try {
    if (ejemplo.entrada) {
      entrada = JSON.parse(datos.value);
      if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
        throw new Error("Los datos deben ser un objeto JSON.");
      }
    }
  } catch (error) {
    estado.dataset.type = "error";
    estado.textContent = `Revisa el JSON: ${error.message}`;
    return;
  }

  if (seleccion === "eliminar" && !window.confirm(`¿Eliminar la materia con ID ${id}?`)) return;

  const controls = [...form.querySelectorAll("button, input, select, textarea")];
  const previousDisabled = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  estado.dataset.type = "loading";
  estado.textContent = "Consultando al servidor…";
  resultado.textContent = "Esperando respuesta…";

  try {
    const respuesta = await ejemplo.ejecutar(id, entrada);
    estado.dataset.type = "success";
    estado.textContent = respuesta === null
      ? "HTTP 204 · Materia eliminada correctamente."
      : seleccion === "crear" ? "HTTP 201 · Materia creada." : "HTTP 200 · Solicitud completada.";
    resultado.textContent = respuesta === null ? "Sin contenido (204)." : JSON.stringify(respuesta, null, 2);
    if (seleccion === "crear" && respuesta?.data?.id) idInput.value = respuesta.data.id;
    if (seleccion === "eliminar") idInput.value = "";
  } catch (error) {
    estado.dataset.type = "error";
    estado.textContent = error.message;
    resultado.textContent = JSON.stringify({
      status: error.status || 0,
      code: error.code || "CLIENT_ERROR",
      message: error.message
    }, null, 2);
  } finally {
    controls.forEach((control, index) => { control.disabled = previousDisabled[index]; });
  }
});

cargarEjemplo();
