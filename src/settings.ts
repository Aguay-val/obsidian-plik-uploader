import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from 'obsidian';
import type PlikUploaderPlugin from './main';
import { TTL_LABELS, type TtlOption } from './ttl';
import { t, detectLocale, setLocale } from './i18n';

export interface PlikSettings {
	serverUrl: string;
	token: string;
	ttl: string;
	purgeExpiredHistory: boolean;
	showSidebar: boolean;
	language: string;
}

export const DEFAULT_SETTINGS: PlikSettings = {
	serverUrl: '',
	token: '',
	ttl: 'week',
	purgeExpiredHistory: false,
	showSidebar: false,
	language: 'auto',
};

export class PlikSettingTab extends PluginSettingTab {
	private readonly plugin: PlikUploaderPlugin;

	constructor(app: App, plugin: PlikUploaderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{ name: t('settings.language'), desc: t('settings.languageDesc') },
			{ name: t('settings.serverUrl'), desc: t('settings.serverUrlDesc') },
			{ name: t('settings.token'), desc: t('settings.tokenDesc') },
			{ name: t('settings.retention'), desc: t('settings.retentionDesc') },
			{ name: t('settings.sidebar'), desc: t('settings.sidebarDesc') },
			{ name: t('settings.purgeExpired'), desc: t('settings.purgeExpiredDesc') },
		];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(t('settings.language'))
			.setDesc(t('settings.languageDesc'))
			.addDropdown((dropdown) => {
				dropdown
					.addOption('auto', t('settings.languageAuto'))
					.addOption('en', 'English')
					.addOption('fr', 'Français')
					.addOption('es', 'Español')
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value;
						await this.plugin.saveSettings();
						const resolved = value === 'auto' ? detectLocale() : value;
						setLocale(resolved);
						this.display();
					});
			});

		new Setting(containerEl)
			.setName(t('settings.serverUrl'))
			.setDesc(t('settings.serverUrlDesc'))
			.addText((text) =>
				text
					.setPlaceholder('https://…')
					.setValue(this.plugin.settings.serverUrl)
					.onChange(async (value) => {
						this.plugin.settings.serverUrl = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t('settings.token'))
			.setDesc(t('settings.tokenDesc'))
			.addText((text) => {
				text.inputEl.type = 'password';
				text
					.setValue(this.plugin.settings.token)
					.onChange(async (value) => {
						this.plugin.settings.token = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName(t('settings.retention'))
			.setDesc(t('settings.retentionDesc'))
			.addDropdown((dropdown) => {
				for (const value of Object.keys(TTL_LABELS) as TtlOption[]) {
					dropdown.addOption(value, TTL_LABELS[value]);
				}
				dropdown.setValue(this.plugin.settings.ttl).onChange(async (value) => {
					this.plugin.settings.ttl = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t('settings.sidebar'))
			.setDesc(t('settings.sidebarDesc'))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showSidebar).onChange(async (value) => {
					this.plugin.settings.showSidebar = value;
					await this.plugin.saveSettings();
					if (value) {
						await this.plugin.activateSidebar();
					} else {
						this.plugin.deactivateSidebar();
					}
				}),
			);

		new Setting(containerEl)
			.setName(t('settings.purgeExpired'))
			.setDesc(t('settings.purgeExpiredDesc'))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.purgeExpiredHistory).onChange(async (value) => {
					this.plugin.settings.purgeExpiredHistory = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
