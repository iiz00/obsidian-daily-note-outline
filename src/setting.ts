import DailyNoteOutlinePlugin, { DEFAULT_SETTINGS } from "../main";
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

        //カレンダープラグインから。デイリーノートのチェック(periodic notes だけでもonになっていれば回避)
        if (!appHasDailyNotesPluginLoaded()) {

            console.log('DN disabled');

            this.containerEl.createDiv("settings-banner", (banner) => {
              banner.createEl("h3", {
                text: "Daily Notes plugin not enabled",
              });
            });
          }
        
          console.log('DN check finished');


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
                        console.log(this.plugin.settings.duration);
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
                    .onChange(async (value) =>{
                        this.plugin.settings.offset = Number(value);
                        await this.plugin.saveSettings();
                    })
                text.inputEl.onblur = async (e: FocusEvent) => {
                    let inputedValue = Number((e.target as HTMLInputElement).value);
                    if (inputedValue < 0){
                        inputedValue = 0;
                    } else if (inputedValue >=366) {
                        inputedValue = 366
                    }
                        this.plugin.settings.offset = inputedValue;
                        await this.plugin.saveSettings();
                        console.log(this.plugin.settings.offset);
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
                })

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

        //表示する見出しレベル
        this.containerEl.createEl("h4", {
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

    }
}