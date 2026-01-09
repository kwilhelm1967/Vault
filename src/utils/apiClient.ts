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
    this.baseUrl = baseUrl || (environment?.environment?.licenseServerUrl ?? "https://api.localpasswordvault.com");
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
      retries = 2, // Default to 2 retries for network resilience
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
    const fullUrl = `${this.baseUrl}${endpoint}`;
    
    for (let attempt = 0; attempt <= (processedConfig.retries || 0); attempt++) {
      try {
        const requestBody = processedConfig.body
          ? JSON.stringify(processedConfig.body)
          : undefined;
        
        // Try Electron's native HTTP request first (bypasses all browser restrictions)
        // Only use Electron API if it's actually available (not in test environment)
        let response;
        const hasElectronAPI = typeof window !== 'undefined' && 
                               window.electronAPI && 
                               typeof window.electronAPI.httpRequest === 'function';
        
        if (hasElectronAPI) {
          try {
            // Log request for debugging
            console.log('[API Client] Making request:', {
              url: fullUrl,
              method: processedConfig.method || 'POST',
              endpoint: endpoint,
            });
            
            const electronResponse = await window.electronAPI.httpRequest(fullUrl, {
              method: processedConfig.method,
              headers: processedConfig.headers,
              body: requestBody,
            });
            
            if (!electronResponse.ok) {
              const errorData = electronResponse.data || {};
              const errorMessage = errorData.error || errorData.message || `HTTP ${electronResponse.status}: ${electronResponse.statusText}`;
              
              // Log HTTP error for debugging
              console.error('[API Client] HTTP Error Response:', {
                url: fullUrl,
                method: processedConfig.method || 'POST',
                status: electronResponse.status,
                statusText: electronResponse.statusText,
                responseBody: errorData,
              });
              
              throw {
                code: 'HTTP_ERROR',
                message: errorMessage,
                status: electronResponse.status,
                details: errorData,
                url: fullUrl,
              };
            }
            
            // Use Electron response directly - it already has the data
            const data = electronResponse.data || await electronResponse.json();
            return {
              data: data as T,
              status: electronResponse.status,
              statusText: electronResponse.statusText,
              headers: new Headers(),
            };
          } catch (electronError: any) {
            // Enhanced error logging for diagnosis
            const errorDetails = {
              url: fullUrl,
              method: processedConfig.method || 'GET',
              errorCode: electronError.code,
              errorMessage: electronError.message,
              errorStatus: electronError.status,
              errorDetails: electronError.details || electronError,
            };
            
            devError('[API Client] Electron HTTP request failed:', errorDetails);
            
            // Log to console for debugging (visible in DevTools)
            console.error('[API Client] Request Failed:', errorDetails);
            
            // Log to production logs if available
            if (typeof window !== 'undefined' && window.electronAPI) {
              try {
                // Use console.error which electron-log will capture
                console.error('[API Client] Activation Request Failed:', errorDetails);
              } catch (logError) {
                // Ignore logging errors
              }
            }
            
            // Don't fall back to fetch - throw the error so it's handled properly
            throw {
              code: electronError.code || 'NETWORK_ERROR',
              message: electronError.message || 'Unable to connect to license server. Please check your internet connection and try again.',
              status: electronError.status,
              details: electronError,
              url: fullUrl,
            };
          }
        } else {
          // Use regular fetch if Electron API not available (e.g., in tests or browser)
          response = await fetch(fullUrl, {
            method: processedConfig.method,
            headers: processedConfig.headers,
            body: requestBody,
            signal: combinedSignal,
            mode: 'cors',
            credentials: 'omit',
          });
        }

        // Check if response is ok
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || response.statusText;
          
          // Log HTTP error for debugging
          console.error('[API Client] HTTP Error Response:', {
            url: fullUrl,
            method: processedConfig.method || 'POST',
            status: response.status,
            statusText: response.statusText,
            responseBody: errorData,
          });
          
          throw {
            code: `HTTP_${response.status}`,
            message: errorMessage,
            status: response.status,
            details: errorData,
            url: fullUrl,
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
            message: `Network request failed: ${error.message}. URL: ${this.baseUrl}${endpoint}`,
            details: error,
          };
          
          // Retry network errors with exponential backoff
          if (attempt < (processedConfig.retries || 0)) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
            devLog(`[API Client] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${(processedConfig.retries || 0) + 1})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        // Handle API errors
        if (error && typeof error === "object" && "code" in error) {
          lastError = error as ApiError;
          
          // Don't retry on client errors (4xx) except for timeout/network errors
          if (lastError.status && lastError.status >= 400 && lastError.status < 500) {
            // But retry on timeout errors (408) and rate limiting (429)
            if (lastError.status === 408 || lastError.status === 429) {
              if (attempt < (processedConfig.retries || 0)) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                devLog(`[API Client] ${lastError.status} error, retrying in ${delay}ms (attempt ${attempt + 1}/${(processedConfig.retries || 0) + 1})`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }
            } else {
              break; // Don't retry other 4xx errors
            }
          }
          
          // Retry on server errors (5xx) and network errors
          if ((lastError.status && lastError.status >= 500) || 
              lastError.code === 'NETWORK_ERROR' || 
              lastError.code === 'REQUEST_TIMEOUT' ||
              lastError.code === 'REQUEST_ABORTED') {
            if (attempt < (processedConfig.retries || 0)) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
              devLog(`[API Client] ${lastError.code} error, retrying in ${delay}ms (attempt ${attempt + 1}/${(processedConfig.retries || 0) + 1})`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
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

