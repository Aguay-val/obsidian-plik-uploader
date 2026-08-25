import { describe, expect, it } from 'vitest';
import { TTL_LABELS, TTL_SECONDS } from '../src/ttl';

describe('TTL_SECONDS', () => {
	it('mappe chaque option sur la durée attendue en secondes', () => {
		expect(TTL_SECONDS.day).toBe(86_400);
		expect(TTL_SECONDS.week).toBe(604_800);
		expect(TTL_SECONDS.month).toBe(2_592_000);
		expect(TTL_SECONDS.never).toBe(0);
	});
});

describe('TTL_LABELS', () => {
	it('fournit un libellé français pour chaque option', () => {
		expect(Object.keys(TTL_LABELS).sort()).toEqual(['day', 'month', 'never', 'week']);
	});
});
