import { App, Modal, Notice } from 'obsidian';
import { t, getLocale } from './i18n';
import type { HistoryEntry } from './history';

function dateLocale(): string {
	const map: Record<string, string> = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES' };
	return map[getLocale()] ?? 'en-GB';
}

export class HistoryModal extends Modal {
	private entries: HistoryEntry[];
	private onClear: () => void;

	constructor(app: App, entries: HistoryEntry[], onClear: () => void) {
		super(app);
		this.entries = entries;
		this.onClear = onClear;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h3', { text: t('modal.history.title') });

		if (this.entries.length === 0) {
			contentEl.createEl('p', { text: t('modal.history.empty'), cls: 'setting-item-description' });
			return;
		}

		const now = Date.now();

		for (const entry of this.entries) {
			const isExpired = entry.expiresAt !== null && entry.expiresAt < now;
			const date = new Date(entry.uploadedAt).toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit', year: '2-digit' });

			const row = contentEl.createDiv({ cls: 'setting-item' });
			row.style.cursor = isExpired ? 'default' : 'pointer';
			if (isExpired) row.style.opacity = '0.45';

			const info = row.createDiv();
			info.createEl('div', { text: entry.name, cls: 'setting-item-name' });

			const meta = [date];
			if (isExpired) meta.push(t('modal.history.expired'));
			else if (entry.expiresAt !== null) {
				const remaining = entry.expiresAt - now;
				const days = Math.ceil(remaining / 86400000);
				meta.push(t('modal.history.expiresIn', { days }));
			} else {
				meta.push(t('modal.history.noExpiry'));
			}
			info.createEl('div', { text: meta.join(' · '), cls: 'setting-item-description' });

			if (!isExpired) {
				row.addEventListener('click', async () => {
					try {
						await navigator.clipboard.writeText(entry.url);
						new Notice(t('modal.history.copied', { url: entry.url }));
					} catch {
						new Notice(entry.url);
					}
				});
			}
		}

		const btnRow = contentEl.createDiv({ cls: 'setting-item' });
		btnRow.style.justifyContent = 'flex-end';
		btnRow.style.marginTop = '1em';
		btnRow.createEl('button', { text: t('modal.history.clear'), cls: 'mod-warning' }).addEventListener('click', () => {
			this.onClear();
			this.close();
			new Notice(t('modal.history.cleared'));
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
