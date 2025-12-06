/**
 * Time API
 *
 * Handles fetching server time configuration.
 */

import { getApiClient } from './client';
import { HostTimeZoneResponseSchema } from './types';
import { log } from '../lib/logger';

/**
 * Get server time zone.
 * 
 * @param token - Optional auth token to use for the request (overrides store)
 * @returns Promise resolving to time zone string (e.g., "America/New_York")
 */
export async function getServerTimeZone(token?: string): Promise<string> {
    const client = getApiClient();
    try {
        const config = token ? { params: { token } } : {};
        const response = await client.get<unknown>('/host/getTimeZone.json', config);
        const validated = HostTimeZoneResponseSchema.parse(response.data);
        return validated.DateTime.TimeZone;
    } catch (error) {
        if (error && typeof error === 'object' && 'response' in error) {
            // Log API error details if available
            log.error('getServerTimeZone API Error', { component: 'API', responseData: (error as any).response?.data }, error);
        } else {
            // Log validation or other errors
            log.error('getServerTimeZone Validation Error', { component: 'API' }, error);
        }
        throw error;
    }
}
