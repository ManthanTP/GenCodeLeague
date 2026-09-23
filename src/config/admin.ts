/**
 * GCL Admin Configuration
 *
 * The admin secret route is an additional obscurity layer.
 * After reaching the route, full Supabase admin authentication is still required.
 *
 * To change the secret path, update the value below and rebuild.
 * This is NOT a VITE_ env variable to avoid client-side exposure in import.meta.env.
 */

/** The secret URL path segment for accessing the admin login page. */
export const ADMIN_SECRET_PATH = '123456789/GCL-admin';

/**
 * Build the full admin login route path.
 * Example: /123456789/GCL@admin
 */
export function getAdminLoginPath(): string {
  return `/${ADMIN_SECRET_PATH}`;
}

/**
 * Build the admin console base path (after authentication).
 * The console itself stays at /admin/* for simplicity after auth.
 */
export const ADMIN_CONSOLE_BASE = '/admin';
