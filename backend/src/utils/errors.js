export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const route = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);
