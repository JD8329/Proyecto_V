export function attachTemporaryUser(request, _response, next) {
  request.user = {
    id: 1
  };

  next();
}
