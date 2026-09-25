export function sendSuccess(response, data, statusCode = 200, meta) {
  const payload = {
    success: true,
    data
  };

  if (meta) {
    payload.meta = meta;
  }

  return response.status(statusCode).json(payload);
}

export function sendNoContent(response) {
  return response.status(204).send();
}