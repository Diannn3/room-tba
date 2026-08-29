export const CONTRIBUTOR_BIO_MAX_LENGTH = 280;
export const CONTRIBUTOR_LINK_LABEL_MAX_LENGTH = 40;
export const CONTRIBUTOR_LINK_URL_MAX_LENGTH = 2048;

export const SOCIAL_KINDS = [
	'github',
	'website',
	'discord',
	'messenger',
	'linkedin',
	'custom'
] as const;

export type SocialKind = (typeof SOCIAL_KINDS)[number];

export type ContributorSocialLinkInput = {
	kind: SocialKind;
	label: string | null;
	url: string;
	isPublic: boolean;
};

export type ContributorSocialLink = ContributorSocialLinkInput & {
	id: number;
	createdAt: string;
	updatedAt: string;
};

export type SocialKindMetadata = {
	label: string;
	defaultPublic: boolean;
	requiresDisclosure: boolean;
};

export const SOCIAL_KIND_METADATA: Record<SocialKind, SocialKindMetadata> = {
	github: { label: 'GitHub', defaultPublic: true, requiresDisclosure: false },
	website: { label: 'Website', defaultPublic: true, requiresDisclosure: false },
	discord: { label: 'Discord', defaultPublic: false, requiresDisclosure: true },
	messenger: { label: 'Messenger', defaultPublic: false, requiresDisclosure: true },
	linkedin: { label: 'LinkedIn', defaultPublic: true, requiresDisclosure: false },
	custom: { label: 'Custom link', defaultPublic: true, requiresDisclosure: false }
};

const KIND_ORDER: Record<SocialKind, number> = {
	github: 0,
	website: 1,
	discord: 2,
	messenger: 3,
	linkedin: 4,
	custom: 5
};
const SOCIAL_LINK_KEYS: Record<string, true> = {
	kind: true,
	label: true,
	url: true,
	isPublic: true
};
const APPROVED_LINKEDIN_HOSTS: Record<string, true> = {
	'linkedin.com': true,
	'linkedin.cn': true
};
const APPROVED_DISCORD_HOSTS: Record<string, true> = {
	'discord.com': true,
	'discordapp.com': true
};

export class ContributorProfileValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContributorProfileValidationError';
	}
}
export function hasDisallowedControlCharacters(value: string, preserveLineBreaks = false): boolean {
	for (const character of value) {
		const code = character.codePointAt(0) ?? 0;
		if (code === 0x7f) return true;
		const allowedWhitespace = code === 0x09 || code === 0x0a || code === 0x0d;
		if (code < 0x20 && (!preserveLineBreaks || !allowedWhitespace)) return true;
	}
	return false;
}

export function isSocialKind(value: unknown): value is SocialKind {
	return typeof value === 'string' && (SOCIAL_KINDS as readonly string[]).includes(value);
}

export function socialKindLabel(kind: SocialKind): string {
	return SOCIAL_KIND_METADATA[kind].label;
}

export function socialLinkAccessibleLabel(
	link: Pick<ContributorSocialLinkInput, 'kind' | 'label'>
): string {
	const label = link.label?.trim();
	return label || socialKindLabel(link.kind);
}

export function normalizeHttpsUrl(value: unknown, field = 'URL'): string {
	if (typeof value !== 'string') {
		throw new ContributorProfileValidationError(`${field} must be a string.`);
	}
	const trimmed = value.trim();
	if (!trimmed) throw new ContributorProfileValidationError(`${field} is required.`);
	if (trimmed.length > CONTRIBUTOR_LINK_URL_MAX_LENGTH) {
		throw new ContributorProfileValidationError(`${field} is too long.`);
	}
	if (hasDisallowedControlCharacters(trimmed)) {
		throw new ContributorProfileValidationError(`${field} contains invalid characters.`);
	}

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		throw new ContributorProfileValidationError(`${field} must be a valid URL.`);
	}
	if (parsed.protocol !== 'https:') {
		throw new ContributorProfileValidationError(`${field} must use HTTPS.`);
	}
	if (parsed.username || parsed.password) {
		throw new ContributorProfileValidationError(`${field} cannot contain credentials.`);
	}
	if (parsed.hash) {
		throw new ContributorProfileValidationError(`${field} cannot contain a fragment.`);
	}
	parsed.hostname = parsed.hostname.toLowerCase();
	return parsed.toString();
}

function normalizeHost(host: string): string {
	return host.toLowerCase().replace(/^www\./u, '');
}

function supportedPath(pathname: string, pattern: RegExp): boolean {
	return pattern.test(pathname.replace(/\/$/u, ''));
}

export function validateSocialUrl(kind: SocialKind, value: unknown): string {
	const normalized = normalizeHttpsUrl(value, `${socialKindLabel(kind)} URL`);
	const parsed = new URL(normalized);
	const host = normalizeHost(parsed.hostname);
	const path = parsed.pathname;

	switch (kind) {
		case 'github':
			if (host !== 'github.com' || !supportedPath(path, /^\/[A-Za-z0-9][A-Za-z0-9-]{0,38}$/u)) {
				throw new ContributorProfileValidationError('GitHub URL must point to a GitHub profile.');
			}
			break;
		case 'linkedin':
