import { describe, expect, it } from 'vitest';
import { createUpload, normalizeServerUrl, type Transport } from '../src/plik-client';

interface RecordedRequest {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: string | ArrayBuffer;
}

const CONFIG = { serverUrl: 'https://plik.example.net/', token: 'plik_test_token', ttlSeconds: 604_800 };

function scriptedTransport(script: Array<{ status: number; body: string }>, recorded: RecordedRequest[] = []): Transport {
	return async (options) => {
		recorded.push(options);
		const next = script.at(recorded.length - 1);
		if (!next) throw new Error('Appel HTTP inattendu');
		return { status: next.status, json: () => JSON.parse(next.body), text: next.body };
	};
}

describe('normalizeServerUrl', () => {
	it('supprime les slash finaux', () => {
		expect(normalizeServerUrl('https://plik.example.net///')).toBe('https://plik.example.net');
	});
});

describe('createUpload', () => {
	it('envoie POST /upload avec le token et le TTL, et parse la réponse', async () => {
		const recorded: RecordedRequest[] = [];
		const transport = scriptedTransport(
			[{ status: 200, body: JSON.stringify({ id: 'UpL04dID', uploadToken: 'tok123', downloadDomain: 'https://dl.example.net' }) }],
			recorded,
		);

		const result = await createUpload(transport, CONFIG);

		expect(result).toEqual({ id: 'UpL04dID', uploadToken: 'tok123', downloadDomain: 'https://dl.example.net' });
		expect(recorded).toHaveLength(1);
		expect(recorded[0]?.url).toBe('https://plik.example.net/upload');
		expect(recorded[0]?.method).toBe('POST');
		expect(recorded[0]?.headers?.['X-PlikToken']).toBe('plik_test_token');
		expect(recorded[0]?.headers?.['Content-Type']).toBe('application/json');
		expect(JSON.parse(String(recorded[0]?.body))).toEqual({ Ttl: 604_800 });
	});

	it('lève une erreur explicite quand le serveur refuse (token invalide)', async () => {
		const transport = scriptedTransport([{ status: 403, body: JSON.stringify({ message: 'invalid token' }) }]);
		await expect(createUpload(transport, CONFIG)).rejects.toThrow('Plik error (403) : invalid token');
	});

	it('n’envoie pas le header X-PlikToken quand le token est vide (instance sans auth)', async () => {
		const recorded: RecordedRequest[] = [];
		const transport = scriptedTransport(
			[{ status: 200, body: JSON.stringify({ id: 'UpL04dID', uploadToken: 'tok123' }) }],
			recorded,
		);

		await createUpload(transport, { ...CONFIG, token: '' });

		expect(recorded[0]?.headers).not.toHaveProperty('X-PlikToken');
	});

	it('retombe sur le corps texte quand la réponse d’erreur n’est pas JSON', async () => {
		const transport = scriptedTransport([{ status: 500, body: 'Internal Server Error' }]);
		await expect(createUpload(transport, CONFIG)).rejects.toThrow('Plik error (500) : Internal Server Error');
	});

	it('lève « Réponse Plik invalide » sur un 200 non-JSON', async () => {
		const transport = scriptedTransport([{ status: 200, body: '<html>oops</html>' }]);
		await expect(createUpload(transport, CONFIG)).rejects.toThrow('Invalid Plik response');
	});

	it('lève une erreur si la réponse manque id ou uploadToken', async () => {
		const transport = scriptedTransport([{ status: 200, body: JSON.stringify({ id: 'x' }) }]);
		await expect(createUpload(transport, CONFIG)).rejects.toThrow('Invalid Plik response: missing id/uploadToken');
	});

	it('createUpload inclut OneShot et Password quand définis', async () => {
		let sentBody: string | undefined;
		const mock: Transport = async (opts) => {
			sentBody = opts.body as string;
			return { status: 200, json: () => ({ id: 'x', uploadToken: 't' }) };
		};
		await createUpload(mock, {
			serverUrl: 'https://p.test',
			token: '',
			ttlSeconds: 3600,
			oneShot: true,
			password: 'secret',
		});
		expect(sentBody).toContain('"OneShot":true');
		expect(sentBody).toContain('"Password":"secret"');
	});
});

import { addFile, buildMultipartBody } from '../src/plik-client';

describe('buildMultipartBody', () => {
	it('assemble en-tête + données binaires + pied autour du boundary', () => {
		const data = new TextEncoder().encode('# Contenu\n');
		const buffer = buildMultipartBody('BOUNDARY42', 'file', 'note.md', data);
		const text = new TextDecoder().decode(new Uint8Array(buffer));

		expect(text).toContain('--BOUNDARY42\r\n');
		expect(text).toContain('Content-Disposition: form-data; name="file"; filename="note.md"\r\n');
		expect(text).toContain('Content-Type: application/octet-stream\r\n\r\n# Contenu\n');
		expect(text.endsWith('\r\n--BOUNDARY42--\r\n')).toBe(true);
	});

	it('échappe les guillemets et CR/LF dans les noms de champ et de fichier', () => {
		const data = new TextEncoder().encode('x');
		const buffer = buildMultipartBody('BOUNDARY42', 'fi"eld', 'evil\r\nname.md', data);
		const text = new TextDecoder().decode(new Uint8Array(buffer));

		expect(text).toContain('Content-Disposition: form-data; name="fi_eld"; filename="evil__name.md"\r\n');
		expect(text).not.toContain('filename="evil\r\n');
	});
});

describe('addFile', () => {
	it('envoie le fichier en multipart sur /file/{uploadId} avec X-UploadToken', async () => {
		const recorded: RecordedRequest[] = [];
		const transport = scriptedTransport(
			[{ status: 200, body: JSON.stringify({ id: 'F1le1D', fileName: 'note.md' }) }],
			recorded,
		);
		const data = new TextEncoder().encode('# hello').buffer as ArrayBuffer;

		const result = await addFile(transport, {
			serverUrl: 'https://plik.example.net',
			uploadId: 'UpL04dID',
			uploadToken: 'tok123',
			fileName: 'note.md',
			data,
		});

		expect(result).toEqual({ id: 'F1le1D', fileName: 'note.md' });
		const request = recorded[0];
		expect(request?.url).toBe('https://plik.example.net/file/UpL04dID');
		expect(request?.headers?.['X-UploadToken']).toBe('tok123');
		expect(String(request?.headers?.['Content-Type'])).toContain('multipart/form-data; boundary=');
		expect(new TextDecoder().decode(new Uint8Array(request?.body as ArrayBuffer))).toContain('filename="note.md"');
	});

	it('propage les erreurs serveur', async () => {
		const transport = scriptedTransport([{ status: 413, body: JSON.stringify({ message: 'file too large' }) }]);
		await expect(
			addFile(transport, {
				serverUrl: 'https://plik.example.net',
				uploadId: 'UpL04dID',
				uploadToken: 'tok123',
				fileName: 'gros.pdf',
				data: new ArrayBuffer(1),
			}),
		).rejects.toThrow('Plik error (413) : file too large');
	});
});

import { uploadToPlik } from '../src/plik-client';

describe('uploadToPlik', () => {
	const UPLOAD_RESPONSE = JSON.stringify({
		id: 'UpL04dID',
		uploadToken: 'tok123',
		downloadDomain: 'https://dl.example.net',
	});
	const FILE_RESPONSE = JSON.stringify({ id: 'F1le1D', fileName: 'mon rapport.pdf' });

	it('enchaîne création + ajout et construit l\'URL depuis downloadDomain', async () => {
		const transport = scriptedTransport(
			[
				{ status: 200, body: UPLOAD_RESPONSE },
				{ status: 200, body: FILE_RESPONSE },
			],
			[],
		);

		const result = await uploadToPlik(transport, CONFIG, {
			name: 'mon rapport.pdf',
			data: new ArrayBuffer(8),
		});

		expect(result.url).toBe('https://dl.example.net/file/UpL04dID/F1le1D/mon%20rapport.pdf');
	});

	it('retombe sur serverUrl si downloadDomain est absent', async () => {
		const transport = scriptedTransport(
			[
				{ status: 200, body: JSON.stringify({ id: 'UpL04dID', uploadToken: 'tok123' }) },
				{ status: 200, body: FILE_RESPONSE },
			],
			[],
		);

		const result = await uploadToPlik(transport, CONFIG, { name: 'a.md', data: new ArrayBuffer(1) });

		expect(result.url.startsWith('https://plik.example.net/file/UpL04dID/F1le1D/')).toBe(true);
	});
});
