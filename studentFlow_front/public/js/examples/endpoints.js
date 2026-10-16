import { consultarEstado } from "../api/health.js";
import {
  listarMaterias, obtenerMateria, crearMateria,
  reemplazarMateria, actualizarMateria, eliminarMateria
} from "../api/materias.js";
import {
  materiaEjemplo, reemplazoEjemplo, cambiosEjemplo, filtrosEjemplo
} from "./datos.js";

// Cada ejemplo se ejecuta únicamente cuando una página llama a ejecutar().
// Para operaciones por ID, usar uno devuelto por listarMaterias o crearMateria.
export const ejemplos = {
  health: {
    etiqueta: "Estado del servicio", metodo: "GET", ruta: "/health",
    descripcion: "Comprueba que el backend puede conectarse a MySQL.",
    ejecutar: () => consultarEstado()
  },
  listar: {
    etiqueta: "Listar materias", metodo: "GET", ruta: "/materias",
    descripcion: "Consulta con filtros, ordenamiento y paginación. Elimina activa para incluir ambos estados.",
    entrada: "Filtros (JSON)", datos: filtrosEjemplo,
    ejecutar: (_id, filtros) => listarMaterias(filtros)
  },
  obtener: {
    etiqueta: "Consultar una materia", metodo: "GET", ruta: "/materias/:id", requiereId: true,
    descripcion: "Consulta una materia existente por su identificador.",
    ejecutar: id => obtenerMateria(id)
  },
  crear: {
    etiqueta: "Crear materia", metodo: "POST", ruta: "/materias",
    descripcion: "Crea una materia. Si repites el ejemplo, cambia el nombre y el código para evitar duplicados.",
    entrada: "Nueva materia (JSON)", datos: materiaEjemplo,
    ejecutar: (_id, datos) => crearMateria(datos)
  },
  reemplazar: {
    etiqueta: "Reemplazar materia", metodo: "PUT", ruta: "/materias/:id", requiereId: true,
    descripcion: "Reemplaza los datos de una materia existente con el objeto completo.",
    entrada: "Materia completa (JSON)", datos: reemplazoEjemplo,
    ejecutar: (id, datos) => reemplazarMateria(id, datos)
  },
  actualizar: {
    etiqueta: "Actualizar algunos campos", metodo: "PATCH", ruta: "/materias/:id", requiereId: true,
    descripcion: "Modifica únicamente los campos enviados. Este ejemplo desactiva la materia y cambia sus créditos.",
    entrada: "Cambios (JSON)", datos: cambiosEjemplo,
    ejecutar: (id, datos) => actualizarMateria(id, datos)
  },
  eliminar: {
    etiqueta: "Eliminar materia", metodo: "DELETE", ruta: "/materias/:id", requiereId: true,
    descripcion: "Elimina de la base de datos la materia indicada. Una respuesta 204 no contiene JSON.",
    ejecutar: id => eliminarMateria(id)
  }
};
