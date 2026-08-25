import { test, expect } from 'vitest';
import { HistoryEntry, addEntry, pruneExpired } from '../src/history';

test('addEntry place la nouvelle entrée en tête', () => {
	const entries: HistoryEntry[] = [{ name: 'a', url: 'u', uploadedAt: 1, expiresAt: null }];
	const result = addEntry(entries, { name: 'b', url: 'v', uploadedAt: 2, expiresAt: 3 });
	expect(result[0].name).toBe('b');
	expect(result).toHaveLength(2);
});

test('addEntry plafonne à 100 entrées', () => {
	const entries: HistoryEntry[] = Array.from({ length: 100 }, (_, i) => ({
		name: String(i), url: `u${i}`, uploadedAt: i, expiresAt: null,
	}));
	const result = addEntry(entries, { name: 'new', url: 'v', uploadedAt: 999, expiresAt: null });
	expect(result).toHaveLength(100);
	expect(result[0].name).toBe('new');
	expect(result[99].name).toBe('98');
});

test('pruneExpired retire les entrées expirées', () => {
	const now = 1000;
	const entries: HistoryEntry[] = [
		{ name: 'ok', url: 'u', uploadedAt: 1, expiresAt: 2000 },
		{ name: 'dead', url: 'v', uploadedAt: 1, expiresAt: 500 },
		{ name: 'never', url: 'w', uploadedAt: 1, expiresAt: null },
	];
	const result = pruneExpired(entries, now);
	expect(result).toHaveLength(2);
	expect(result.map((e) => e.name)).toEqual(['ok', 'never']);
});
