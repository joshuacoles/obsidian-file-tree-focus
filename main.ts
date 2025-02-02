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
			const withinException = this.settings.hideByDefault 
				? 'display: block' 
				: 'display: none';

			const selectorPrefixes = ['=', '~=', '|=', '^=', '$=', '*='];

			const exceptions = this.settings.pathExceptions
				.filter(path => path.length > 0)
				.map(path => {
					const pathSelector = selectorPrefixes.some(prefix => path.startsWith(prefix))
						? `data-path${path}`
						: `data-path^="${path}"`;

					return `[data-type="file-explorer"] .tree-item:has(> .tree-item-self[${pathSelector}]) { ${withinException} }`;
				}).join('\n');

			const base = this.settings.hideByDefault 
				? '[data-type="file-explorer"] .tree-item { display: none }' 
				: '[data-type="file-explorer"] .tree-item { display: block }';

			const css = `${base}\n${exceptions}`;
			
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

		containerEl.createEl('h3', {text: 'Path Exceptions'});
		const pathListContainer = containerEl.createDiv('path-list-container');

		// Create a setting for each path exception
		this.plugin.settings.pathExceptions.forEach((path, index) => {
			const pathSetting = new Setting(pathListContainer)
				.setClass('obsidian-file-tree-focus-path-setting')
				.addText(text => text
					.setValue(path)
					.onChange(async (value) => {
						this.plugin.settings.pathExceptions[index] = value;
						await this.plugin.saveSettings();
						this.plugin.updateStyles();
					}))
				.addExtraButton(button => button
					.setIcon('trash')
					.setTooltip('Remove path')
					.onClick(async () => {
						this.plugin.settings.pathExceptions.splice(index, 1);
						await this.plugin.saveSettings();
						this.plugin.updateStyles();
						// Refresh the display to show updated list
						this.display();
					}));
			
			// Remove the default bottom margin from settings
			pathSetting.settingEl.style.border = 'none';
		});

		// Add button for new paths
		new Setting(pathListContainer)
			.addButton(button => button
				.setButtonText('Add Path')
				.onClick(async () => {
					this.plugin.settings.pathExceptions.push('');
					await this.plugin.saveSettings();
					this.plugin.updateStyles();
					// Refresh the display to show the new input
					this.display();
				}));
	}
}
