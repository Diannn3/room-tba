import { env } from '$env/dynamic/public';
const { PUBLIC_APP_ENV } = env;

export type AppEnv = 'staging' | 'production';

/** Testable without Astro env wiring. */
export function isStagingAppEnv(value: string | undefined): boolean {
	return value === 'staging';
}

export function isStagingApp(): boolean {
	return isStagingAppEnv(PUBLIC_APP_ENV);
}
