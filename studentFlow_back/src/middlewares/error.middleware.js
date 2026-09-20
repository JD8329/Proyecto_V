export function notFoundHandler(_request, _response, next) {
  const error = new Error("Ruta no encontrada");
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  next(error);
}

export function errorHandler(error, _request, response, _next) {
  const isJsonSyntaxError = error instanceof SyntaxError && error.status === 400 && "body" in error;
  const statusCode = isJsonSyntaxError ? 400 : error.statusCode || 500;
  const code = isJsonSyntaxError
    ? "INVALID_JSON"
    : error.code || (statusCode === 404 ? "NOT_FOUND" : "INTERNAL_ERROR");
  const message = isJsonSyntaxError
    ? "El cuerpo JSON enviado no es válido."
    : error.message || "Error interno del servidor";

  response.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}