import { describe, expect, test } from 'vitest';
import {
	PLACE_CATEGORIES,
	isPlaceLandmark,
	normalizePlaceCategory,
	placeCategoryLabel,
	placeDirectoryLabel
} from './place.js';

describe('normalizePlaceCategory', () => {
	test('accepts known categories, case/space-insensitively', () => {
		expect(normalizePlaceCategory('food')).toBe('food');
		expect(normalizePlaceCategory(' Tourist-Spot ')).toBe('tourist-spot');
		expect(normalizePlaceCategory('SERVICE')).toBe('service');
	});

	test('rejects unknown/empty/non-string as null', () => {
		expect(normalizePlaceCategory('building')).toBeNull();
		expect(normalizePlaceCategory('')).toBeNull();
		expect(normalizePlaceCategory(null)).toBeNull();
		expect(normalizePlaceCategory(7)).toBeNull();
	});

	test('every listed category round-trips and has a label', () => {
		for (const c of PLACE_CATEGORIES) {
			expect(normalizePlaceCategory(c)).toBe(c);
			expect(placeCategoryLabel(c)).toBeTruthy();
		}
	});

	test('separates landmarks from services and establishments', () => {
		expect(isPlaceLandmark('landmark')).toBe(true);
		expect(isPlaceLandmark('tourist-spot')).toBe(true);
		expect(isPlaceLandmark('food')).toBe(false);
		expect(placeDirectoryLabel('landmark')).toBe('Landmark');
		expect(placeDirectoryLabel('food')).toBe('Service / establishment · Food');
	});
});
