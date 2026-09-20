import {pool} from "..config/db.js";

const sortableFields = {
    id: "m.id_materia",
    nombre: "m.nombre",
    codidogo: "m.codigo",
    creditos: "m.creditos",
    color: "m.color",
    activa: "m.activa",
    createdAt: ".created_at",
}