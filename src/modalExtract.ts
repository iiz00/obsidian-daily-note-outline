
import { App, Modal, Scope, Setting } from 'obsidian';
import DailyNoteOutlinePlugin from 'src/main';
export class ModalExtract extends Modal {
	plugin: DailyNoteOutlinePlugin;
	scope: Scope;

	inputedValue: string;
	enableExtract : boolean;
	onSubmit: (enableExtract: boolean) => void;

	constructor(app: App, plugin: DailyNoteOutlinePlugin, onSubmit: (enableExtract: boolean) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("br");

		new Setting(contentEl)
			.setName("Extract by word or phrase:")
			.addText((text) =>{
				text.setValue(this.plugin.settings.wordsToExtract);
				text.onChange((value) => {
					this.inputedValue = value
				});
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Extract")
					.setCta()
					.onClick(
						async () => {
						this.close();
						this.plugin.settings.wordsToExtract = this.inputedValue;
						await this.plugin.saveSettings();
						this.onSubmit(true);
						}
					))
			.addButton((btn) =>
				btn
					.setButtonText("Cancel")
					.onClick(() => {
						this.close();
					}));
		// Enterでの入力に後で対応したい
		// this.scope.register([], 'Enter', 
		// 	(evt: KeyboardEvent)=>{
		// 	}
		// 	);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
