import { pool } from "../config/database.js";

const sortableFields = {
    id: "r.id_recordatorio",
    mensaje: "r.mensaje",
    fechaHora: "r.fecha_hora",
    canal: "r.canal",
    leido: "r.leido",
};

function normalizeSort(sort, order) {
    const column = Object.hasOwn(sortableFields, sort) ? sortableFields[sort] : sortableFields.fechaHora;
    const direction = String(order).toLowerCase() === "desc" ? "DESC" : "ASC";
    return `${column} ${direction}`;
}

const reminderSelect = `
    SELECT
        r.id_recordatorio AS id,
        r.id_tarea AS tareaId,
        t.titulo AS tareaTitulo,
        m.nombre AS materiaNombre,
        r.mensaje,
        DATE_FORMAT(r.fecha_hora, '%Y-%m-%dT%H:%i:%s') AS fechaHora,
        r.canal,
        r.leido,
        DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%s') AS createdAt
    FROM recordatorio r
    INNER JOIN tarea t ON t.id_tarea = r.id_tarea
    INNER JOIN materia m ON m.id_materia = t.id_materia`;

function mapRecordatorio(row) {
    return {
        id: row.id,
        tareaId: row.tareaId,
        tareaTitulo: row.tareaTitulo,
        materiaNombre: row.materiaNombre,
        mensaje: row.mensaje,
        fechaHora: row.fechaHora,
        canal: row.canal,
        leido: Boolean(row.leido),
        createdAt: row.createdAt,
    };
}

function reminderOwnershipCondition() {
    return `EXISTS (
        SELECT 1
        FROM tarea owner_task
        INNER JOIN materia owner_subject ON owner_subject.id_materia = owner_task.id_materia
        WHERE owner_task.id_tarea = r.id_tarea
          AND owner_subject.id_usuario = ?
    )`;
}

export async function findAllByUserId(userId, filters) {
    const conditions = ["m.id_usuario = ?"];
    const params = [userId];

    if (typeof filters.leido === "boolean") {
        conditions.push("r.leido = ?");
        params.push(filters.leido ? 1 : 0);
    }

    if (filters.search) {
        conditions.push("(r.mensaje LIKE ? OR t.titulo LIKE ? OR m.nombre LIKE ?)");
        const search = `%${filters.search}%`;
        params.push(search, search, search);
    }

    const fromWhere = `
        FROM recordatorio r
        INNER JOIN tarea t ON t.id_tarea = r.id_tarea
        INNER JOIN materia m ON m.id_materia = t.id_materia
        WHERE ${conditions.join(" AND ")}`;
    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total ${fromWhere}`,
        params
    );
    const orderBy = normalizeSort(filters.sort, filters.order);
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await pool.execute(
        `SELECT
            r.id_recordatorio AS id,
            r.id_tarea AS tareaId,
            t.titulo AS tareaTitulo,
            m.nombre AS materiaNombre,
            r.mensaje,
            DATE_FORMAT(r.fecha_hora, '%Y-%m-%dT%H:%i:%s') AS fechaHora,
            r.canal,
            r.leido,
            DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%s') AS createdAt
         ${fromWhere}
         ORDER BY ${orderBy}, r.id_recordatorio ASC
         LIMIT ? OFFSET ?`,
        [...params, filters.limit, offset]
    );

    return {
        recordatorios: rows.map(mapRecordatorio),
        total: countRows[0].total,
    };
}

export async function findByIdAndUserId(id, userId) {
    const [rows] = await pool.execute(
        `${reminderSelect}
         WHERE r.id_recordatorio = ? AND ${reminderOwnershipCondition()}`,
        [id, userId]
    );
    return rows[0] ? mapRecordatorio(rows[0]) : null;
}

export async function findTareasByUserId(userId) {
    const [rows] = await pool.execute(
        `SELECT
            t.id_tarea AS id,
            t.titulo,
            m.nombre AS materiaNombre,
            DATE_FORMAT(t.fecha_entrega, '%Y-%m-%d') AS fechaEntrega,
            TIME_FORMAT(t.hora_entrega, '%H:%i:%s') AS horaEntrega
         FROM tarea t
         INNER JOIN materia m ON m.id_materia = t.id_materia
         WHERE m.id_usuario = ?
         ORDER BY t.fecha_entrega ASC, t.hora_entrega ASC, t.id_tarea ASC`,
        [userId]
    );
    return rows;
}

export async function createRecordatorio(userId, recordatorio) {
    const [result] = await pool.execute(
        `INSERT INTO recordatorio (id_tarea, mensaje, fecha_hora, canal, leido)
         SELECT t.id_tarea, ?, ?, ?, ?
         FROM tarea t
         INNER JOIN materia m ON m.id_materia = t.id_materia
         WHERE t.id_tarea = ? AND m.id_usuario = ?`,
        [
            recordatorio.mensaje,
            recordatorio.fechaHora,
            recordatorio.canal,
            recordatorio.leido ? 1 : 0,
            recordatorio.tareaId,
            userId,
        ]
    );

    return result.affectedRows ? findByIdAndUserId(result.insertId, userId) : null;
}

export async function updateRecordatorio(id, userId, changes) {
    const fields = [];
    const params = [];

    if (changes.tareaId !== undefined) {
        fields.push("id_tarea = ?");
        params.push(changes.tareaId);
    }
    if (changes.mensaje !== undefined) {
        fields.push("mensaje = ?");
        params.push(changes.mensaje);
    }
    if (changes.fechaHora !== undefined) {
        fields.push("fecha_hora = ?");
        params.push(changes.fechaHora);
    }
    if (changes.canal !== undefined) {
        fields.push("canal = ?");
        params.push(changes.canal);
    }
    if (changes.leido !== undefined) {
        fields.push("leido = ?");
        params.push(changes.leido ? 1 : 0);
    }

    const ownership = changes.tareaId === undefined
        ? reminderOwnershipCondition()
        : `EXISTS (
            SELECT 1
            FROM tarea owner_task
            INNER JOIN materia owner_subject ON owner_subject.id_materia = owner_task.id_materia
            WHERE owner_task.id_tarea = r.id_tarea
              AND owner_subject.id_usuario = ?
        ) AND EXISTS (
            SELECT 1
            FROM tarea target_task
            INNER JOIN materia target_subject ON target_subject.id_materia = target_task.id_materia
            WHERE target_task.id_tarea = ?
              AND target_subject.id_usuario = ?
        )`;

    params.push(id, userId);
    if (changes.tareaId !== undefined) {
        params.push(changes.tareaId, userId);
    }

    await pool.execute(
        `UPDATE recordatorio r
         SET ${fields.join(", ")}
         WHERE r.id_recordatorio = ? AND ${ownership}`,
        params
    );

    return findByIdAndUserId(id, userId);
}

export async function deleteRecordatorio(id, userId) {
    const [result] = await pool.execute(
        `DELETE FROM recordatorio
         WHERE id_recordatorio = ?
           AND EXISTS (
               SELECT 1
               FROM tarea owner_task
               INNER JOIN materia owner_subject ON owner_subject.id_materia = owner_task.id_materia
               WHERE owner_task.id_tarea = recordatorio.id_tarea
                 AND owner_subject.id_usuario = ?
           )`,
        [id, userId]
    );
    return result.affectedRows > 0;
}
