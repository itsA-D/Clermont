/**
 * Centralized error handling middleware
 */
export function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Database errors
    if (err.code) {
        switch (err.code) {
            case '23505': // Unique violation
                return res.status(400).json({
                    error: 'Duplicate entry',
                    detail: err.detail
                });
            case '23503': // Foreign key violation
                return res.status(400).json({
                    error: 'Referenced record not found',
                    detail: err.detail
                });
            case '23514': // Check constraint violation
                return res.status(400).json({
                    error: 'Invalid data',
                    detail: err.detail
                });
            default:
                return res.status(500).json({
                    error: 'Database error',
                    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
                });
        }
    }

    // Custom application errors (e.g. 409 Conflict, 400 Bad Request)
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            error: err.name || 'Error',
            message: err.message
        });
    }

    // Default error
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req, res) {
    res.status(404).json({ error: 'Route not found' });
}
