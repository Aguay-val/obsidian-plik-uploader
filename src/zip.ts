import { zipSync } from 'fflate';
import { t } from './i18n';

export async function zipFromEntries(entries: [string, Uint8Array][]): Promise<Uint8Array> {
	const files: Record<string, Uint8Array> = {};
	for (const [path, data] of entries) {
		files[path] = data;
	}
	const result = zipSync(files);
	const out = new Uint8Array(result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength));
	return out;
}

export async function zipFolder(app: { vault: { readBinary: (path: string) => Promise<ArrayBuffer> }; getFiles: () => { path: string }[] }, folderPath: string): Promise<Uint8Array> {
	const allFiles = app.getFiles();
	const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
	const entries: [string, Uint8Array][] = [];
	for (const file of allFiles) {
		if (!file.path.startsWith(prefix)) continue;
		const relativePath = file.path.slice(prefix.length);
		const buffer = await app.vault.readBinary(file.path);
		entries.push([relativePath, new Uint8Array(buffer)]);
	}
	if (entries.length === 0) throw new Error(t('zip.emptyFolder'));
	return zipFromEntries(entries);
}
