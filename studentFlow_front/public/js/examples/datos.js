// Son payloads de ejemplo, no respuestas simuladas: las consultas usan el API real.
export const materiaEjemplo = {
  nombre: "Programación V",
  codigo: "PROG-V",
  color: "#2563EB",
  creditos: 3,
  activa: true
};

export const reemplazoEjemplo = {
  nombre: "Programación V - Actualizada",
  codigo: "PROG-V-2026B",
  color: "#7C3AED",
  creditos: 4,
  activa: true
};

export const cambiosEjemplo = { creditos: 5, activa: false };

export const filtrosEjemplo = {
  search: "",
  activa: true,
  page: 1,
  limit: 20,
  sort: "nombre",
  order: "asc"
};
