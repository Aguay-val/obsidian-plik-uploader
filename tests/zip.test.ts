import { test, expect } from 'vitest';
import { zipFromEntries } from '../src/zip';

test('zipFromEntries produit un ZIP contenant les bons fichiers', async () => {
	const encoder = new TextEncoder();
	const data = await zipFromEntries([
		['dossier/fichier.md', encoder.encode('# Hello')],
		['dossier/autre.md', encoder.encode('Texte')],
	]);
	const bytes = data.slice(0, 4);
	const magic = String.fromCharCode(...bytes);
	expect(magic).toBe('PK\u0003\u0004');
});
