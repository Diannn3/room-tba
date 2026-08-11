/** Announcement severities (#777). varchar + allowlist, like place categories. */
export const ANNOUNCEMENT_SEVERITIES = ['info', 'warning', 'critical'] as const;

export type AnnouncementSeverity = (typeof ANNOUNCEMENT_SEVERITIES)[number];

const SEVERITY_SET = new Set<string>(ANNOUNCEMENT_SEVERITIES);

export const ANNOUNCEMENT_SEVERITY_LABELS: Record<AnnouncementSeverity, string> = {
	info: 'Info',
	warning: 'Heads up',
	critical: 'Critical'
};

export function normalizeAnnouncementSeverity(value: unknown): AnnouncementSeverity | null {
	if (typeof value !== 'string') return null;
	const v = value.trim().toLowerCase();
	return SEVERITY_SET.has(v) ? (v as AnnouncementSeverity) : null;
}
