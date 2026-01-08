import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry for error tracking
 * 
 * Set SENTRY_DSN environment variable to enable
 */
export function initSentry(app?: any) {
  const SENTRY_DSN = process.env.SENTRY_DSN;
  const ENVIRONMENT = process.env.NODE_ENV || 'development';

  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Express integration (if app is provided)
      ...(app ? [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
      ] : []),
      
      // Profiling
      nodeProfilingIntegration(),
    ],

    // Filtering
    beforeSend(event, hint) {
      // Filter out non-error events in development
      if (ENVIRONMENT !== 'production' && event.level !== 'error') {
        return null;
      }
      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Network errors
      'NetworkError',
      'Network request failed',
      // Cancelled requests
      'AbortError',
      'The user aborted a request',
    ],
  });

  console.log(`Sentry initialized for ${ENVIRONMENT} environment`);
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture message with level
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: number; name?: string; role?: string }) {
  Sentry.setUser({
    id: user.id.toString(),
    username: user.name,
    role: user.role,
  });
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Express error handler middleware
 * Must be registered after all routes
 */
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all server errors
    return true;
  },
});

/**
 * Express request handler middleware
 * Must be registered before all routes
 */
export const sentryRequestHandler = Sentry.Handlers.requestHandler();

/**
 * Express tracing middleware
 * Must be registered before all routes
 */
export const sentryTracingHandler = Sentry.Handlers.tracingHandler();

export default Sentry;