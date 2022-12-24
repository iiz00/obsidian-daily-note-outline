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
        this.containerEl.createEl("p", {
            text: "Heading level to display",
        });
        this.plugin.settings.headingLevel.forEach( (value, index, arry) => {
            new Setting(containerEl)
                .setName(`Level${ index + 1}`)
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
        .setName("Inline preview")
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
        .setName("Tooltip preview")
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
        .setName("Tooltip preview direction")
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
            text: "Simple filter",
        });
        new Setting(containerEl)
        .setName("Headings to ignore")
        .setDesc("Headings which include listed words will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.wordsToIgnore.heading.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.wordsToIgnore.heading = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        });

        new Setting(containerEl)
        .setName("Links to ignore")
        .setDesc("Links which include listed words will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.wordsToIgnore.link.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.wordsToIgnore.link = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        });

        new Setting(containerEl)
        .setName("Tags to ignore")
        .setDesc("tags which include listed words will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.wordsToIgnore.tag.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.wordsToIgnore.tag = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        });

        new Setting(containerEl)
        .setName("List items to ignore")
        .setDesc("List items which include listed words will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.wordsToIgnore.listItems.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.wordsToIgnore.listItems = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        });

        // Include / Exclude
        this.containerEl.createEl("h4", {
            text: "Include",
        });
        this.containerEl.createEl("p", {
            text: "If you specify one type of outline elements and words to include, only elements which belong to the included elements are displayed."
        });
        new Setting(containerEl)
        .setName("Element type for include")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("none", "none")
                .addOption("heading","heading")
                .addOption("link","link")
                .addOption("tag","tag")
                .addOption("listItems","listItems")
                .setValue(this.plugin.settings.includeOnly)
                .onChange(async (value) => {
                  this.plugin.settings.includeOnly = value;
                  this.display();
                  await this.plugin.saveSettings();
                })
        });
        new Setting(containerEl)
        .setName("Words to include")
        .setDesc("Only elements specified in 'Include only' which include listed words will be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.wordsToInclude.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.wordsToInclude = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        });

        new Setting(containerEl)
        .setName("Include the beginning part")
        .setDesc("Specify whether to include the beginning parts of each daily note with no element to include ")
        .addToggle((toggle) => {
            toggle
                .setValue(this.plugin.settings.includeBeginning)
                .onChange(async (value) => {
                    this.plugin.settings.includeBeginning = value;
                    this.display();
                    await this.plugin.saveSettings();
                })

        });

        this.containerEl.createEl("h4", {
            text: "Exclude",
        });
        this.containerEl.createEl("p", {
            text: "Specified outline elements and elements belonging to that element will not be displayed."
        });
        new Setting(containerEl)
        .setName("Excluding ends at")
        .setDesc("Excluding elements specified below ends at the selected type of elements. If you specified 'Element type for include' above, this value is ignored and excludeing elements ends at that type of elements.")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("none", "none")
                .addOption("heading","heading")
                .addOption("link","link")
                .addOption("tag","tag")
                .addOption("listItems","listItems")
                .setValue(this.plugin.settings.primeElement)
                .onChange(async (value) => {
                  this.plugin.settings.primeElement = value;
                  this.display();
                  await this.plugin.saveSettings();
                })
        });
        new Setting(containerEl)
        .setName("Headings to exclude")
        .setDesc("Headings which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.wordsToExclude.heading.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.wordsToExclude.heading = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        });

        new Setting(containerEl)
        .setName("Links to exclude")
        .setDesc("Links which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.wordsToExclude.link.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.wordsToExclude.link = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        });

        new Setting(containerEl)
        .setName("Tags to exclude")
        .setDesc("tags which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.wordsToExclude.tag.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.wordsToExclude.tag = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        });

        new Setting(containerEl)
        .setName("List items to exclude")
        .setDesc("List items which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
        .addTextArea((textArea) =>{
            textArea.setValue(this.plugin.settings.wordsToExclude.listItems.join('\n'));
            textArea.inputEl.onblur = async (e: FocusEvent ) => {
                const inputedValue = (e.target as HTMLInputElement).value;
                this.plugin.settings.wordsToExclude.listItems = inputedValue.split('\n');
                await this.plugin.saveSettings();
            }
        });
    }
}