import { App, ItemView, Modal, Notice, type WorkspaceLeaf } from 'obsidian';
import { t, getLocale } from './i18n';
import { deleteUpload } from './plik-client';
import type PlikUploaderPlugin from './main';
import { transport } from './upload';
import { UploadTargetModal } from './target-modal';

function dateLocale(): string {
	const map: Record<string, string> = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES' };
	return map[getLocale()] ?? 'en-GB';
}

function confirmDelete(app: App, message: string): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(app);
		modal.contentEl.createEl('h3', { text: t('sidebar.deleteTitle') });
		modal.contentEl.createDiv({ text: message, cls: 'setting-item-description' });
		const btnRow = modal.contentEl.createDiv({ cls: 'setting-item plik-row-flex-end' });
		btnRow.createEl('button', { text: t('sidebar.cancel'), cls: '' }).addEventListener('click', () => {
			resolve(false);
			modal.close();
		});
		btnRow.createEl('button', { text: t('sidebar.delete'), cls: 'mod-warning' }).addEventListener('click', () => {
			resolve(true);
			modal.close();
		});
		modal.onClose = () => resolve(false);
		modal.open();
	});
}

export const VIEW_TYPE_PLIK = 'plik-uploader-sidebar';

export class PlikSidebarView extends ItemView {
	plugin: PlikUploaderPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: PlikUploaderPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_PLIK;
	}

	getDisplayText(): string {
		return 'Plik';
	}

	getIcon(): string {
		return 'upload';
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	render(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h3', { text: 'Plik Uploader', cls: 'setting-item-name' });

		const btn = contentEl.createEl('button', {
			text: t('sidebar.send'),
			cls: 'mod-cta plik-sidebar-send',
		});
		btn.addEventListener('click', () => void this.openTargetPicker());

		contentEl.createEl('hr');

		const header = contentEl.createDiv({ cls: 'setting-item' });
		header.createDiv({ text: t('sidebar.history'), cls: 'setting-item-name' });
		const clearBtn = header.createEl('button', { text: t('sidebar.clear'), cls: 'mod-warning plik-history-clear' });
		clearBtn.addEventListener('click', () => {
			if (this.plugin.history.length === 0) return;
			this.plugin.history = [];
			void this.plugin.saveSettings();
			new Notice(t('sidebar.cleared'));
			this.render();
		});

		const { history } = this.plugin;
		if (history.length === 0) {
			contentEl.createDiv({ text: t('sidebar.empty'), cls: 'setting-item-description' });
			return;
		}

		const now = Date.now();
		for (let i = 0; i < history.length; i++) {
			const entry = history[i];
			if (!entry) continue;
			const isExpired = entry.expiresAt !== null && entry.expiresAt < now;
			const date = new Date(entry.uploadedAt).toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit', year: '2-digit' });

			const row = contentEl.createDiv({ cls: `setting-item plik-history-row${isExpired ? ' is-expired' : ''}` });

			const info = row.createDiv({ cls: 'plik-history-item-info' });
			info.createDiv({ text: entry.name, cls: 'setting-item-name' });

			const meta = [date];
			if (isExpired) meta.push(t('sidebar.expired'));
			else if (entry.expiresAt !== null) {
				const days = Math.ceil((entry.expiresAt - now) / 86400000);
				meta.push(t('sidebar.daysLeft', { days }));
			} else {
				meta.push(t('sidebar.permanent'));
			}
			info.createDiv({ text: meta.join(' · '), cls: 'setting-item-description' });

			if (!isExpired) {
				row.addEventListener('click', () => {
					void (async () => {
						try {
							await navigator.clipboard.writeText(entry.url);
							new Notice(t('sidebar.copied', { url: entry.url }));
						} catch {
							new Notice(entry.url);
						}
					})();
				});
			}

			const btns = row.createDiv({ cls: 'plik-history-item-btns' });

			const delBtn = btns.createEl('button', { text: '🗑', cls: 'clickable-icon', attr: { 'aria-label': t('sidebar.deleteOnPlik') } });
			delBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				void (async () => {
					const confirmed = await confirmDelete(this.app, t('sidebar.deleteConfirm', { name: entry.name }));
					if (!confirmed) return;
					try {
						await deleteUpload(transport, this.plugin.settings.serverUrl, entry.uploadId, entry.uploadToken);
						this.plugin.history.splice(i, 1);
						await this.plugin.saveSettings();
						new Notice(t('sidebar.deleted', { name: entry.name }));
						this.render();
					} catch (error) {
						const msg = error instanceof Error ? error.message : String(error);
						new Notice(t('sidebar.deleteFailed', { msg }));
					}
				})();
			});

			const hideBtn = btns.createEl('button', { text: '✕', cls: 'clickable-icon', attr: { 'aria-label': t('sidebar.hideFromHistory') } });
			hideBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				void (async () => {
					this.plugin.history.splice(i, 1);
					await this.plugin.saveSettings();
					this.render();
				})();
			});
		}
	}

	private async openTargetPicker(): Promise<void> {
		if (this.plugin.settings.serverUrl.length === 0) {
			new Notice(t('sidebar.settingsWarning'));
			return;
		}
		const modal = new UploadTargetModal(this.app);
		const target = await modal.open();
		if (!target) return;

		if (target.kind === 'file') {
			const { uploadVaultFile } = await import('./upload');
			await uploadVaultFile(this.plugin, target.file);
		} else {
			await this.plugin.shareFolder(target.folder);
		}
		this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}
