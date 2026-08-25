import { App, Modal } from 'obsidian';
import { t } from './i18n';
import { TTL_SECONDS, TTL_LABELS, type TtlOption } from './ttl';

export interface ShareChoice {
	ttlSeconds: number;
	oneShot: boolean;
	password: string;
}

export class ShareOptionsModal extends Modal {
	private resolve!: (value: ShareChoice | null) => void;
	private resolved = false;
	private ttl: string;
	private oneShot = false;
	private password = '';

	constructor(app: App, defaultTtl: string) {
		super(app);
		this.ttl = defaultTtl;
	}

	private doResolve(value: ShareChoice | null): void {
		if (this.resolved) return;
		this.resolved = true;
		this.resolve(value);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h3', { text: t('modal.share.title') });

		const ttlRow = contentEl.createDiv({ cls: 'setting-item' });
		ttlRow.createEl('label', { text: t('modal.share.retention') });
		const ttlSelect = ttlRow.createEl('select');
		for (const [key, label] of Object.entries(TTL_LABELS)) {
			const opt = ttlSelect.createEl('option', { text: label, value: key });
			if (key === this.ttl) opt.selected = true;
		}
		ttlSelect.addEventListener('change', () => {
			this.ttl = ttlSelect.value;
		});

		const oneshotRow = contentEl.createDiv({ cls: 'setting-item' });
		const oneshotCheck = oneshotRow.createEl('input', { attr: { type: 'checkbox' } });
		oneshotCheck.checked = this.oneShot;
		oneshotCheck.addEventListener('change', () => {
			this.oneShot = oneshotCheck.checked;
		});
		oneshotRow.createEl('label', { text: t('modal.share.oneShot') });

		const pwRow = contentEl.createDiv({ cls: 'setting-item' });
		pwRow.createEl('label', { text: t('modal.share.password') });
		const pwInput = pwRow.createEl('input', { attr: { type: 'text', placeholder: t('modal.share.passwordPlaceholder') } });
		pwInput.value = this.password;
		pwInput.addEventListener('input', () => {
			this.password = pwInput.value;
		});

		const btnRow = contentEl.createDiv({ cls: 'setting-item' });
		btnRow.createEl('button', { text: t('modal.share.send'), cls: 'mod-cta' }).addEventListener('click', () => {
			this.doResolve({ ttlSeconds: TTL_SECONDS[this.ttl as TtlOption], oneShot: this.oneShot, password: this.password });
			this.close();
		});
		btnRow.createEl('button', { text: t('modal.share.cancel') }).addEventListener('click', () => {
			this.doResolve(null);
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
		this.doResolve(null);
	}

	openModal(): Promise<ShareChoice | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			super.open();
		});
	}
}

export async function openShareModal(app: App, defaultTtl: string): Promise<ShareChoice | null> {
	const modal = new ShareOptionsModal(app, defaultTtl);
	return modal.openModal();
}
