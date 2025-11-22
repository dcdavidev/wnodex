/**
 * Custom HTTP error class with status code.
 * Represents an HTTP error with both status code and message.
 */
export class HttpError extends Error {
  public readonly statusCode: number;

  /**
   * Creates an instance of HttpError.
   * @param message Error message describing the problem.
   * @param statusCode HTTP status code, default is 500.
   * @example
   * // Throws an error with 404 status code
   * throw new HttpError('Not Found', 404);
   */
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}
