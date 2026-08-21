/** Admin access for the standalone web functions. Browser clients never see
 * the service-role credential; number-account ownership is enforced in the
 * web-auth and web-folders modules. */

import { createClient } from 'npm:@supabase/supabase-js@2.95.3';

export function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, serviceRoleKey);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
