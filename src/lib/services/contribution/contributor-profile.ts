import { env } from '$env/dynamic/private';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/utils/db';
import {
	adminUsersTable,
	contributorProfileAuditsTable,
	contributorProfilesTable,
	contributorSocialLinksTable
} from '$lib/server/db/schema';
import { parseImageUrl } from '$lib/utils/r2-upload-core';
import {
	CONTRIBUTOR_BIO_MAX_LENGTH,
	CONTRIBUTOR_LINK_URL_MAX_LENGTH,
	SOCIAL_KIND_METADATA,
	hasDisallowedControlCharacters,
	hasPublicMessagingLink,
	normalizeSocialLinkInput,
	normalizeHttpsUrl,
	sortSocialLinks,
	validateSocialLinkMultiplicity,
	type ContributorSocialLinkInput,
	type SocialKind
} from '$lib/utils/contributor-profile';

export type ContributorRole = 'admin' | 'editor' | 'contributor';
export type ContributorRoleLabel = 'Admin' | 'Editor' | 'Contributor';
export type ContributorSocialLinkDTO = ContributorSocialLinkInput & {
	id: number;
	createdAt: string;
	updatedAt: string;
};
export type ContributorPublicSocialLink = { kind: SocialKind; label: string | null; url: string };
export type ContributorEditableProfile = {
	id: number;
	userId: number;
	slug: string;
	displayName: string;
	role: ContributorRoleLabel;
	bio: string;
	isPublic: boolean;
	isModeratorHidden: boolean;
	showInCredits: boolean;
	avatarUrl: string | null;
	version: number;
	updatedAt: string;
	socialLinks: ContributorSocialLinkDTO[];
};
export type ContributorPublicProfile = {
	slug: string;
	displayName: string;
	role: ContributorRoleLabel;
	bio: string;
	avatarUrl: string | null;
	socialLinks: ContributorPublicSocialLink[];
};
export type ContributorProfileUpdate = {
	version: number;
	bio: string;
	isPublic: boolean;
	showInCredits: boolean;
	messagingDisclosureAcknowledged: boolean;
	socialLinks: ContributorSocialLinkInput[];
};
export type ContributorProfileSnapshot = {
	slug: string;
	displayName: string;
	role: ContributorRoleLabel;
	bio: string;
	isPublic: boolean;
	isModeratorHidden: boolean;
	showInCredits: boolean;
	avatarUrl: string | null;
	moderationReason?: string;
	socialLinks: Array<{ kind: SocialKind; label: string | null; url: string; isPublic: boolean }>;
};
export type ContributorProfileAudit = {
	id: number;
	profileId: number;
	actorUserId: number | null;
	actorDisplayName: string | null;
	actorRole: ContributorRoleLabel | null;
	action: string;
	fromVersion: number | null;
	toVersion: number;
	before: ContributorProfileSnapshot | null;
	after: ContributorProfileSnapshot;
	createdAt: string;
};
export type ContributorAttribution = {
	name: string;
	avatarUrl: string | null;
	href: string | null;
};

export class ContributorProfileError extends Error {
	readonly status: number;
	readonly latestEditable: ContributorEditableProfile | null;
	constructor(
		message: string,
		status = 400,
		latestEditable: ContributorEditableProfile | null = null
	) {
		super(message);
		this.name = 'ContributorProfileError';
		this.status = status;
		this.latestEditable = latestEditable;
	}
}
export class ContributorProfileNotFoundError extends ContributorProfileError {
	constructor(message = 'Contributor profile not found.') {
		super(message, 404);
		this.name = 'ContributorProfileNotFoundError';
	}
}
export class ContributorProfileConflictError extends ContributorProfileError {
	constructor(latestEditable: ContributorEditableProfile) {
		super('Contributor profile changed on the server.', 409, latestEditable);
		this.name = 'ContributorProfileConflictError';
	}
}
export class ContributorProfileForbiddenError extends ContributorProfileError {
	constructor(message = 'You are not allowed to perform this action.') {
		super(message, 403);
		this.name = 'ContributorProfileForbiddenError';
	}
}

const MAX_SOCIAL_LINKS = 20;
const AUDIT_PAGE_SIZE = 50;
function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
function assertExactKeys(
	value: Record<string, unknown>,
	keys: readonly string[],
	label: string
): void {
	const allowed = new Set(keys);
	for (const key of Object.keys(value))
		if (!allowed.has(key))
			throw new ContributorProfileError(`${label} contains unknown field: ${key}.`);
}
/** Normalize account usernames into immutable public profile slugs. */
export function normalizeContributorSlug(value: unknown): string {
	if (typeof value !== 'string')
		throw new ContributorProfileError('Contributor slug must be a string.');
	const slug = value
		.normalize('NFKD')
		.trim()
		.toLowerCase()
