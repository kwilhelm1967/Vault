/**
 * Centralized API Client
 * 
 * Provides a consistent interface for all HTTP requests with:
 * - Request/response interceptors
 * - Automatic error handling
 * - Retry logic
 * - Request cancellation
 * - Type-safe responses
 */

import { devError, devLog } from "./devLog";
import environment from "../config/environment";

export interface ApiRequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
}

/**
 * Request interceptor type
 */
export type RequestInterceptor = (config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>;

/**
 * Response interceptor type
 */
export type ResponseInterceptor<T> = (response: Response) => Promise<T>;

/**
 * Error interceptor type
 */
export type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;

/**
 * Centralized API Client with interceptors and error handling
 */
class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: Map<string, ResponseInterceptor<unknown>> = new Map();
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (environment?.environment?.licenseServerUrl ?? "https://server.localpasswordvault.com");
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor for specific endpoint
   */
  addResponseInterceptor<T>(endpoint: string, interceptor: ResponseInterceptor<T>): void {
    this.responseInterceptors.set(endpoint, interceptor as ResponseInterceptor<unknown>);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Apply request interceptors
   */
  private async applyRequestInterceptors(config: ApiRequestConfig): Promise<ApiRequestConfig> {
    let processedConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    return processedConfig;
  }

  /**
   * Apply response interceptors
   */
  private async applyResponseInterceptors<T>(
    endpoint: string,
    response: Response
  ): Promise<T> {
    const interceptor = this.responseInterceptors.get(endpoint);
    if (interceptor) {
      return (await interceptor(response)) as T;
    }
    return response.json() as Promise<T>;
  }

  /**
   * Apply error interceptors
   */
  private async applyErrorInterceptors(error: ApiError): Promise<ApiError> {
    let processedError = { ...error };
    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError);
    }
    return processedError;
  }

  /**
   * Create timeout signal
   */
  private createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  /**
   * Execute HTTP request with retry logic
   */
  async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = 30000,
      retries = 0,
      signal: externalSignal,
    } = config;

    // Apply request interceptors
    const processedConfig = await this.applyRequestInterceptors({
      method,
      headers: { ...this.defaultHeaders, ...headers },
      body,
      timeout,
      retries,
      signal: externalSignal,
    });

    // Create timeout signal
    const timeoutSignal = this.createTimeoutSignal(processedConfig.timeout || timeout);
    const abortController = new AbortController();
    
    // Combine signals
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => abortController.abort());
    }
    timeoutSignal.addEventListener("abort", () => abortController.abort());

    const combinedSignal = abortController.signal;

    let lastError: ApiError | null = null;

    // Retry loop
    for (let attempt = 0; attempt <= (processedConfig.retries || 0); attempt++) {
      try {
        const requestBody = processedConfig.body
          ? JSON.stringify(processedConfig.body)
          : undefined;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: processedConfig.method,
          headers: processedConfig.headers,
          body: requestBody,
          signal: combinedSignal,
        });

        // Check if response is ok
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw {
            code: `HTTP_${response.status}`,
            message: errorData.message || response.statusText,
            status: response.status,
            details: errorData,
          } as ApiError;
        }

        // Apply response interceptors
        const data = await this.applyResponseInterceptors<T>(endpoint, response);

        return {
          data: data as T,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        };
      } catch (error) {
        // Handle abort
        if (error instanceof Error && error.name === "AbortError") {
          throw {
            code: "REQUEST_TIMEOUT",
            message: "Request timed out",
            details: error,
          } as ApiError;
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes("fetch")) {
          lastError = {
            code: "NETWORK_ERROR",
            message: "Network request failed",
            details: error,
          };
          
          // Don't retry on last attempt
          if (attempt < (processedConfig.retries || 0)) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        // Handle API errors
        if (error && typeof error === "object" && "code" in error) {
          lastError = error as ApiError;
          
          // Don't retry on client errors (4xx)
          if (lastError.status && lastError.status >= 400 && lastError.status < 500) {
            break;
          }
          
          // Retry on server errors (5xx)
          if (attempt < (processedConfig.retries || 0)) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        // Unknown error
        lastError = {
          code: "UNKNOWN_ERROR",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          details: error,
        };
        break;
      }
    }

    // Apply error interceptors
    const processedError = await this.applyErrorInterceptors(lastError!);
    throw processedError;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: Omit<ApiRequestConfig, "method" | "body">): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, config?: Omit<ApiRequestConfig, "method" | "body">): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "POST", body });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, config?: Omit<ApiRequestConfig, "method" | "body">): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "PUT", body });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: Omit<ApiRequestConfig, "method" | "body">): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, config?: Omit<ApiRequestConfig, "method" | "body">): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "PATCH", body });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export { ApiClient };

