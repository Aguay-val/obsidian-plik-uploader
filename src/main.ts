import { Notice, Plugin, TAbstractFile, TFile, TFolder, type Menu } from 'obsidian';
import { detectLocale, setLocale, t } from './i18n';
import { type HistoryEntry, addEntry, pruneExpired } from './history';
import { HistoryModal } from './history-modal';
import { uploadToPlik } from './plik-client';
import { DEFAULT_SETTINGS, PlikSettingTab, type PlikSettings } from './settings';
import { openShareModal } from './share-modal';
import { VIEW_TYPE_PLIK, PlikSidebarView } from './sidebar-view';
import { computeExpiresAt, exportVaultFileToPdf, transport, uploadVaultFile } from './upload';
import { zipFolder } from './zip';

export default class PlikUploaderPlugin extends Plugin {
	settings: PlikSettings = DEFAULT_SETTINGS;
	history: HistoryEntry[] = [];

	async onload(): Promise<void> {
		const raw = (await this.loadData()) as Record<string, unknown> | null;
		const data = (raw && typeof raw === 'object') ? raw : {};
		this.applyStoredData(data);
		const savedLang = this.settings.language ?? 'auto';
		setLocale(savedLang === 'auto' ? detectLocale() : savedLang);

		if (this.settings.purgeExpiredHistory) {
			this.history = pruneExpired(this.history, Date.now());
			await this.saveSettings();
		}

		this.addCommand({
			id: 'upload-current-file',
			name: t('cmd.upload'),
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking) void uploadVaultFile(this, file);
				return true;
			},
		});

		this.addCommand({
			id: 'export-current-file-to-pdf',
			name: t('cmd.pdf'),
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking) void exportVaultFileToPdf(this, file);
				return true;
			},
		});

		this.addCommand({
			id: 'show-history',
			name: t('cmd.history'),
			callback: () => void this.showHistory(),
		});

		this.addCommand({
			id: 'open-plik-sidebar',
			name: t('cmd.sidebar'),
			callback: () => this.activateSidebar(),
		});

		this.registerView(VIEW_TYPE_PLIK, (leaf) => new PlikSidebarView(leaf, this));

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
				if (file instanceof TFile) {
					menu.addItem((item) => {
						item
							.setTitle('Share via Plik')
							.setIcon('share')
							.onClick(() => void uploadVaultFile(this, file));
					});
				}
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item
							.setTitle('Share via Plik (zip)')
							.setIcon('share')
							.onClick(() => void this.shareFolder(file));
					});
				}
			}),
		);

		this.addRibbonIcon('upload', 'Plik Uploader', () => this.activateSidebar());

		this.addSettingTab(new PlikSettingTab(this.app, this));

		if (this.settings.showSidebar) {
			await this.activateSidebar();
		}
	}

	async activateSidebar(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PLIK);
		const existing = leaves[0];
		if (existing) {
			this.app.workspace.setActiveLeaf(existing);
			return;
		}
		const leaf = this.app.workspace.getLeftLeaf(false);
		if (!leaf) return;
		await leaf.setViewState({ type: VIEW_TYPE_PLIK, active: true });
		this.app.workspace.setActiveLeaf(leaf);
	}

	deactivateSidebar(): void {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PLIK);
		for (const leaf of leaves) {
			leaf.detach();
		}
	}

	refreshSidebar(): void {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PLIK);
		for (const leaf of leaves) {
			const view = leaf.view;
			if (view instanceof PlikSidebarView) {
				view.render();
			}
		}
	}

	private applyStoredData(data: Record<string, unknown>): void {
		if ('settings' in data) {
			this.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings as Partial<PlikSettings>);
			this.history = Array.isArray(data.history) ? (data.history as HistoryEntry[]) : [];
		} else {
			this.settings = Object.assign({}, DEFAULT_SETTINGS, data as Partial<PlikSettings>);
			this.history = [];
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData({ settings: this.settings, history: this.history });
	}

	async showHistory(): Promise<void> {
		if (this.history.length === 0) {
			new Notice(t('modal.history.empty'));
			return;
		}
		new HistoryModal(this.app, this.history, () => {
			this.history = [];
			this.saveSettings();
		}).open();
	}

	async shareFolder(folder: TFolder): Promise<void> {
		const choice = await openShareModal(this.app, this.settings.ttl);
		if (!choice) return;

		try {
			const data = await zipFolder(
				{ vault: { readBinary: (p: string) => this.app.vault.adapter.readBinary(p) }, getFiles: () => this.app.vault.getFiles() },
				folder.path,
			);
			const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

			const result = await uploadToPlik(
				transport,
				{ serverUrl: this.settings.serverUrl, token: this.settings.token, ttlSeconds: choice.ttlSeconds, oneShot: choice.oneShot || undefined, password: choice.password || undefined },
				{ name: `${folder.name}.zip`, data: arrayBuffer },
			);

			this.history = addEntry(this.history, {
				name: `${folder.name}.zip`,
				url: result.url,
				uploadId: result.uploadId,
				uploadToken: result.uploadToken,
				uploadedAt: Date.now(),
				expiresAt: computeExpiresAt(choice),
			});
			await this.saveSettings();
			this.refreshSidebar();

			try {
				await navigator.clipboard.writeText(result.url);
				new Notice(t('upload.folderCopied', { url: result.url }));
			} catch {
				new Notice(t('upload.folderSent', { url: result.url }));
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			new Notice(t('upload.failed', { msg: message }));
		}
	}
}
