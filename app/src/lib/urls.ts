/**
 * URL Derivation Utilities
 * 
 * Handles the complexities of ZoneMinder URL patterns and discovery.
 * ZoneMinder installations can vary widely in their path structure (e.g., /zm, /zoneminder, root).
 * These utilities help normalize and discover the correct API and CGI paths.
 */

export interface DerivedUrls {
  apiPatterns: string[];
  cgiPatterns: string[];
}

/**
 * Derive API and CGI URL patterns from a portal URL.
 *
 * ZoneMinder can be installed in various configurations:
 * - Root: http://server.com (API: /api or /zm/api, CGI: /cgi-bin or /zm/cgi-bin)
 * - Subpath: http://server.com/zm (API: /zm/api, CGI: /zm/cgi-bin)
 * - Custom: http://server.com/custom (API: /custom/api, CGI: /custom/cgi-bin)
 *
 * This function ALWAYS generates patterns for both HTTP and HTTPS, trying the
 * user-specified protocol first (or HTTPS if none specified), then the alternate.
 *
 * @param portalUrl - The base URL entered by the user
 * @returns Object containing arrays of potential API and CGI URLs
 * @deprecated Use `discoverZoneminder` from `discovery.ts` instead.
 */
export function deriveZoneminderUrls(portalUrl: string): DerivedUrls {
  const cleanUrl = portalUrl.replace(/\/$/, '');

  // Determine which scheme was specified (or default to https)
  const userSpecifiedHttp = cleanUrl.startsWith('http://');

  // Extract base URL without scheme
  const urlWithoutScheme = cleanUrl.replace(/^https?:\/\//, '');

  // Determine primary and alternate protocols
  const primaryScheme = userSpecifiedHttp ? 'http' : 'https';
  const alternateScheme = userSpecifiedHttp ? 'https' : 'http';

  const primaryBase = `${primaryScheme}://${urlWithoutScheme}`;
  const alternateBase = `${alternateScheme}://${urlWithoutScheme}`;

  // Generate API patterns - primary protocol first, then alternate
  const apiPatterns = [
    `${primaryBase}/api`,      // Most common
    `${primaryBase}/zm/api`,   // ZM in subpath
    `${alternateBase}/api`,    // Alternate protocol
    `${alternateBase}/zm/api`, // Alternate protocol with /zm
  ];

  // Generate CGI patterns for primary protocol
  const cgiPatterns: string[] = [];

  // Helper to add CGI patterns for a given base URL
  const addCgiPatterns = (baseUrl: string) => {
    if (baseUrl.endsWith('/zm')) {
      // If URL ends in /zm, assume user pointed to ZM root
      cgiPatterns.push(`${baseUrl}/cgi-bin`);
    } else {
      // If URL is root or custom path, try standard ZM paths
      cgiPatterns.push(`${baseUrl}/zm/cgi-bin`);
      cgiPatterns.push(`${baseUrl}/cgi-bin`);
    }
    // Add alternative CGI patterns
    cgiPatterns.push(`${baseUrl}/cgi-bin-zm`);
    cgiPatterns.push(`${baseUrl}/zmcgi`);
  };

  // Add patterns for primary protocol first, then alternate
  addCgiPatterns(primaryBase);
  addCgiPatterns(alternateBase);

  return {
    apiPatterns,
    cgiPatterns,
  };
}

/**
 * Try to discover working API URL from a list of patterns.
 * Returns the first pattern that responds successfully.
 *
 * @param patterns - Array of API URL patterns to try
 * @param testFn - Async function that tests if a URL works (should throw on failure)
 * @returns The first working URL, or null if none work
 */
export async function discoverApiUrl(
  patterns: string[],
  testFn: (url: string) => Promise<void>
): Promise<string | null> {
  for (const url of patterns) {
    try {
      await testFn(url);
      return url;
    } catch {
      // Continue to next pattern
      continue;
    }
  }
  return null;
}
