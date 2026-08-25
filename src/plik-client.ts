import { t } from './i18n';

export interface TransportOptions {
	url: string;
	method: string;
	headers?: Record<string, string>;
	body?: string | ArrayBuffer;
}

export interface TransportResponse {
	status: number;
	json?: () => unknown;
	text?: string;
}

export type Transport = (options: TransportOptions) => Promise<TransportResponse>;

export interface UploadConfig {
	serverUrl: string;
	token: string;
	ttlSeconds: number;
	oneShot?: boolean;
	password?: string;
}

export interface CreatedUpload {
	id: string;
	uploadToken: string;
	downloadDomain?: string;
}

export function normalizeServerUrl(serverUrl: string): string {
	return serverUrl.replace(/\/+$/, '');
}

function errorMessage(response: TransportResponse): string {
	let detail = '';
	try {
		const parsed = response.json?.() as { message?: string } | undefined;
		if (parsed?.message) detail = ` : ${parsed.message}`;
	} catch {
		// réponse non JSON — on garde le détail vide
	}
	if (!detail && response.text) detail = ` : ${response.text}`;
	return t('client.error', { status: response.status, detail });
}

function parseJson(response: TransportResponse): unknown {
	if (!response.json) throw new Error(t('client.invalidResponse'));
	try {
		return response.json();
	} catch {
		throw new Error(t('client.invalidResponse'));
	}
}

export async function createUpload(transport: Transport, options: UploadConfig): Promise<CreatedUpload> {
	const response = await transport({
		url: `${normalizeServerUrl(options.serverUrl)}/upload`,
		method: 'POST',
		headers: {
			...(options.token ? { 'X-PlikToken': options.token } : {}),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			Ttl: options.ttlSeconds,
			...(options.oneShot ? { OneShot: true } : {}),
			...(options.password ? { Password: options.password } : {}),
		}),
	});
	if (response.status !== 200) throw new Error(errorMessage(response));

	const parsed = parseJson(response) as Partial<CreatedUpload> | undefined;
	if (!parsed?.id || !parsed.uploadToken) throw new Error(t('client.missingFields'));
	return { id: parsed.id, uploadToken: parsed.uploadToken, downloadDomain: parsed.downloadDomain };
}

function escapeHeader(value: string): string {
	return value.replace(/["\r\n]/g, '_');
}

export function buildMultipartBody(boundary: string, fieldName: string, fileName: string, data: Uint8Array): ArrayBuffer {
	const encoder = new TextEncoder();
	const head = encoder.encode(
		`--${boundary}\r\n` +
			`Content-Disposition: form-data; name="${escapeHeader(fieldName)}"; filename="${escapeHeader(fileName)}"\r\n` +
			`Content-Type: application/octet-stream\r\n\r\n`,
	);
	const tail = encoder.encode(`\r\n--${boundary}--\r\n`);
	const out = new Uint8Array(head.length + data.length + tail.length);
	out.set(head, 0);
	out.set(data, head.length);
	out.set(tail, head.length + data.length);
	return out.buffer;
}

export interface AddedFile {
	id: string;
	fileName: string;
}

export async function addFile(
	transport: Transport,
	options: { serverUrl: string; uploadId: string; uploadToken: string; fileName: string; data: ArrayBuffer },
): Promise<AddedFile> {
	const boundary = `obsidian-plik-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	const body = buildMultipartBody(boundary, 'file', options.fileName, new Uint8Array(options.data));

	const response = await transport({
		url: `${normalizeServerUrl(options.serverUrl)}/file/${encodeURIComponent(options.uploadId)}`,
		method: 'POST',
		headers: {
			'X-UploadToken': options.uploadToken,
			'Content-Type': `multipart/form-data; boundary=${boundary}`,
		},
		body,
	});
	if (response.status !== 200) throw new Error(errorMessage(response));

	const parsed = parseJson(response) as Partial<AddedFile> | undefined;
	if (!parsed?.id || !parsed.fileName) throw new Error(t('client.fileNotSaved'));
	return { id: parsed.id, fileName: parsed.fileName };
}

export async function uploadToPlik(
	transport: Transport,
	config: UploadConfig,
	file: { name: string; data: ArrayBuffer },
): Promise<{ url: string; uploadId: string; uploadToken: string }> {
	const upload = await createUpload(transport, config);
	const added = await addFile(transport, {
		serverUrl: config.serverUrl,
		uploadId: upload.id,
		uploadToken: upload.uploadToken,
		fileName: file.name,
		data: file.data,
	});
	const base = upload.downloadDomain && upload.downloadDomain.length > 0
		? upload.downloadDomain.replace(/\/+$/, '')
		: normalizeServerUrl(config.serverUrl);
	const url = `${base}/file/${encodeURIComponent(upload.id)}/${encodeURIComponent(added.id)}/${encodeURIComponent(added.fileName)}`;
	return { url, uploadId: upload.id, uploadToken: upload.uploadToken };
}

export async function deleteUpload(transport: Transport, serverUrl: string, uploadId: string, uploadToken: string): Promise<void> {
	const response = await transport({
		url: `${normalizeServerUrl(serverUrl)}/upload/${encodeURIComponent(uploadId)}`,
		method: 'DELETE',
		headers: { 'X-UploadToken': uploadToken },
	});
	if (response.status !== 200 && response.status !== 204) throw new Error(errorMessage(response));
}
