import { App, Modal, TFile, TFolder } from 'obsidian';
import { t } from './i18n';

export type UploadTarget =
	| { kind: 'file'; file: TFile }
	| { kind: 'folder'; folder: TFolder }
	| null;

export class UploadTargetModal extends Modal {
	private resolve!: (value: UploadTarget) => void;
	private result: UploadTarget = null;

	constructor(app: App) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h3', { text: t('modal.target.title') });

		const fileRow = contentEl.createDiv({ cls: 'setting-item' });
		fileRow.style.cursor = 'pointer';
		fileRow.createEl('div', { text: t('modal.target.file'), cls: 'setting-item-name' });
		fileRow.createEl('div', { text: t('modal.target.fileDesc'), cls: 'setting-item-description' });
		fileRow.addEventListener('click', async () => {
			const file = await this.pickFile();
			if (file) {
				this.result = { kind: 'file', file };
				this.close();
			}
		});

		const folderRow = contentEl.createDiv({ cls: 'setting-item' });
		folderRow.style.cursor = 'pointer';
		folderRow.createEl('div', { text: t('modal.target.folder'), cls: 'setting-item-name' });
		folderRow.createEl('div', { text: t('modal.target.folderDesc'), cls: 'setting-item-description' });
		folderRow.addEventListener('click', async () => {
			const folder = await this.pickFolder();
			if (folder) {
				this.result = { kind: 'folder', folder };
				this.close();
			}
		});

		const cancelRow = contentEl.createDiv({ cls: 'setting-item' });
		cancelRow.style.justifyContent = 'flex-end';
		cancelRow.createEl('button', { text: t('modal.target.cancel') }).addEventListener('click', () => {
			this.close();
		});
	}

	private async pickFile(): Promise<TFile | null> {
		const files = this.app.vault.getFiles();
		if (files.length === 0) {
			return null;
		}
		const modal = new FilePickerModal(this.app, files);
		return modal.open();
	}

	private async pickFolder(): Promise<TFolder | null> {
		const folders = this.app.vault.getAllLoadedFiles().filter((f): f is TFolder => f instanceof TFolder);
		const root = this.app.vault.getRoot();
		const choices = [root, ...folders];
		if (choices.length === 0) return null;
		const modal = new FolderPickerModal(this.app, choices);
		return modal.open();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	open(): Promise<UploadTarget> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			super.open();
		});
	}

	close(): void {
		super.close();
		this.resolve(this.result);
	}
}

class FilePickerModal extends Modal {
	private files: TFile[];
	private resolve!: (value: TFile | null) => void;
	private resolved = false;

	constructor(app: App, files: TFile[]) {
		super(app);
		this.files = files;
	}

	private doResolve(value: TFile | null): void {
		if (this.resolved) return;
		this.resolved = true;
		this.resolve(value);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h3', { text: t('modal.file.title') });

		const search = contentEl.createEl('input', {
			attr: { type: 'text', placeholder: t('modal.file.search') },
			cls: 'setting-item',
		});
		search.style.width = '100%';
		search.style.marginBottom = '0.5em';

		const list = contentEl.createDiv();
		const render = (filter: string) => {
			list.empty();
			const lower = filter.toLowerCase();
			const filtered = lower
				? this.files.filter((f) => f.path.toLowerCase().includes(lower))
				: this.files;
			for (const file of filtered.slice(0, 50)) {
				const row = list.createDiv({ cls: 'setting-item' });
				row.style.cursor = 'pointer';
				row.createEl('div', { text: file.path, cls: 'setting-item-name' });
				row.addEventListener('click', () => {
					this.doResolve(file);
					this.close();
				});
			}
			if (filtered.length > 50) {
				list.createEl('div', { text: t('modal.file.more', { count: filtered.length - 50 }), cls: 'setting-item-description' });
			}
		};

		search.addEventListener('input', () => render(search.value));
		render('');
	}

	onClose(): void {
		this.contentEl.empty();
		this.doResolve(null);
	}

	open(): Promise<TFile | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			super.open();
		});
	}
}

class FolderPickerModal extends Modal {
	private folders: TFolder[];
	private resolve!: (value: TFolder | null) => void;
	private resolved = false;

	constructor(app: App, folders: TFolder[]) {
		super(app);
		this.folders = folders;
	}

	private doResolve(value: TFolder | null): void {
		if (this.resolved) return;
		this.resolved = true;
		this.resolve(value);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h3', { text: t('modal.folder.title') });

		const search = contentEl.createEl('input', {
			attr: { type: 'text', placeholder: t('modal.folder.search') },
			cls: 'setting-item',
		});
		search.style.width = '100%';
		search.style.marginBottom = '0.5em';

		const list = contentEl.createDiv();
		const render = (filter: string) => {
			list.empty();
			const lower = filter.toLowerCase();
			const filtered = lower
				? this.folders.filter((f) => f.path.toLowerCase().includes(lower))
				: this.folders;
			for (const folder of filtered.slice(0, 50)) {
				const row = list.createDiv({ cls: 'setting-item' });
				row.style.cursor = 'pointer';
				const label = folder.path === '/' ? '/' : folder.path;
				row.createEl('div', { text: `📁 ${label}`, cls: 'setting-item-name' });
				row.addEventListener('click', () => {
					this.doResolve(folder);
					this.close();
				});
			}
		};

		search.addEventListener('input', () => render(search.value));
		render('');
	}

	onClose(): void {
		this.contentEl.empty();
		this.doResolve(null);
	}

	open(): Promise<TFolder | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			super.open();
		});
	}
}
