import { Notice, requestUrl, type TFile } from 'obsidian';
import { t } from './i18n';
import { isPdfExportSupported, renderMarkdownToPdf } from './pdf';
import { uploadToPlik, type Transport } from './plik-client';
import { openShareModal, type ShareChoice } from './share-modal';
import { addEntry } from './history';
import type { PlikSettings } from './settings';
import type PlikUploaderPlugin from './main';

export const transport: Transport = async (options) => {
	const res = await requestUrl({
		url: options.url,
		method: options.method,
		headers: options.headers,
		body: options.body,
		throw: false,
	});
	const json: unknown = res.json;
	return { status: res.status, text: res.text, json: () => json };
};

export function computeExpiresAt(choice: ShareChoice): number | null {
	if (choice.ttlSeconds <= 0) return null;
	return Date.now() + choice.ttlSeconds * 1000;
}

export function isConfigured(settings: PlikSettings): boolean {
	return settings.serverUrl.length > 0;
}

export function openPluginSettings(plugin: PlikUploaderPlugin): void {
	try {
		const setting = (plugin.app as unknown as { setting?: { open: () => void; openTabById: (id: string) => void } }).setting;
		if (setting) {
			setting.open();
			setting.openTabById(plugin.manifest.id);
			return;
		}
	} catch {
		// API interne indisponible — on bascule sur le fallback
	}
	new Notice(t('upload.openSettings'));
}

export async function uploadVaultFile(plugin: PlikUploaderPlugin, file: TFile): Promise<void> {
	if (!isConfigured(plugin.settings)) {
		new Notice(t('upload.configError'));
		openPluginSettings(plugin);
		return;
	}

	const choice = await openShareModal(plugin.app, plugin.settings.ttl);
	if (!choice) return;

	const { serverUrl, token } = plugin.settings;

	let url: string;
	let uploadId: string;
	let uploadToken: string;
	try {
		const result = await uploadToPlik(
			transport,
			{ serverUrl, token, ttlSeconds: choice.ttlSeconds, oneShot: choice.oneShot || undefined, password: choice.password || undefined },
			{ name: file.name, data: await plugin.app.vault.readBinary(file) },
		);
		url = result.url;
		uploadId = result.uploadId;
		uploadToken = result.uploadToken;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(t('upload.failed', { msg: message }));
		return;
	}

	plugin.history = addEntry(plugin.history, {
		name: file.name,
		url,
		uploadId,
		uploadToken,
		uploadedAt: Date.now(),
		expiresAt: computeExpiresAt(choice),
	});
	await plugin.saveSettings();
	plugin.refreshSidebar();

	try {
		await navigator.clipboard.writeText(url);
		new Notice(t('upload.linkCopied', { url }));
	} catch {
		new Notice(t('upload.sent', { url }));
	}
}

export async function exportVaultFileToPdf(plugin: PlikUploaderPlugin, file: TFile): Promise<void> {
	if (file.extension !== 'md') {
		new Notice(t('upload.pdfOnlyMarkdown'));
		return;
	}

	if (!isPdfExportSupported()) {
		new Notice(t('upload.pdfDesktopOnly'));
		return;
	}

	if (!isConfigured(plugin.settings)) {
		new Notice(t('upload.configError'));
		openPluginSettings(plugin);
		return;
	}

	const choice = await openShareModal(plugin.app, plugin.settings.ttl);
	if (!choice) return;

	const { serverUrl, token } = plugin.settings;

	let url: string;
	let uploadId: string;
	let uploadToken: string;
	try {
		const pdf = await renderMarkdownToPdf(plugin.app, file);
		const data = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
		const result = await uploadToPlik(
			transport,
			{ serverUrl, token, ttlSeconds: choice.ttlSeconds, oneShot: choice.oneShot || undefined, password: choice.password || undefined },
			{ name: `${file.basename}.pdf`, data },
		);
		url = result.url;
		uploadId = result.uploadId;
		uploadToken = result.uploadToken;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(t('upload.failed', { msg: message }));
		return;
	}

	plugin.history = addEntry(plugin.history, {
		name: `${file.basename}.pdf`,
		url,
		uploadId,
		uploadToken,
		uploadedAt: Date.now(),
		expiresAt: computeExpiresAt(choice),
	});
	await plugin.saveSettings();
	plugin.refreshSidebar();

	try {
		await navigator.clipboard.writeText(url);
		new Notice(t('upload.linkCopied', { url }));
	} catch {
		new Notice(t('upload.sent', { url }));
	}
}
