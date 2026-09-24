// middleware/errorHandler.js

const CLIENT_PG_CODES = new Set([
  '23502', // not_null_violation
  '23503', // foreign_key_violation
  '23505', // unique_violation
  '22P02'  // invalid_text_representation
]);

/**
 * Send a JSON error response. Client errors keep their message.
 * PostgreSQL constraint failures become a generic 400.
 * Everything else is logged and returned as 500 without the internal message.
 * @param {Error & { status?: number, statusCode?: number, code?: string }} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number(err.status || err.statusCode);

  if (status >= 400 && status < 500) {
    return res.status(status).json({
      error: err.message || 'Bad request'
    });
  }

  if (typeof err.code === 'string' && CLIENT_PG_CODES.has(err.code)) {
    console.error('Database error:', err);
    return res.status(400).json({
      error: 'Invalid data'
    });
  }

  console.error('Error:', err);
  const serverStatus = status >= 500 ? status : 500;
  res.status(serverStatus).json({
    error: 'Internal Server Error'
  });
}

/**
 * Respond when no route matched.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
