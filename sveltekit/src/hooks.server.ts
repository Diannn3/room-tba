import { sequence } from '@sveltejs/kit/hooks';
import { legacyEntityRedirects } from '$lib/legacy-entity-redirects';
import { supabaseHandle } from '$lib/supabase/session';

export const handle = sequence(legacyEntityRedirects, supabaseHandle);
