import { env } from '$env/dynamic/public';
const { PUBLIC_TURNSTILE_SITE_KEY } = env;

export function isTurnstileWidgetConfigured(): boolean {
	return Boolean(PUBLIC_TURNSTILE_SITE_KEY);
}

export function getTurnstileSiteKey(): string {
	if (!PUBLIC_TURNSTILE_SITE_KEY) {
		throw new Error('PUBLIC_TURNSTILE_SITE_KEY is not configured.');
	}
	return PUBLIC_TURNSTILE_SITE_KEY;
}
