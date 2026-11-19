export function notFoundHandler(request, response) {
  return response.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: 'La ruta solicitada no existe.' },
  });
}

export function errorHandler(error, _request, response, _next) {
  const isJsonSyntaxError =
    error instanceof SyntaxError && error.status === 400 && 'body' in error;

  if (isJsonSyntaxError) {
    return response.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'El cuerpo JSON enviado no es válido.' },
    });
  }

  const databaseErrors = {
    ER_NO_REFERENCED_ROW_2: [422, 'RELATED_RECORD_NOT_FOUND', 'El cliente o producto indicado no existe.'],
    ER_ROW_IS_REFERENCED_2: [409, 'RECORD_IN_USE', 'El registro tiene información relacionada.'],
    ER_CHECK_CONSTRAINT_VIOLATED: [422, 'CONSTRAINT_VIOLATION', 'Los datos no cumplen las restricciones.'],
    ER_DUP_ENTRY: [409, 'DUPLICATE_RECORD', 'El registro ya existe.'],
  };

  if (databaseErrors[error.code]) {
    const [statusCode, code, message] = databaseErrors[error.code];
    return response.status(statusCode).json({ success: false, error: { code, message } });
  }

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = statusCode >= 500 ? 'Error interno del servidor.' : error.message;

  if (statusCode >= 500) console.error('Error no controlado:', error);
  return response.status(statusCode).json({ success: false, error: { code, message } });
}
