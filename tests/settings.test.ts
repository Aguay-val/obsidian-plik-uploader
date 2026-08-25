import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type PlikSettings } from '../src/settings';

describe('PlikSettings', () => {
	it('DEFAULT_SETTINGS contient purgeExpiredHistory à false', () => {
		expect(DEFAULT_SETTINGS.purgeExpiredHistory).toBe(false);
	});

	it('PlikSettings est assignable avec purgeExpiredHistory', () => {
		const settings: PlikSettings = {
			...DEFAULT_SETTINGS,
			purgeExpiredHistory: true,
		};
		expect(settings.purgeExpiredHistory).toBe(true);
	});

	it('purgeExpiredHistory est un booléen dans DEFAULT_SETTINGS', () => {
		expect(typeof DEFAULT_SETTINGS.purgeExpiredHistory).toBe('boolean');
	});
});
