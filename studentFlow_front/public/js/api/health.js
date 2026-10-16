import { request } from "./http.js";

export function consultarEstado() {
  return request("/health");
}
