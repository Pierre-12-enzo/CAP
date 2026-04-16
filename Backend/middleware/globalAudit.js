// middleware/globalAudit.js
const AuditService = require('../services/auditService');

const globalAudit = (req, res, next) => {
  // Skip logging for registration routes (no user yet)
  const skipPaths = [
    '/health',
    '/favicon.ico',
    '/public',
    '/css',
    '/js',
    '/images',
    '/auth/register', // Skip all registration routes
    '/auth/check-email',
    '/auth/check-school',
    '/auth/plans',
    '/auth/forgot-password',
    '/auth/reset-password'
  ];
  
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Also skip if no user (unauthenticated requests)
  if (!req.user) {
    return next();
  }
  
  // Only log authenticated requests
  return AuditService.middleware(
    (req) => getActionName(req),
    {
      logBody: req.method !== 'GET',
      logParams: true,
      logQuery: true,
      logResponse: false,
      importance: 'medium',
      skip404: true
    }
  )(req, res, next);
};

module.exports = globalAudit;