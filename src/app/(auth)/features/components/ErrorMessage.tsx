// features/auth/components/ErrorMessage.tsx
import React, { memo, useMemo } from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';

export interface ErrorMessageProps {
  error: unknown;
  title?: string;
  severity?: 'error' | 'warning' | 'info';
  showDetails?: boolean;
  className?: string;
}

export const ErrorMessage = memo<ErrorMessageProps>(({
  error,
  title,
  severity = 'error',
  showDetails = false,
  className,
}) => {
  const { message, statusCode, type } = useMemo(() => parseError(error), [error]);

  const errorTitle = useMemo(() => {
    if (title) return title;

    switch (type) {
      case 'network':
        return 'Network Error';
      case 'server':
        return 'Server Error';
      case 'client':
        return 'Request Error';
      case 'authentication':
        return 'Authentication Failed';
      case 'authorization':
        return 'Access Denied';
      case 'validation':
        return 'Validation Error';
      case 'not_found':
        return 'Not Found';
      case 'rate_limit':
        return 'Too Many Requests';
      default:
        return 'Error';
    }
  }, [title, type]);

  const errorSeverity = useMemo(() => {
    if (severity) return severity;

    switch (type) {
      case 'network':
      case 'server':
        return 'error';
      case 'authentication':
      case 'authorization':
        return 'warning';
      case 'validation':
      case 'rate_limit':
        return 'info';
      default:
        return 'error';
    }
  }, [severity, type]);

  return (
    <Alert severity={errorSeverity} className={className} sx={{ width: '100%', mb: 2 }}>
      <AlertTitle>{errorTitle}</AlertTitle>
      {message}
      {showDetails && statusCode && (
        <Box sx={{ mt: 1, fontSize: '0.75rem', opacity: 0.7 }}>Status: {statusCode}</Box>
      )}
    </Alert>
  );
});

ErrorMessage.displayName = 'ErrorMessage';

// Helper function to parse different error formats
export const parseError = (
  error: unknown
): {
  message: string;
  statusCode?: number;
  type: string;
} => {
  if (!error) {
    return { message: 'An unknown error occurred', type: 'unknown' };
  }

  // Network errors
  const errorObj = error as Record<string, unknown>;
  if ((errorObj.message as string)?.includes('Network Error') || (errorObj.message as string)?.includes('Failed to fetch')) {
    return {
      message:
        'Unable to connect to the server. Please check your internet connection and try again.',
      type: 'network',
    };
  }

  // Axios-like errors
  if (errorObj.status || errorObj.code) {
    const status = Number(errorObj.status ?? errorObj.code);
    const data = (errorObj.data as Record<string, unknown>) || errorObj;

    // Extract the human-readable message — API may use 'error', 'message', or 'errors'
    const extractMessage = (d: Record<string, unknown>): string | undefined => {
      if (typeof d.message === 'string' && d.message) return d.message;
      if (typeof d.error === 'string' && d.error) return d.error;
      if (typeof d.errors === 'string' && d.errors) return d.errors;
      return undefined;
    };

    switch (status) {
      case 400:
        return {
          message: extractMessage(data) || 'Invalid request. Please check your input and try again.',
          statusCode: 400,
          type: 'validation',
        };
      case 401:
        return {
          message: extractMessage(data) ||
            'Authentication failed. Please check your credentials and try again.',
          statusCode: 401,
          type: 'authentication',
        };
      case 403:
        return {
          message: extractMessage(data) || 'You do not have permission to perform this action.',
          statusCode: 403,
          type: 'authorization',
        };
      case 404:
        return {
          message: extractMessage(data) || 'The requested resource was not found.',
          statusCode: 404,
          type: 'not_found',
        };
      case 409:
        return {
          message: extractMessage(data) || 'A conflict occurred. This resource may already exist.',
          statusCode: 409,
          type: 'validation',
        };
      case 422:
        return {
          message: extractMessage(data) || 'Validation failed. Please check your input.',
          statusCode: 422,
          type: 'validation',
        };
      case 429:
        return {
          message: extractMessage(data) || 'Too many requests. Please wait a moment and try again.',
          statusCode: 429,
          type: 'rate_limit',
        };
      case 500:
        return {
          message: extractMessage(data) || 'Internal server error. Please try again later.',
          statusCode: 500,
          type: 'server',
        };
      case 502:
      case 503:
      case 504:
        return {
          message: extractMessage(data) || 'Service temporarily unavailable. Please try again later.',
          statusCode: status,
          type: 'server',
        };
      default:
        return {
          message: extractMessage(data) || `An error occurred. Please try again.`,
          statusCode: status,
          type: 'server',
        };
    }
  }

  // Generic error with message — guard against raw JSON strings
  if (errorObj.message) {
    const msg = errorObj.message as string;
    // If the message looks like a raw JSON blob, don't show it directly
    if (msg.startsWith('{') || msg.startsWith('[')) {
      try {
        const parsed = JSON.parse(msg) as Record<string, unknown>;
        const readable = (parsed.error as string) || (parsed.message as string) || (parsed.errors as string);
        if (readable) return { message: readable, type: 'client' };
      } catch {
        // not valid JSON, fall through
      }
      return { message: 'An unexpected error occurred. Please try again.', type: 'client' };
    }
    return {
      message: msg,
      type: 'client',
    };
  }

  // String errors
  if (typeof error === 'string') {
    return {
      message: error,
      type: 'client',
    };
  }

  // Fallback for unknown error types
  return {
    message: 'An unexpected error occurred. Please try again.',
    type: 'unknown',
  };
};

// Hook for showing toast notifications based on error type
export const useErrorToast = () => {
  const showErrorToast = React.useCallback((error: unknown, options?: Record<string, unknown>) => {
    const { message, type } = parseError(error);

    // Using react-hot-toast (already in providers)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const toast = require('react-hot-toast');

    switch (type) {
      case 'network':
        toast.error(message, { duration: 7000, ...options });
        break;
      case 'authentication':
        toast(message, { icon: '⚠️', duration: 5000, ...options });
        break;
      case 'rate_limit':
        toast(message, { duration: 6000, icon: 'ℹ️', ...options });
        break;
      case 'validation':
        toast(message, { icon: '⚠️', duration: 5000, ...options });
        break;
      default:
        toast.error(message, { duration: 5000, ...options });
    }
  }, []);

  return { showErrorToast };
};

export default ErrorMessage;
