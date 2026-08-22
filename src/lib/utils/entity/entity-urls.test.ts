import { describe, expect, it } from 'vitest';
import {
	getBuildingCanonicalPath,
	getDormCanonicalPath,
	getEntityCanonicalPath,
	getEventCanonicalPath,
	getOrganizationCanonicalPath,
	getOrganizationIndexPath,
	getPlaceCanonicalPath,
	getPlaceIndexPath,
	getRoomCanonicalPath,
	normalizePathname,
	parseEntityPathname,
	parseRouteSlug,
	resolveQueryFromEntityPath
} from './entity-urls';

describe('entity-urls', () => {
	it('normalizes pathnames with trailing slashes', () => {
		expect(normalizePathname('/map/rooms/foo/')).toBe('/map/rooms/foo/');
		expect(normalizePathname('/map/rooms/foo')).toBe('/map/rooms/foo/');
		expect(normalizePathname('/')).toBe('/');
	});

	it('parses entity pathnames', () => {
		expect(parseEntityPathname('/map/buildings/baker-hall/')).toEqual({
			category: 'building',
			slug: 'baker-hall'
		});
		expect(parseEntityPathname('/map/events/my-event/')).toEqual({
			category: 'event',
			slug: 'my-event'
		});
		expect(parseEntityPathname('/map/organizations/debate-society-7/')).toEqual({
			category: 'organization',
			slug: 'debate-society-7'
		});
		expect(parseEntityPathname('/map/establishments/but-first-coffee-8/')).toEqual({
			category: 'place',
			slug: 'but-first-coffee-8'
		});
		expect(parseEntityPathname('/changelog')).toBeNull();
	});

	it('parses route slugs with numeric ids', () => {
		expect(parseRouteSlug('baker-hall-42')).toEqual({
			nameSlug: 'baker-hall',
			id: 42
		});
		expect(parseRouteSlug('baker-hall')).toEqual({
			nameSlug: 'baker-hall',
			id: null
		});
	});

	it('builds canonical entity paths', () => {
		expect(getBuildingCanonicalPath('Baker Hall')).toBe('/map/buildings/baker-hall/');
		expect(getRoomCanonicalPath({ id: 12, code: 'ICS 260' })).toBe('/map/rooms/ics-260-12/');
		expect(getDormCanonicalPath({ id: 3, dormName: 'SJD' })).toBe('/map/dorms/sjd-3/');
		expect(getEventCanonicalPath('uplb-fair')).toBe('/map/events/uplb-fair/');
		expect(getOrganizationCanonicalPath({ id: 7, name: 'Debate Society' })).toBe(
			'/map/organizations/debate-society-7/'
		);
		expect(
			getOrganizationCanonicalPath({
				id: 7,
				name: 'Debate Society',
				category: 'student-org'
			})
		).toBe('/map/organizations/debate-society-7/');
		expect(
			getOrganizationCanonicalPath({
				id: 22,
				name: 'Postharvest Center',
				category: 'unit'
			})
		).toBe('/map/units/postharvest-center-22/');
		expect(
			getPlaceCanonicalPath({
				id: 8,
				name: 'But First Coffee',
				category: 'food'
			})
		).toBe('/map/establishments/but-first-coffee-8/');
	});

	// The browse indexes filter on the same split these helpers apply, so a row
	// must list under the index its own canonical URL points at.
	it('points a row at the index its canonical path belongs to', () => {
		expect(getOrganizationIndexPath({ category: 'student-org' })).toBe('/map/organizations/');
		expect(getOrganizationIndexPath({ category: 'publication' })).toBe('/map/organizations/');
		expect(getOrganizationIndexPath({ category: 'unit' })).toBe('/map/units/');
		expect(getOrganizationIndexPath({ category: 'office' })).toBe('/map/units/');
		// An unset/unknown category falls back to the student side, matching
		// getOrganizationCanonicalPath.
		expect(getOrganizationIndexPath({})).toBe('/map/organizations/');

		expect(getPlaceIndexPath({ category: 'landmark' })).toBe('/map/landmarks/');
		expect(getPlaceIndexPath({ category: 'tourist-spot' })).toBe('/map/landmarks/');
		expect(getPlaceIndexPath({ category: 'food' })).toBe('/map/establishments/');
		expect(getPlaceIndexPath({ category: 'service' })).toBe('/map/establishments/');
	});

	it('resolves query state from entity paths when app data is available', () => {
		const resolved = resolveQueryFromEntityPath(
			{ category: 'building', slug: 'baker-hall' },
			{
				buildings: [
					{
						id: 1,
						buildingName: 'Baker Hall',
						lat: 14.16,
						lon: 121.24,
						directions: '',
						buildingType: 'non-admin',
						imageUrl: null,
						crFacilities: null,
						version: 1,
						updatedAt: ''
					}
				]
			}
		);

		expect(resolved).toEqual({
			type: 'result',
			category: 'building',
			value: 'Baker Hall'
		});
	});

	it('returns null for room paths without async room lookup', () => {
		expect(resolveQueryFromEntityPath({ category: 'room', slug: 'ics-260-12' }, {})).toBeNull();
	});

	it('resolves organizations and places by their stable URL id', () => {
		expect(
			resolveQueryFromEntityPath(
				{ category: 'organization', slug: 'debate-society-7' },
				{
					organizations: [{ id: 7, name: 'Debate Society' }] as never
				}
			)
		).toEqual({
			type: 'result',
			category: 'organization',
			value: 'Debate Society'
		});
		expect(
			resolveQueryFromEntityPath(
				{ category: 'place', slug: 'but-first-coffee-8' },
				{
					places: [{ id: 8, name: 'But First Coffee', category: 'food' }] as never
				}
			)
		).toEqual({ type: 'result', category: 'place', value: 'But First Coffee' });
	});

	it('builds paths from query state when entity context is present', () => {
		expect(
			getEntityCanonicalPath({
				type: 'result',
				category: 'building',
				value: 'Baker Hall'
			})
		).toBe('/map/buildings/baker-hall/');

		expect(
			getEntityCanonicalPath(
				{ type: 'result', category: 'room', value: 'ICS 260' },
				{ room: { id: 12, code: 'ICS 260' } }
			)
		).toBe('/map/rooms/ics-260-12/');

		expect(getEntityCanonicalPath({ type: 'query', category: null, value: '' })).toBeNull();
	});
});
