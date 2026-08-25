import { App, Component, MarkdownRenderer, Platform, TFile } from 'obsidian';

export function isPdfExportSupported(): boolean {
	return Platform.isDesktopApp;
}

export async function renderMarkdownToPdf(app: App, file: TFile): Promise<Uint8Array> {
	const markdown = await app.vault.cachedRead(file);

	const comp = new Component();
	comp.load();

	// Fragment factice : capture les enfants HTML sans exécuter les postProcess qui plantent
	let capturedChildren: HTMLCollection | undefined;
	const fragment: HTMLElement = {
		appendChild(el: DocumentFragment) {
			capturedChildren = el?.children;
			throw new Error('exit');
		},
	} as unknown as HTMLElement;

	try {
		await MarkdownRenderer.render(app, markdown, fragment, file.path, comp);
	} catch {
		// l'erreur "exit" est le mécanisme de capture du fragment — normale
	}

	const viewEl = document.body.createDiv('print');
	viewEl.addClass('markdown-preview-view', 'markdown-rendered');
	const el = createFragment();
	for (const item of Array.from(capturedChildren ?? [])) {
		el.createDiv({}, (t) => t.appendChild(item));
	}
	viewEl.appendChild(el);

	const promises: Promise<void>[] = [];
	// @ts-ignore - API interne non exposée dans obsidian.d.ts
	await MarkdownRenderer.postProcess(app, {
		docId: `plik-${Date.now()}`,
		sourcePath: file.path,
		frontmatter: {},
		promises,
		addChild: (c: Component) => comp.addChild(c),
		getSectionInfo: () => null,
		containerEl: viewEl,
		el: viewEl,
		displayMode: true,
	});
	await Promise.all(promises);

	const css = Array.from(document.styleSheets)
		.map((sheet) => {
			try {
				return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
			} catch {
				return '';
			}
		})
		.join('\n');

	const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${viewEl.outerHTML}</body></html>`;

	const pdf = await printToPdf(htmlDoc);

	comp.unload();
	viewEl.remove();
	return pdf;
}

async function printToPdf(html: string): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		// @ts-ignore - webview n'est pas dans la d.ts Obsidian
		const webview: Electron.WebviewTag = document.createElement('webview');
		webview.nodeintegration = true;
		webview.classList.add('plik-hidden');

		let settled = false;
		const cleanup = (err?: Error) => {
			if (settled) return;
			settled = true;
			window.clearTimeout(timeout);
			if (err) reject(err);
		};
		const timeout = window.setTimeout(() => {
			webview.remove();
			cleanup(new Error('PDF render timed out'));
		}, 30000);

		webview.addEventListener('dom-ready', async () => {
			try {
				const data: Buffer = await webview.printToPDF({
					pageSize: 'A4',
					printBackground: true,
				});
				if (settled) return;
				resolve(new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
			} catch (error) {
				cleanup(error instanceof Error ? error : new Error(String(error)));
			} finally {
				webview.remove();
				window.clearTimeout(timeout);
			}
		});
		webview.addEventListener('did-fail-load', (e: { errorDescription?: string }) => {
			cleanup(new Error(`webview load failed: ${e.errorDescription ?? ''}`));
		});
		webview.src = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
		document.body.appendChild(webview);
	});
}