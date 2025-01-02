import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	hideByDefault: boolean;
	pathExceptions: string[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	hideByDefault: false,
	pathExceptions: []
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private styleEl: HTMLStyleElement;
	private isEnabled: boolean = true;

	async onload() {
		await this.loadSettings();

		// Create stylesheet element
		this.styleEl = document.createElement('style');
		this.styleEl.id = 'file-tree-focus-styles';
		document.head.appendChild(this.styleEl);
		this.updateStyles();

		this.addCommand({
			id: 'toggle-file-tree-focus',
			name: 'Toggle file tree focus',
			callback: () => {
				this.isEnabled = !this.isEnabled;
				this.updateStyles();
				new Notice(`${this.isEnabled ? 'Enabled' : 'Disabled'} file tree focus`);
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		// Remove the stylesheet when plugin is disabled
		if (this.styleEl && this.styleEl.parentNode) {
			this.styleEl.parentNode.removeChild(this.styleEl);
		}
	}

	public updateStyles() {
		if (!this.styleEl) return;

		if (this.isEnabled) {
			const css = this.settings.hideByDefault
				? `
					.tree-item { display: none }
					${this.settings.pathExceptions.map(path => 
						`.tree-item:has(> .tree-item-self[data-path^="${path}"]) { display: block }`
					).join('\n')}
				`
				: this.settings.pathExceptions.map(path => 
					`.tree-item:has(> .tree-item-self[data-path^="${path}"]) { display: none }`
				).join('\n');
			
			this.styleEl.textContent = css;
		} else {
			this.styleEl.textContent = '';
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Hide by default')
			.setDesc('If enabled, hides all folders except those listed below. If disabled, shows all folders except those listed below.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideByDefault)
				.onChange(async (value) => {
					this.plugin.settings.hideByDefault = value;
					await this.plugin.saveSettings();
					this.plugin.updateStyles();
				}));

		new Setting(containerEl)
			.setName('Path Exceptions')
			.setDesc('List of paths that are exceptions to the default behavior')
			.addTextArea(text => text
				.setPlaceholder('One path per line')
				.setValue(this.plugin.settings.pathExceptions.join('\n'))
				.onChange(async (value) => {
					this.plugin.settings.pathExceptions = value
						.split('\n')
						.map(p => p.trim())
						.filter(p => p.length > 0);
					await this.plugin.saveSettings();
					this.plugin.updateStyles();
				}));
	}
}
