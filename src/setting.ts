import DailyNoteOutlinePlugin, { DEFAULT_SETTINGS } from "src/main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { appHasDailyNotesPluginLoaded } from "obsidian-daily-notes-interface";

import moment from "moment"

export class DailyNoteOutlineSettingTab extends PluginSettingTab {
    plugin: DailyNoteOutlinePlugin;

    constructor(app: App, plugin: DailyNoteOutlinePlugin) {
        super (app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        // デイリーノートのチェック(periodic notes だけでもonになっていれば回避)
        if (!appHasDailyNotesPluginLoaded()) {
            console.log('Daily Note disabled');
            this.containerEl.createDiv("settings-banner", (banner) => {
                banner.createEl("h3", {
                    text: "Daily Notes plugin not enabled",
                });
            });
        }

        this.containerEl.createEl("h4", {
            text: "Basics",
        });

        new Setting(containerEl)
            .setName("Initial search type")
            .setDesc("search backward from today / forward from a specific date")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("backward", "backward")
                    .addOption("forward","forward")
                    .setValue(this.plugin.settings.initialSearchType)
                    .onChange(async (value) => {
                      this.plugin.settings.initialSearchType = value;
                      this.display();
                      await this.plugin.saveSettings();
                    })
            });

        new Setting(containerEl)
            .setName("Search duration")
            .setDesc("number of days to search per page (default = 28)")
            .addText((text) => {
                text.inputEl.setAttr('type','number');
                text
                    .setPlaceholder(String(DEFAULT_SETTINGS.duration))
                    .setValue(String(this.plugin.settings.duration))
                    /*
                    .onChange(async (value) =>{
                        this.plugin.settings.duration = Number(value);
                        await this.plugin.saveSettings();
                       
                    }) */
                text.inputEl.onblur = async (e: FocusEvent) => {
                    let parsed = parseInt((e.target as HTMLInputElement).value,10);
                    if (parsed <= 0 || parsed >=366){
                        parsed = DEFAULT_SETTINGS.duration
                    }
                    this.plugin.settings.duration = parsed;
                    await this.plugin.saveSettings();
                }
                    
            });
        

        
        new Setting(containerEl)
            .setName("Include future daily notes")
            .setDesc("in backward search, include n days of future daily notes (default = 5)")
            .addText((text) => {
                text.inputEl.setAttr('type','number');
                text
                    .setPlaceholder(String(DEFAULT_SETTINGS.offset))
                    .setValue(String(this.plugin.settings.offset))
                    /*
                    .onChange(async (value) =>{
                        this.plugin.settings.offset = Number(value);
                        await this.plugin.saveSettings();
                    }) */
                text.inputEl.onblur = async (e: FocusEvent) => {
                    let inputedValue = Number((e.target as HTMLInputElement).value);
                    if (inputedValue < 0){
                        inputedValue = 0;
                    } else if (inputedValue >=366) {
                        inputedValue = 366
                    }
                    this.plugin.settings.offset = inputedValue;
                    await this.plugin.saveSettings();
                }
            });

        new Setting(containerEl)
            .setName("Onset date")
            .setDesc("onset date in forward search (YYYY-MM-DD)")
            .addText((text) => {
                text
                    .setPlaceholder(DEFAULT_SETTINGS.onset)
                    .setValue(this.plugin.settings.onset)
                    .onChange(async (value) =>{
                                                this.plugin.settings.onset = value;
                            await this.plugin.saveSettings();
            
                        // 入力場面でのバリデーション、断念…
                        /*
                        if (moment(value , "YYYY-MM-DD").isValid()){
                            this.plugin.settings.onset = value;
                            await this.plugin.saveSettings();
                        } else {
                            this.containerEl.createEl("h4", {
                                text: "invalid date",
                              });
                            console.log(this.plugin.settings.onset, moment(this.plugin.settings.onset));
                        }
                        
                        console.log('ひづけ後',this.plugin.settings.onset);
                        //console.log('isMoment',moment.isMoment(this.plugin.settings.onset));
                        //console.log('isMomentPlus',moment.isMoment(moment(this.plugin.settings.onset)),moment(this.plugin.settings.onset));
                        //console.log('isValid',moment(this.plugin.settings.onset,"YYYY-MM-DD").isValid());
                        */
                    })
            });
        

        new Setting(containerEl)
            .setName("Show headings")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.showElements.heading)
                    .onChange(async (value) => {
                        this.plugin.settings.showElements.heading = value;
                        this.display();
                        await this.plugin.saveSettings();
                    })
            });


        new Setting(containerEl)
            .setName("Show links")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.showElements.link)
                    .onChange(async (value) => {
                        this.plugin.settings.showElements.link = value;
                        this.display();
                        await this.plugin.saveSettings();
                    })
            });

        new Setting(containerEl)
            .setName("Show tags")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.showElements.tag)
                    .onChange(async (value) => {
                        this.plugin.settings.showElements.tag = value;
                        this.display();
                        await this.plugin.saveSettings();
                    })

            });

        new Setting(containerEl)
            .setName("Show list items")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.showElements.listItems)
                    .onChange(async (value) => {
                        this.plugin.settings.showElements.listItems = value;
                        this.display();
                        await this.plugin.saveSettings();
                    })

            });

        new Setting(containerEl)
            .setName("Show all root list items")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.allRootItems)
                    .onChange(async (value) => {
                        this.plugin.settings.allRootItems = value;
                        this.display();
                        await this.plugin.saveSettings();
                    })

            });

        // 表示する情報
        new Setting(containerEl)
        .setName("Display file information")
        .setDesc("display the number of lines of the file / days from the base date with the file name")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("none", "none")
                .addOption("lines","lines")
                .addOption("days","days")
                .setValue(this.plugin.settings.displayFileInfo)
                .onChange(async (value) => {
                  this.plugin.settings.displayFileInfo = value;
                  this.display();
                  await this.plugin.saveSettings();
                })
        });

        
        //表示する見出しレベル
        this.containerEl.createEl("h4", {
            text: "Headings",
        });
        this.containerEl.createEl("h5", {
            text: "Heading level to display",
        });
        this.plugin.settings.headingLevel.forEach( (value, index, arry) => {
            new Setting(containerEl)
                .setName(`level${ index + 1}`)
                .addToggle((toggle)=> {
                    toggle
                        .setValue(this.plugin.settings.headingLevel[index])
                        .onChange(async (value) => {
                            this.plugin.settings.headingLevel[ index ] = value;
                            this.display();
                            await this.plugin.saveSettings();
                        })
                });
        });

        // プレビュー
        this.containerEl.createEl("h4", {
            text: "Preview",
        });

        new Setting(containerEl)
        .setName("inline preview")
        .setDesc("Show a few subsequent words next to the outline element name")
        .addToggle((toggle) => {
            toggle
                .setValue(this.plugin.settings.inlinePreview)
                .onChange(async (value) => {
                    this.plugin.settings.inlinePreview = value;
                    this.display();
                    await this.plugin.saveSettings();
                })

        });

        new Setting(containerEl)
        .setName("tooltip preview")
        .setDesc("Show subsequent sentences as a tooltip when hover")
        .addToggle((toggle) => {
            toggle
                .setValue(this.plugin.settings.tooltipPreview)
                .onChange(async (value) => {
                    this.plugin.settings.tooltipPreview = value;
                    this.display();
                    await this.plugin.saveSettings();
                })

        });

        new Setting(containerEl)
        .setName("tooltip preview direction")
        .setDesc("specify the direction to display tooltip preview")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("left", "left")
                .addOption("right","right")
                .addOption("bottom","bottom")
                .addOption("top","top")
                .setValue(this.plugin.settings.tooltipPreviewDirection)
                .onChange(async (value) => {
                  this.plugin.settings.tooltipPreviewDirection = value;
                  this.display();
                  await this.plugin.saveSettings();
                })
        });

        // フィルター
        this.containerEl.createEl("h4", {
            text: "Filter",
        });
        new Setting(containerEl)
        .setName("headings to ignore")
        .setDesc("Headings which include listed words will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.headingsToIgnore.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.headingsToIgnore = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        })

        new Setting(containerEl)
        .setName("links to ignore")
        .setDesc("Links which include listed words will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.linksToIgnore.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.linksToIgnore = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        })

        new Setting(containerEl)
        .setName("tags to ignore")
        .setDesc("tags which include listed words will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.tagsToIgnore.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.tagsToIgnore = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        })

        new Setting(containerEl)
        .setName("list items to ignore")
        .setDesc("List items which include listed words will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.listItemsToIgnore.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.listItemsToIgnore = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        })

    }
}