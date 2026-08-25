import { describe, expect, it } from 'vitest';
import { isConfigured } from '../src/upload';

describe('isConfigured', () => {
	it('est configuré avec une URL de serveur même sans token (instance sans auth)', () => {
		expect(isConfigured({ serverUrl: 'https://transfert.boscop.io', token: '', ttl: 'week' })).toBe(true);
	});

	it('n’est pas configuré sans URL de serveur', () => {
		expect(isConfigured({ serverUrl: '', token: 'tok', ttl: 'week' })).toBe(false);
	});
});