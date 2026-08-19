/**
 * Decide whether a room alias is the unabbreviated spelling of that room's
 * code (#875).
 *
 * The 2026-08-04 duplicate merge folded readable room names into aliases:
 * room `DSDS MLH` now carries the alias `DSDS Main Lecture Hall`. That alias is
 * the room's `full_name`; an alias like `DSDS-MLH` is only a spelling variant
 * and must not be promoted.
 *
 * A candidate qualifies when every token of the code is accounted for by the
 * alias, in order, and at least one token is genuinely expanded:
 *   - exact word match            DSDS  -> DSDS
 *   - prefix of a longer word     PHYSIO -> Physiology       (expansion)
 *   - initials of consecutive words  MLH -> Main Lecture Hall (expansion)
 * Alias words the code does not mention are allowed ("Animal Physiology
 * Lecture Room" for `PHYSIO LR`), because the readable name is usually the
 * longer one.
 */

const MIN_PREFIX = 3;

function words(value: string): string[] {
	return value
		.toUpperCase()
		.split(/[^A-Z0-9]+/)
		.filter(Boolean);
}

function squash(value: string): string {
	return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Does `token` spell the initials of the `count` alias words at `start`? */
function isAcronymOf(token: string, alias: string[], start: number): boolean {
	if (token.length < 2) return false;
	if (start + token.length > alias.length) return false;
	for (let i = 0; i < token.length; i += 1) {
		if (alias[start + i]?.[0] !== token[i]) return false;
	}
	return true;
}

export function isRoomCodeExpansion(code: string, alias: string): boolean {
	const codeTokens = words(code);
	const aliasWords = words(alias);
	if (codeTokens.length === 0 || aliasWords.length === 0) return false;

	// Same letters modulo punctuation/case is a spelling variant, not a name.
	if (squash(code) === squash(alias)) return false;

	let cursor = 0;
	let expanded = false;

	for (const token of codeTokens) {
		let matchedAt = -1;
		let consumed = 1;

		for (let i = cursor; i < aliasWords.length; i += 1) {
			const word = aliasWords[i] as string;
			if (word === token) {
				matchedAt = i;
				break;
			}
			if (token.length >= MIN_PREFIX && word.startsWith(token)) {
				matchedAt = i;
				expanded = true;
				break;
			}
			if (isAcronymOf(token, aliasWords, i)) {
				matchedAt = i;
				consumed = token.length;
				expanded = true;
				break;
			}
		}

		if (matchedAt === -1) return false;
		cursor = matchedAt + consumed;
	}

	return expanded;
}

/**
 * The best unabbreviated name among a room's aliases, or null when none of
 * them expands the code. Ties break to the longest alias, which carries the
 * most words spelled out.
 */
export function pickRoomFullName(code: string, aliases: string[]): string | null {
	const expansions = aliases
		.filter((alias) => isRoomCodeExpansion(code, alias))
		.sort((a, b) => b.length - a.length);
	return expansions[0] ?? null;
}
