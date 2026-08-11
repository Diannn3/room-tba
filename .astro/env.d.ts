declare module 'astro:env/client' {
	export const PUBLIC_SUPABASE_URL: string | undefined;	
	export const PUBLIC_SUPABASE_PUBLISHABLE_KEY: string | undefined;	
	export const PUBLIC_MAPTILER_KEY: string | undefined;	
	export const PUBLIC_APP_ENV: string;	
	export const PUBLIC_TURNSTILE_SITE_KEY: string | undefined;	
	export const DD_RUM_APPLICATION_ID: string | undefined;	
	export const DD_RUM_CLIENT_TOKEN: string | undefined;	
	export const DD_SITE: string;	
	export const DD_SERVICE: string;	
	export const DD_ENV: string | undefined;	
	export const DD_VERSION: string | undefined;	
}declare module 'astro:env/server' {
	export const DATABASE_URL: string;	
	export const KUBO_ROOM_TBA_DIRECTORY_URL: string | undefined;	
	export const ADMIN_PASSWORD: string | undefined;	
	export const PAYMONGO_SECRET_KEY: string | undefined;	
	export const ADMIN_SESSION_SECRET: string | undefined;	
	export const R2_ACCOUNT_ID: string | undefined;	
	export const R2_ACCESS_KEY_ID: string | undefined;	
	export const R2_SECRET_ACCESS_KEY: string | undefined;	
	export const R2_BUCKET_NAME: string | undefined;	
	export const R2_PUBLIC_URL: string | undefined;	
	export const NOTIFICATION_GATEWAY_URL: string | undefined;	
	export const NOTIFICATION_INGRESS_SECRET: string | undefined;	
	export const RESEND_API_KEY: string | undefined;	
	export const RESEND_FROM_EMAIL: string | undefined;	
	export const ANTHROPIC_API_KEY: string | undefined;	
	export const CRON_SECRET: string | undefined;	
	export const TURNSTILE_SECRET_KEY: string | undefined;	
	export const DD_API_KEY: string | undefined;	
	export const DD_OTLP_ENDPOINT: string | undefined;	
}