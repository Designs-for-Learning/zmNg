/**
 * Authentication API
 * 
 * Handles login, token refresh, and version checking against the ZoneMinder API.
 * Uses the configured API client for requests.
 */

import { getApiClient } from './client';
import type { LoginResponse } from './types';
import { LoginResponseSchema } from './types';
import { log } from '../lib/logger';

export interface LoginCredentials {
  user: string;
  pass: string;
}

export interface LoginWithRefreshToken {
  token: string;
}

/**
 * Login to ZoneMinder with username and password.
 * 
 * Sends a POST request to /host/login.json with form-encoded credentials.
 * Validates the response using Zod schema.
 * 
 * @param credentials - Object containing username and password
 * @returns Promise resolving to LoginResponse containing tokens and version info
 * @throws Error if login fails or response validation fails
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  log.auth('Login attempt', { username: credentials.user });

  const client = getApiClient();

  // ZoneMinder expects form-encoded data for login
  const formData = new URLSearchParams();
  formData.append('user', credentials.user);
  formData.append('pass', credentials.pass);

  const formDataString = formData.toString();
  log.debug('Login form data prepared', { component: 'Auth API' });

  try {
    const response = await client.post<LoginResponse>('/host/login.json', formDataString, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    log.auth('Login response received', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
    });

    // Validate response with Zod
    try {
      const validated = LoginResponseSchema.parse(response.data);
      log.auth('Response validation successful');
      return validated;
    } catch (zodError: unknown) {
      log.error('Zod validation failed for login response', { component: 'Auth API' }, zodError, {
        expectedFields: 'access_token, access_token_expires, refresh_token, refresh_token_expires',
        receivedData: response.data,
        zodError: (zodError as Error).message,
      });
      throw zodError;
    }
  } catch (error: unknown) {
    const err = error as { constructor: { name: string }; message: string; response?: { status: number; data: unknown } };
    log.error('Login failed', { component: 'Auth API' }, error, {
      errorType: err.constructor.name,
      message: err.message,
      status: err.response?.status,
      responseData: err.response?.data,
    });

    throw error;
  }
}

/**
 * Refresh access token using refresh token.
 * 
 * Sends a POST request to /host/login.json with the refresh token.
 * 
 * @param refreshToken - The refresh token obtained from previous login
 * @returns Promise resolving to LoginResponse with new tokens
 */
export async function refreshToken(refreshToken: string): Promise<LoginResponse> {
  const client = getApiClient();

  // Use form-encoded data for consistency
  const formData = new URLSearchParams();
  formData.append('token', refreshToken);

  const response = await client.post<LoginResponse>('/host/login.json', formData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  // Validate response with Zod
  const validated = LoginResponseSchema.parse(response.data);
  return validated;
}

/**
 * Get API version.
 * 
 * Fetches version information from /host/getVersion.json.
 * 
 * @returns Promise resolving to object with version and apiversion strings
 */
export async function getVersion(): Promise<{ version: string; apiversion: string }> {
  const client = getApiClient();
  const response = await client.get('/host/getVersion.json');
  return response.data;
}

/**
 * Test if API is reachable and working.
 * 
 * Attempts to fetch version info from the specified API URL.
 * Useful for validating server connection during setup.
 * 
 * @param apiUrl - The base API URL to test
 * @returns Promise resolving to true if connection successful, false otherwise
 */
export async function testConnection(apiUrl: string): Promise<boolean> {
  try {
    const client = getApiClient();
    await client.get('/host/getVersion.json', { baseURL: apiUrl });
    return true;
  } catch (error) {
    log.warn('Connection test failed', { component: 'Auth API', apiUrl }, error);
    return false;
  }
}
