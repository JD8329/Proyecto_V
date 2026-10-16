import { API_BASE_URL, API_TIMEOUT_MS } from "../config.js";

export class ApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK_ERROR" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// Conserva { success, data, meta } para que las páginas puedan paginar.
// DELETE responde 204 sin JSON: en ese caso se devuelve null.
export async function request(path, { method = "GET", query, body } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const suffix = params.size ? `?${params}` : "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}${suffix}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal
    });

    if (response.status === 204) return null;

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ApiError("El servidor no devolvió una respuesta JSON válida.", {
        status: response.status,
        code: "INVALID_RESPONSE"
      });
    }

    if (!response.ok || payload?.success === false) {
      throw new ApiError(payload?.error?.message || `Error HTTP ${response.status}.`, {
        status: response.status,
        code: payload?.error?.code || "HTTP_ERROR"
      });
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? "La solicitud tardó demasiado. Comprueba el estado del backend."
        : "No fue posible conectar con el servidor.",
      { code: controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR" }
    );
  } finally {
    clearTimeout(timer);
  }
}
