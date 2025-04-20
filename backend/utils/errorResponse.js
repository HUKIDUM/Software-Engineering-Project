// Custom Error class for handling operational errors (e.g., user input errors)
class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;

        // Determine if the status code indicates a client error (4xx) or server error (5xx)
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        // Operational errors are expected errors, not programming bugs
        this.isOperational = true;

        // Capture the stack trace, excluding the constructor call
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ErrorResponse; 