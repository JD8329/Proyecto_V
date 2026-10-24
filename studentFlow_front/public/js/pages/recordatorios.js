import {
  actualizarRecordatorio,
  crearRecordatorio,
  eliminarRecordatorio,
  listarRecordatorios,
  listarTareasRecordatorio,
  obtenerRecordatorio
} from "../api/recordatorios.js";

const tableBody = document.querySelector("#recordatorios");
const status = document.querySelector("#estado");
const reminderForm = document.querySelector("#recordatorio-form");
const title = document.querySelector("#form-title");
const saveButton = document.querySelector("#save-recordatorio");
const cancelButton = document.querySelector("#cancel-edit");
const taskSelect = document.querySelector("#tareaId");
const taskStatus = document.querySelector("#tarea-status");
const filtersForm = document.querySelector("#filters-form");
const pageInfo = document.querySelector("#page-info");
const pageSize = 20;

let page = 1;
let pages = 1;
let editingId = null;
let tasksAvailable = false;

function setStatus(message, type = "") {
  status.textContent = message;
  status.dataset.type = type;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "";
  row.append(cell);
  return cell;
}

function makeAction(label, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", handler);
  return button;
}

function getFilters() {
  const formData = new FormData(filtersForm);
  const leido = formData.get("leido");
  return {
    page,
    limit: pageSize,
    search: String(formData.get("search") || "").trim(),
    ...(leido === "" ? {} : { leido })
  };
}

async function loadReminders() {
  setStatus("Consultando recordatorios…", "loading");
  tableBody.replaceChildren();
  try {
    const response = await listarRecordatorios(getFilters());
    const records = response.data;
    pages = Math.max(response.meta.pages, 1);
    if (page > pages) {
      page = pages;
      await loadReminders();
      return;
    }
    pageInfo.textContent = `Mostrando ${records.length} de ${response.meta.total} recordatorios. Página ${page} de ${pages}.`;
    document.querySelector("#previous-page").disabled = page <= 1;
    document.querySelector("#next-page").disabled = page >= pages;

    if (records.length === 0) {
      const row = document.createElement("tr");
      const cell = addCell(row, "No hay recordatorios para mostrar.");
      cell.colSpan = 7;
      tableBody.append(row);
    } else {
      for (const record of records) {
        const row = document.createElement("tr");
        addCell(row, record.id);
        addCell(row, `${record.tareaTitulo} · ${record.materiaNombre}`);
        addCell(row, record.mensaje);
        addCell(row, formatDateTime(record.fechaHora));
        addCell(row, record.canal === "in_app" ? "En la aplicación" : "Correo electrónico");
        addCell(row, record.leido ? "Sí" : "No");
        const actions = addCell(row, "");
        actions.classList.add("reminder-actions");
        actions.append(
          makeAction("Editar", "secondary", () => editReminder(record.id)),
          makeAction("Eliminar", "danger", () => deleteReminder(record.id))
        );
        tableBody.append(row);
      }
    }

    setStatus("Recordatorios consultados correctamente.", "success");
  } catch (error) {
    setStatus(error.message, "error");
    pageInfo.textContent = "";
  }
}

async function loadTasks() {
  try {
    const response = await listarTareasRecordatorio();
    tasksAvailable = response.data.length > 0;
    for (const task of response.data) {
      const option = document.createElement("option");
      option.value = task.id;
      option.textContent = `${task.titulo} · ${task.materiaNombre}${task.fechaEntrega ? ` · ${task.fechaEntrega}` : ""}`;
      taskSelect.append(option);
    }
    if (!tasksAvailable) {
      taskSelect.disabled = true;
      saveButton.disabled = true;
      taskStatus.textContent = "No tienes tareas disponibles para asociar un recordatorio.";
      setStatus("No tienes tareas disponibles para asociar un recordatorio.", "error");
    } else {
      taskStatus.textContent = "Solo se muestran tareas asociadas a tus materias.";
    }
  } catch (error) {
    taskSelect.disabled = true;
    saveButton.disabled = true;
    taskStatus.textContent = `No se pudieron consultar tus tareas: ${error.message}`;
    setStatus(`No se pudieron consultar tus tareas: ${error.message}`, "error");
  }
}

function resetForm() {
  editingId = null;
  reminderForm.reset();
  title.textContent = "Crear recordatorio";
  saveButton.textContent = "Crear recordatorio";
  cancelButton.hidden = true;
  taskSelect.disabled = false;
}

async function editReminder(id) {
  setStatus("Consultando recordatorio…", "loading");
  try {
    const response = await obtenerRecordatorio(id);
    const record = response.data;
    editingId = record.id;
    taskSelect.value = String(record.tareaId);
    document.querySelector("#mensaje").value = record.mensaje;
    document.querySelector("#fechaHora").value = record.fechaHora.replace(" ", "T").slice(0, 16);
    document.querySelector("#canal").value = record.canal;
    document.querySelector("#leido-form").checked = record.leido;
    title.textContent = `Actualizar recordatorio #${record.id}`;
    saveButton.textContent = "Guardar cambios";
    cancelButton.hidden = false;
    taskSelect.disabled = false;
    reminderForm.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus("Recordatorio listo para editar.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function deleteReminder(id) {
  if (!window.confirm(`¿Eliminar el recordatorio #${id}?`)) return;
  setStatus("Eliminando recordatorio…", "loading");
  try {
    await eliminarRecordatorio(id);
    if (editingId === id) resetForm();
    setStatus("Recordatorio eliminado correctamente.", "success");
    await loadReminders();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

filtersForm.addEventListener("submit", event => {
  event.preventDefault();
  page = 1;
  loadReminders();
});

document.querySelector("#refresh").addEventListener("click", loadReminders);
document.querySelector("#previous-page").addEventListener("click", () => {
  if (page > 1) {
    page -= 1;
    loadReminders();
  }
});
document.querySelector("#next-page").addEventListener("click", () => {
  if (page < pages) {
    page += 1;
    loadReminders();
  }
});
cancelButton.addEventListener("click", resetForm);

reminderForm.addEventListener("submit", async event => {
  event.preventDefault();
  const payload = {
    tareaId: Number(taskSelect.value),
    mensaje: document.querySelector("#mensaje").value,
    fechaHora: document.querySelector("#fechaHora").value,
    canal: document.querySelector("#canal").value,
    leido: document.querySelector("#leido-form").checked
  };

  if (!tasksAvailable) {
    setStatus("No tienes tareas disponibles para asociar un recordatorio.", "error");
    return;
  }

  const controls = [...reminderForm.querySelectorAll("button, input, select")];
  const previousDisabled = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  setStatus(editingId ? "Actualizando recordatorio…" : "Creando recordatorio…", "loading");
  try {
    if (editingId) {
      await actualizarRecordatorio(editingId, payload);
      setStatus("Recordatorio actualizado correctamente.", "success");
    } else {
      await crearRecordatorio(payload);
      setStatus("Recordatorio creado correctamente.", "success");
    }
    resetForm();
    page = 1;
    await loadReminders();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    controls.forEach((control, index) => { control.disabled = previousDisabled[index]; });
  }
});

await loadTasks();
await loadReminders();
