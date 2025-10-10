// Error classes
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export class LLMProviderError extends Error {
  constructor(message, provider = null) {
    super(message);
    this.name = 'LLMProviderError';
    this.statusCode = 502;
    this.provider = provider;
  }
}

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
    this.statusCode = 500;
  }
}

// Global error handler middleware
export function errorHandler(err, req, res, next) {
  console.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Default error response
  const errorResponse = {
    error: {
      message: err.message || 'Internal server error',
      type: err.name || 'Error'
    }
  };

  // Add details if available
  if (err.details) {
    errorResponse.error.details = err.details;
  }

  if (err.provider) {
    errorResponse.error.provider = err.provider;
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Don't expose internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    errorResponse.error.message = 'An unexpected error occurred';
    delete errorResponse.error.details;
  }

  res.status(statusCode).json(errorResponse);
}

// 404 handler
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      type: 'NotFoundError'
    }
  });
}

// Request validation middleware
export function validateRequestBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      next(new ValidationError('Invalid request body', error.errors));
    }
  };
}
