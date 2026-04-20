/**
 * Shared API Client
 * Infrastructure layer - HTTP client for all API requests
 */

import { createLogger } from './logger';
import { API_CONFIG } from './config';
import { useAuth } from '@/features/auth/model/store';

const logger = createLogger('API');

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestConfig {
  method?: Method;
  body?: unknown;
  params?: Record<string, unknown>;
  headers?: HeadersInit;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.baseURL) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return useAuth.getState().token;
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  private async request<T>(path: string, config: RequestConfig = {}): Promise<T> {
    const { method = 'GET', body, params, headers = {} } = config;
    const url = this.buildUrl(path, params);
    const token = this.getToken();

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      logger.error('API request failed', {
        path,
        method,
        status: response.status,
        statusText: response.statusText,
        error: error.message || error || 'Request failed',
        errorDetails: error,
      });

      // Token expired or invalid — clear auth state and redirect to login
      if (response.status === 401) {
        useAuth.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.replace('/login');
        }
      }

      // Extract a clean human-readable message from the API error body.
      // API may use 'error', 'message', or 'errors' fields.
      const extractApiMessage = (body: Record<string, unknown>): string | null => {
        if (typeof body.message === 'string' && body.message) return body.message;
        if (typeof body.error === 'string' && body.error) return body.error;
        if (typeof body.errors === 'string' && body.errors) return body.errors;
        return null;
      };

      const errorMessage =
        extractApiMessage(error) ||
        `An error occurred. Please try again.`;
      const apiError = new Error(errorMessage) as Error & { status?: number; data?: unknown };
      apiError.status = response.status;
      apiError.data = error;
      throw apiError;
    }

    // Handle blob responses
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/octet-stream') || contentType?.includes('text/csv')) {
      const blobData = response.blob() as unknown as T;
      logger.info('API request successful', {
        path,
        method,
        status: response.status,
        statusText: response.statusText,
        contentType,
        responseType: 'blob',
        responseSize: 'N/A (blob data)',
      });
      return blobData;
    }

    const jsonData = await response.json();
    logger.info('API request successful', {
      path,
      method,
      status: response.status,
      statusText: response.statusText,
      contentType,
      responseType: 'json',
      responseData: jsonData,
    });
    return jsonData;
  }

  get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  post<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, params });
  }

  put<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, params });
  }

  patch<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body, params });
  }

  delete<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', params });
  }
}

export const api = new ApiClient();

