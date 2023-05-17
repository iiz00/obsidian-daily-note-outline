import DailyNoteOutlinePlugin, { DEFAULT_SETTINGS } from "src/main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { appHasDailyNotesPluginLoaded } from "obsidian-daily-notes-interface";

import moment from "moment";


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
        if (!app.internalPlugins.plugins['daily-notes']?.enabled && !app.plugins.plugins['periodic-notes']) {
            this.containerEl.createDiv("settings-banner", (banner) => {
                banner.createEl("h3", {
                    text: "Neither Daily Note plugin nor Periodic Notes community plugin is enabled",
                });
            });
        }

        this.containerEl.createEl("h4", {
            text: "Basics",
            cls: 'setting-category'
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
                      this.plugin.view.resetSearchRange();
                      this.plugin.view.refreshView(false,true,true);
                    })
            });

        new Setting(containerEl)
            .setName("Search duration")
            .setDesc("number of days to search per page (default = 28)")
            .addText((text) => {
                text.inputEl.setAttr('type','number');
                text
                    .setPlaceholder(String(DEFAULT_SETTINGS.duration.day))
                    .setValue(String(this.plugin.settings.duration.day))

                text.inputEl.onblur = async (e: FocusEvent) => {
                    let parsed = parseInt((e.target as HTMLInputElement).value,10);
                    if (parsed <= 0 || parsed >=366){
                        parsed = DEFAULT_SETTINGS.duration.day
                    }
                    this.plugin.settings.duration.day = parsed;
                    await this.plugin.saveSettings();
                    this.plugin.view.resetSearchRange();
                    this.plugin.view.refreshView(false,true,true);
                }
                    
            });
        

        
        new Setting(containerEl)
            .setName("Include future daily notes")
            .setClass('setting-indent')
            .setDesc("in backward search, include n days of future daily notes (default = 5)")
            .addText((text) => {
                text.inputEl.setAttr('type','number');
                text
                    .setPlaceholder(String(DEFAULT_SETTINGS.offset))
                    .setValue(String(this.plugin.settings.offset))

                text.inputEl.onblur = async (e: FocusEvent) => {
                    let inputedValue = Number((e.target as HTMLInputElement).value);
                    if (inputedValue < 0){
                        inputedValue = 0;
                    } else if (inputedValue >=366) {
                        inputedValue = 366
                    }
                    this.plugin.settings.offset = inputedValue;
                    await this.plugin.saveSettings();
                    this.plugin.view.resetSearchRange();
                    this.plugin.view.refreshView(false,true,true);
                }
            });

        new Setting(containerEl)
            .setName("Onset date")
            .setClass('setting-indent')
            .setDesc("onset date in forward search (YYYY-MM-DD)")
            .addText((text) => {
                text
                    .setPlaceholder(DEFAULT_SETTINGS.onset)
                    .setValue(this.plugin.settings.onset)
                    .onChange(async (value) =>{
                        this.plugin.settings.onset = value;
                        await this.plugin.saveSettings();
                        this.plugin.view.resetSearchRange();
                        this.plugin.view.refreshView(false,true,true);   
            
                        // 入力場面でのバリデーション、断念…
                        /*
                        if (moment(value , "YYYY-MM-DD").isValid()){
                            this.plugin.settings.onset = value;
                            await this.plugin.saveSettings();
                        } else {
                            this.containerEl.createEl("h4", {
                                text: "invalid date",
                              });
                        }
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
                        this.plugin.view.refreshView(false,false,true);
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
                        this.plugin.view.refreshView(false,false,true);
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
                        this.plugin.view.refreshView(false,false,true);
                    })

            });

        new Setting(containerEl)
            .setName("Show list items & tasks")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.showElements.listItems)
                    .onChange(async (value) => {
                        this.plugin.settings.showElements.listItems = value;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    })

            });
        if (this.plugin.settings.showElements.listItems){
            new Setting(containerEl)
                .setName("Show all root list items")
                .setDesc("if disabled, only top item of the list is displayed")
                .setClass('setting-indent')
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings.allRootItems)
                        .onChange(async (value) => {
                            this.plugin.settings.allRootItems = value;
                            this.display();
                            await this.plugin.saveSettings();
                            this.plugin.view.refreshView(false,false,true);
                        })

            });
            new Setting(containerEl)
                .setName("Show all tasks")
                .setDesc("show all task items regardless of their level")
                .setClass('setting-indent')
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings.allTasks)
                        .onChange(async (value) => {
                            this.plugin.settings.allTasks = value;
                            this.display();
                            await this.plugin.saveSettings();
                            this.plugin.view.refreshView(false,false,true);
                        })
            });
            new Setting(containerEl)
                .setName("Task only")
                .setDesc("if enabled, normal list items are hidden")
                .setClass('setting-indent')
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings.taskOnly)
                        .onChange(async (value) => {
                            this.plugin.settings.taskOnly = value;
                            this.display();
                            await this.plugin.saveSettings();
                            this.plugin.view.refreshView(false,false,true);
                        })
            });
            new Setting(containerEl)
                .setName("Hide completed tasks")
                .setClass('setting-indent')
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings.hideCompletedTasks)
                        .onChange(async (value) => {
                            this.plugin.settings.hideCompletedTasks = value;
                            this.display();
                            await this.plugin.saveSettings();
                            this.plugin.view.refreshView(false,false,true);
                        })
            });
        }

        // 表示する情報
        new Setting(containerEl)
        .setName("Display file information for daily notes")
        .setDesc("choose type of file information to display with the file name for daily notes")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("none", "none")
                .addOption("lines","lines of the note")
                .addOption("days","days from base date")
                .addOption("dow","day of the week")
                .addOption("dowshort", "day of the week(short)")
                .addOption("weeknumber", "week number")
                .addOption("tag","first tag")  
                .setValue(this.plugin.settings.displayFileInfoDaily)
                .onChange(async (value) => {
                  this.plugin.settings.displayFileInfoDaily = value;
                  this.display();
                  await this.plugin.saveSettings();
                  this.plugin.view.refreshView(false,false,true);
                })
        });

        if (this.plugin.settings.periodicNotesEnabled){
            new Setting(containerEl)
            .setName("Display file information for periodic notes")
            .setDesc("choose type of file information to display for periodic notes other than daily notes")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("none", "none")
                    .addOption("lines","lines of the note")
                    .addOption("days","distance from base date")   // periodic notes に対応するならdays に限らなくなるのでdistanceとした
                    .addOption("tag","first tag")
                    .setValue(this.plugin.settings.displayFileInfoPeriodic)
                    .onChange(async (value) => {
                      this.plugin.settings.displayFileInfoPeriodic = value;
                      this.display();
                      await this.plugin.saveSettings();
                      this.plugin.view.refreshView(false,false,true);
                    })
            });
        }
        

        // viewを表示する位置 （右サイドバー、左サイドバー、メインペイン）
        new Setting(containerEl)
        .setName("Position of the plugin view")
        .setDesc("Specify default position where this plugin's view appears")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("right", "right side pane")
                .addOption("left","left side pane")
                .addOption("tab","new tab in main pane")
                .addOption("split","splitted pane")
                .addOption("popout","popout window")
                .setValue(this.plugin.settings.viewPosition)
                .onChange(async (value) => {
                  this.plugin.settings.viewPosition = value;
                  this.display();
                  await this.plugin.saveSettings();
                  this.plugin.view.refreshView(false,false,true);
                })
        });


        // Periodic Notes対応のオンオフ
        this.containerEl.createEl("h4", {
            text: "Periodic Notes",
            cls: 'setting-category'
        });

        if (!app.plugins.plugins['periodic-notes']){
            this.containerEl.createEl("p", {
                text: "Periodic Notes community plugin is not enabled",
                cls:"setting-item-description",
            });
        } else {
            const verCheck =  Number(app.plugins.plugins['periodic-notes']?.manifest.version.split(".")[0]);
            if (verCheck >= 1) {   
                new Setting(containerEl)
                    .setName("calendar sets")
                    .setDesc("enable calendar sets feature. You have to activate and configure the beta version of the Periodic Notes Plugin first.")
                    .addToggle((toggle) => {
                        toggle
                            .setValue(this.plugin.settings.calendarSetsEnabled)
                            .onChange(async (value) => {
                                this.plugin.settings.calendarSetsEnabled = value;
                                this.display();
                                await this.plugin.saveSettings();
                                this.plugin.view.resetSearchRange();
                                this.plugin.view.refreshView(true,true,true);    
                            })
                    });
            }

            new Setting(containerEl)
                .setName("periodic notes")
                .setDesc("enable weekly/monthly/quarterly/yearly notes. You have to activate and configure the Periodic Notes Plugin first.")
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings.periodicNotesEnabled)
                        .onChange(async (value) => {
                            this.plugin.settings.periodicNotesEnabled = value;
                            this.display();
                            await this.plugin.saveSettings();
                            this.plugin.view.resetSearchRange();
                            this.plugin.view.refreshView(true,true,true);   
                        })
                });
            
            if (this.plugin.settings.periodicNotesEnabled){

                this.containerEl.createEl("p", {
                    text: "Search duration for periodic notes",
                    cls: 'setting-category'
                });

                new Setting(containerEl)
                .setName("weekly notes")
                .setClass('setting-indent')
                .setDesc("number of weeks to search per page (default = 12)")
                .addText((text) => {
                    text.inputEl.setAttr('type','number');
                    text
                        .setPlaceholder(String(DEFAULT_SETTINGS.duration.week))
                        .setValue(String(this.plugin.settings.duration.week))
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        let parsed = parseInt((e.target as HTMLInputElement).value,10);
                        if (parsed <= 0 || parsed >=366){
                            parsed = DEFAULT_SETTINGS.duration.week
                        }
                        this.plugin.settings.duration.week = parsed;
                        await this.plugin.saveSettings();
                        this.plugin.view.resetSearchRange();
                        this.plugin.view.refreshView(false,true,true);
                    }
                });

                new Setting(containerEl)
                .setName("monthly notes")
                .setClass('setting-indent')
                .setDesc("number of months to search per page (default = 12)")
                .addText((text) => {
                    text.inputEl.setAttr('type','number');
                    text
                        .setPlaceholder(String(DEFAULT_SETTINGS.duration.month))
                        .setValue(String(this.plugin.settings.duration.month))
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        let parsed = parseInt((e.target as HTMLInputElement).value,10);
                        if (parsed <= 0 || parsed >=366){
                            parsed = DEFAULT_SETTINGS.duration.month
                        }
                        this.plugin.settings.duration.month = parsed;
                        await this.plugin.saveSettings();
                        this.plugin.view.resetSearchRange();
                        this.plugin.view.refreshView(false,true,true);
                    }
                });

                new Setting(containerEl)
                .setName("quarterly notes")
                .setClass('setting-indent')
                .setDesc("number of quarters to search per page (default = 8)")
                .addText((text) => {
                    text.inputEl.setAttr('type','number');
                    text
                        .setPlaceholder(String(DEFAULT_SETTINGS.duration.quarter))
                        .setValue(String(this.plugin.settings.duration.quarter))
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        let parsed = parseInt((e.target as HTMLInputElement).value,10);
                        if (parsed <= 0 || parsed >=366){
                            parsed = DEFAULT_SETTINGS.duration.quarter
                        }
                        this.plugin.settings.duration.quarter = parsed;
                        await this.plugin.saveSettings();
                        this.plugin.view.resetSearchRange();
                        this.plugin.view.refreshView(false,true,true);
                    }
                });

                new Setting(containerEl)
                .setName("yearly notes")
                .setClass('setting-indent')
                .setDesc("number of years to search per page (default = 12)")
                .addText((text) => {
                    text.inputEl.setAttr('type','number');
                    text
                        .setPlaceholder(String(DEFAULT_SETTINGS.duration.year))
                        .setValue(String(this.plugin.settings.duration.year))
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        let parsed = parseInt((e.target as HTMLInputElement).value,10);
                        if (parsed <= 0 || parsed >=366){
                            parsed = DEFAULT_SETTINGS.duration.year
                        }
                        this.plugin.settings.duration.year = parsed;
                        await this.plugin.saveSettings();
                        this.plugin.view.resetSearchRange();
                        this.plugin.view.refreshView(false,true,true);
                    }
                });
            }
                new Setting(containerEl)
                .setName("attach date range to weekly notes")
                .setDesc("display date range next to weekly notes' name")
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings.attachWeeklyNotesName)
                        .onChange(async (value) => {
                            this.plugin.settings.attachWeeklyNotesName = value;
                            this.display();
                            await this.plugin.saveSettings();
                            this.plugin.view.refreshView(false,false,true);
                        })
                });
        }

        //表示する見出しレベル
        this.containerEl.createEl("h4", {
            text: "Headings",
            cls:"setting-category",
        });
        if (this.plugin.settings.showElements.heading){
            this.containerEl.createEl("p", {
                text: "Heading level to display",
                cls:"setting-item-description",
            });
            this.plugin.settings.headingLevel.forEach( (value, index, arry) => {
                new Setting(containerEl)
                    .setName(`Level${ index + 1}`)
                    .setClass('setting-indent')
                    .addToggle((toggle)=> {
                        toggle
                            .setValue(this.plugin.settings.headingLevel[index])
                            .onChange(async (value) => {
                                this.plugin.settings.headingLevel[ index ] = value;
                                this.display();
                                await this.plugin.saveSettings();
                                this.plugin.view.refreshView(false,false,true);
                            })
                    });
            });
        } else {
            this.containerEl.createEl("p", {
                text: "To display this section, activate 'Show headings' in Basics section.",
                cls:"setting-item-description",
            });
        }

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
                    this.plugin.view.refreshView(false,false,true);
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
                    this.plugin.view.refreshView(false,false,true);
                })

        });

        if (this.plugin.settings.tooltipPreview){
            new Setting(containerEl)
            .setName("Tooltip preview direction")
            .setClass('setting-indent')
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
                    this.plugin.view.refreshView(false,false,true);
                    })
            });
        }

        // フィルター
        this.containerEl.createEl("h4", {
            text: "Simple filter",
            cls: 'setting-category'
        });
        if (this.plugin.settings.showElements.heading){
            new Setting(containerEl)
            .setName("Headings to ignore")
            .setDesc("Headings which include listed words will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToIgnore.heading.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToIgnore.heading = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                }
            });
        }

        if (this.plugin.settings.showElements.link){
            new Setting(containerEl)
            .setName("Links to ignore")
            .setDesc("Links which include listed words will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToIgnore.link.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToIgnore.link = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                }
            });
        }

        if (this.plugin.settings.showElements.tag){
            new Setting(containerEl)
            .setName("Tags to ignore")
            .setDesc("tags which include listed words will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToIgnore.tag.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToIgnore.tag = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                }
            });
        }

        if (this.plugin.settings.showElements.listItems){
            new Setting(containerEl)
            .setName("List items to ignore")
            .setDesc("List items which include listed words will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToIgnore.listItems.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToIgnore.listItems = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                }
            });
        }

        // Include / Exclude
        this.containerEl.createEl("h4", {
            text: "Include",
            cls: 'setting-category'
        });
        this.containerEl.createEl("p", {
            text: "If you specify one outline element type and words to include, only elements which belong to the included elements are displayed.",
            cls:"setting-item-description",
        });
        this.containerEl.createEl("p", {
            text: "**NOTE**: If Include filter is set incorrectly, a number of outlines may not be displayed. In such a case, try setting 'Element type for include' to 'no Include filter'.",
            cls:"setting-item-description",
        });
        new Setting(containerEl)
        .setName("Element type for include")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("none", "no Include filter")
                .addOption("heading","heading")
                .addOption("link","link")
                .addOption("tag","tag")
                .addOption("listItems","listItems")
                .setValue(this.plugin.settings.includeOnly)
                .onChange(async (value) => {
                  this.plugin.settings.includeOnly = value;
                  this.display();
                  await this.plugin.saveSettings();
                  this.plugin.view.refreshView(false,false,true);
                })
        });

        if (this.plugin.settings.includeOnly != 'none'){
            new Setting(containerEl)
            .setName("Words to include")
            .setClass('setting-indent')
            .setDesc("Only elements specified in 'Element type for include' which include listed words will be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToInclude.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToInclude = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                }
            });

            new Setting(containerEl)
            .setName("Include the beginning part")
            .setClass('setting-indent')
            .setDesc("Specify whether to include the beginning parts of each daily note with no element to include ")
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.includeBeginning)
                    .onChange(async (value) => {
                        this.plugin.settings.includeBeginning = value;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    })

            });
        }

        this.containerEl.createEl("h4", {
            text: "Exclude",
            cls: 'setting-category'
        });
        this.containerEl.createEl("p", {
            text: "Specified outline elements and elements belonging to that element will not be displayed.",
            cls:"setting-item-description",
        });
        new Setting(containerEl)
        .setName("Exclusion ends at")
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
                  this.plugin.view.refreshView(false,false,true);
                })
        });

        if (this.plugin.settings.showElements.heading){
            new Setting(containerEl)
            .setName("Headings to exclude")
            .setDesc("Headings which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToExclude.heading.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToExclude.heading = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                }
            });
        }

        if (this.plugin.settings.showElements.link){
            new Setting(containerEl)
            .setName("Links to exclude")
            .setDesc("Links which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToExclude.link.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToExclude.link = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                }
            });
        }


        if (this.plugin.settings.showElements.tag){
            new Setting(containerEl)
            .setName("Tags to exclude")
            .setDesc("tags which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToExclude.tag.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToExclude.tag = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                }
            });
        }

        if (this.plugin.settings.showElements.listItems){
            new Setting(containerEl)
            .setName("List items to exclude")
            .setDesc("List items which include listed words and elements which belong to them will not be displayed. Separate with a new line.")
            .addTextArea((textArea) =>{
                textArea.setValue(this.plugin.settings.wordsToExclude.listItems.join('\n'));
                textArea.inputEl.onblur = async (e: FocusEvent ) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.wordsToExclude.listItems = inputedValue.split('\n');
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                }
            });
        }

        // 外観
        this.containerEl.createEl("h4", {
            text: "Appearance",
            cls: 'setting-category'
        });

        // headingのインデントレベルにあわせて他の要素をインデントするか
        new Setting(containerEl)
        .setName("Indent other than headings")
        .setDesc("Whether other elements should be indented to preceding headings")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("0","none")
                .addOption("1","follow preceding heading")
                .addOption("2","preceding heading + 1")
                .setValue(String(this.plugin.settings.indentFollowHeading))
                .onChange(async (value) => {
                    this.plugin.settings.indentFollowHeading = Number(value);
                    this.display();
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                })
        });

        // デイリーノート
        this.containerEl.createEl("p", {
            text: "Notes",
            cls: 'setting-category'
        });
        
        new Setting(containerEl)
        .setName("Icon")
        .setClass("setting-indent")
        .addDropdown((dropdown) => {
            dropdown
                .addOption("none", "none")
                .addOption("file","file")
                .addOption("calendar","calendar")
                .addOption("calendar-days","calendar-days")
                .setValue(this.plugin.settings.icon.note)
                .onChange(async (value) => {
                    this.plugin.settings.icon.note = value;
                    this.display();
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                })
        });

        if (this.plugin.settings.icon.note == 'custom'){
            new Setting(containerEl)
            .setName("Custom icon")
            .setClass("setting-indent-2")
            .setDesc("enter Lucide Icon name")
            .addText((text) => {
                text.inputEl.setAttr('type','string');
                text
                    .setPlaceholder(DEFAULT_SETTINGS.customIcon.note)
                    .setValue(this.plugin.settings.customIcon.note);
                text.inputEl.onblur = async (e: FocusEvent) => {
                    const inputedValue = (e.target as HTMLInputElement).value;
                    this.plugin.settings.customIcon.note = inputedValue;
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                };
            });
        }

        
        
        // 見出し
        
        if (this.plugin.settings.showElements.heading){
            this.containerEl.createEl("p", {
                text: "Headings",
                cls: 'setting-category'
            });
            new Setting(containerEl)
            .setName("Icon")
            .setClass("setting-indent")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("none", "none")
                    //.addOption("heading","heading")
                    .addOption("hash","hash")
                    .addOption("chevron-right","chevron-right")
                    //.addOption("headingwithnumber","heading with number")
                    .addOption("custom","custom")
                    .setValue(this.plugin.settings.icon.heading)
                    .onChange(async (value) => {
                      this.plugin.settings.icon.heading = value;
                      this.display();
                      await this.plugin.saveSettings();
                      this.plugin.view.refreshView(false,false,true);
                    })
            });

            if (this.plugin.settings.icon.heading == 'custom'){
                new Setting(containerEl)
                .setName("Custom icon")
                .setClass("setting-indent-2")
                .setDesc("enter Lucide Icon name")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.customIcon.heading)
                        .setValue(this.plugin.settings.customIcon.heading);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.customIcon.heading = inputedValue;
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    };
                });
            }

            new Setting(containerEl)
                .setName("Prefix")
                .setClass("setting-indent")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.prefix.heading)
                        .setValue(this.plugin.settings.prefix.heading);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.prefix.heading = inputedValue;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    };
                });

            if (this.plugin.settings.prefix.heading != ''){
                new Setting(containerEl)
                    .setName("Repeat heading prefix")
                    .setClass("setting-indent-2")
                    .addDropdown((dropdown) => {
                        dropdown
                            .addOption("none", "none")
                            .addOption("level","as many times as its level")
                            .addOption("levelminus1","level - 1")
                            .setValue(this.plugin.settings.repeatHeadingPrefix)
                            .onChange(async (value) => {
                              this.plugin.settings.repeatHeadingPrefix = value;
                              this.display();
                              await this.plugin.saveSettings();
                              this.plugin.view.refreshView(false,false,true);
                            })
                    });
            }
            new Setting(containerEl)
            .setName("Add indent")
            .setClass('setting-indent')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.indent.heading)
                    .onChange(async (value) => {
                        this.plugin.settings.indent.heading = value;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    })

            });
        }

        // リンク
        if (this.plugin.settings.showElements.link){
            this.containerEl.createEl("p", {
                text: "Links",
                cls: 'setting-category'
            });
            new Setting(containerEl)
            .setName("Icon")
            .setClass("setting-indent")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("none", "none")
                    .addOption("link","link")
                    .addOption("link-2","link-2")
                    .addOption("custom","custom")
                    .setValue(this.plugin.settings.icon.link)
                    .onChange(async (value) => {
                      this.plugin.settings.icon.link = value;
                      this.display();
                      await this.plugin.saveSettings();
                      this.plugin.view.refreshView(false,false,true);
                    })
            });

            if (this.plugin.settings.icon.link == 'custom'){
                new Setting(containerEl)
                .setName("Custom icon")
                .setClass("setting-indent-2")
                .setDesc("enter Lucide Icon name")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.customIcon.link)
                        .setValue(this.plugin.settings.customIcon.link);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.customIcon.link = inputedValue;
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    };
                });
            }

            new Setting(containerEl)
                .setName("Prefix")
                .setClass("setting-indent")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.prefix.link)
                        .setValue(this.plugin.settings.prefix.link);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.prefix.link = inputedValue;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                };
            });
           
        }

        // タグ
        
        if (this.plugin.settings.showElements.tag){
            this.containerEl.createEl("p", {
                text: "Tags",
                cls: 'setting-category'
            });
            new Setting(containerEl)
            .setName("Icon")
            .setClass("setting-indent")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("none", "none")
                    .addOption("tag","tag")
                    .addOption("hash","hash")
                    .addOption("custom","custom")
                    .setValue(this.plugin.settings.icon.tag)
                    .onChange(async (value) => {
                      this.plugin.settings.icon.tag = value;
                      this.display();
                      await this.plugin.saveSettings();
                      this.plugin.view.refreshView(false,false,true);
                    })
            });

            if (this.plugin.settings.icon.tag == 'custom'){
                new Setting(containerEl)
                .setName("Custom icon")
                .setClass("setting-indent-2")
                .setDesc("enter Lucide Icon name")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.customIcon.tag)
                        .setValue(this.plugin.settings.customIcon.tag);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.customIcon.tag = inputedValue;
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    };
                });
            }

            new Setting(containerEl)
                .setName("Prefix")
                .setClass("setting-indent")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.prefix.tag)
                        .setValue(this.plugin.settings.prefix.tag);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.prefix.tag = inputedValue;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                };
            });
           
        }

        // リスト
        
        if (this.plugin.settings.showElements.link){
            this.containerEl.createEl("p", {
                text: "List items",
                cls: 'setting-category'
            });
            new Setting(containerEl)
            .setName("Icon")
            .setClass("setting-indent")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("none", "none")
                    .addOption("list","list")
                    .addOption("chevron-right","chevron-right")
                    .addOption("minus","minus")
                    .addOption("circle-dot","circle-dot")
                    .addOption("asterisk","asterisk")
                    .addOption("custom","custom")
                    .setValue(this.plugin.settings.icon.listItems)
                    .onChange(async (value) => {
                      this.plugin.settings.icon.listItems = value;
                      this.display();
                      await this.plugin.saveSettings();
                      this.plugin.view.refreshView(false,false,true);
                    })
            });

            if (this.plugin.settings.icon.listItems == 'custom'){
                new Setting(containerEl)
                .setName("Custom icon")
                .setClass("setting-indent-2")
                .setDesc("enter Lucide Icon name")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.customIcon.listItems)
                        .setValue(this.plugin.settings.customIcon.listItems);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.customIcon.listItems = inputedValue;
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    };
                });
            }

            new Setting(containerEl)
                .setName("Prefix")
                .setClass("setting-indent")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.prefix.listItems)
                        .setValue(this.plugin.settings.prefix.listItems);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.prefix.listItems = inputedValue;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                };
            });
            
            //未完了タスク
            this.containerEl.createEl("p", {
                text: "Tasks",
                cls: 'setting-category'
            });
            new Setting(containerEl)
            .setName("Icon")
            .setClass("setting-indent")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("none", "none")
                    .addOption("square","square")
                    .addOption("circle","circle")
                    .addOption("list-checks","list-checks")
                    .addOption("custom","custom")
                    .setValue(this.plugin.settings.icon.task)
                    .onChange(async (value) => {
                      this.plugin.settings.icon.task = value;
                      this.display();
                      await this.plugin.saveSettings();
                      this.plugin.view.refreshView(false,false,true);
                    })
            });

            if (this.plugin.settings.icon.task == 'custom'){
                new Setting(containerEl)
                .setName("Custom icon")
                .setClass("setting-indent-2")
                .setDesc("enter Lucide Icon name")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.customIcon.task)
                        .setValue(this.plugin.settings.customIcon.task);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.customIcon.task = inputedValue;
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    };
                });
            }

            new Setting(containerEl)
                .setName("Prefix")
                .setClass("setting-indent")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.prefix.task)
                        .setValue(this.plugin.settings.prefix.task);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.prefix.task = inputedValue;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                };
            });
            new Setting(containerEl)
            .setName("Add checkbox text to prefix")
            .setDesc("add [ ] or [x]")
            .setClass('setting-indent')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.addCheckboxText)
                    .onChange(async (value) => {
                        this.plugin.settings.addCheckboxText = value;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    })

            });
            //完了済みタスク
            this.containerEl.createEl("p", {
                text: "Completed tasks",
                cls: 'setting-category'
            });
            new Setting(containerEl)
            .setName("Icon")
            .setClass("setting-indent")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("none", "none")
                    .addOption("check-square","check-square")
                    .addOption("check-circle","check-circle")
                    .addOption("check","check")
                    .addOption("custom","custom")
                    .setValue(this.plugin.settings.icon.taskDone)
                    .onChange(async (value) => {
                      this.plugin.settings.icon.taskDone = value;
                      this.display();
                      await this.plugin.saveSettings();
                      this.plugin.view.refreshView(false,false,true);
                    })
            });

            if (this.plugin.settings.icon.taskDone == 'custom'){
                new Setting(containerEl)
                .setName("Custom icon")
                .setClass("setting-indent-2")
                .setDesc("enter Lucide Icon name")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.customIcon.taskDone)
                        .setValue(this.plugin.settings.customIcon.taskDone);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.customIcon.taskDone = inputedValue;
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                    };
                });
            }

            new Setting(containerEl)
                .setName("Prefix")
                .setClass("setting-indent")
                .addText((text) => {
                    text.inputEl.setAttr('type','string');
                    text
                        .setPlaceholder(DEFAULT_SETTINGS.prefix.taskDone)
                        .setValue(this.plugin.settings.prefix.taskDone);
                    text.inputEl.onblur = async (e: FocusEvent) => {
                        const inputedValue = (e.target as HTMLInputElement).value;
                        this.plugin.settings.prefix.taskDone = inputedValue;
                        this.display();
                        await this.plugin.saveSettings();
                        this.plugin.view.refreshView(false,false,true);
                };
            });
           
        }


        this.containerEl.createEl("h4", {
            text: "Others",
            cls: 'setting-category'
        });

        new Setting(containerEl)
        .setName("Show only .md files")
        .setDesc("Turn on if non-md files are displayed in the view")
        .addToggle((toggle) => {
            toggle
                .setValue(this.plugin.settings.markdownOnly)
                .onChange(async (value) => {
                    this.plugin.settings.markdownOnly = value;
                    this.display();
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                })
        });

        new Setting(containerEl)
        .setName("Show only exactly matched files")
        .setDesc("Turn on if you do not want to see files that do not exactly match the format")
        .addToggle((toggle) => {
            toggle
                .setValue(this.plugin.settings.exactMatchOnly)
                .onChange(async (value) => {
                    this.plugin.settings.exactMatchOnly = value;
                    this.display();
                    await this.plugin.saveSettings();
                    this.plugin.view.refreshView(false,false,true);
                })
        });


        this.containerEl.createEl("h4", {
            text: "Debug",
            cls: 'setting-category'
        });

        new Setting(containerEl)
                .setName("show debug information")
                .setDesc("display debug information in the console")
                .addToggle((toggle) => {
                    toggle
                        .setValue(this.plugin.settings.showDebugInfo)
                        .onChange(async (value) => {
                            this.plugin.settings.showDebugInfo = value;
                            this.display();
                            await this.plugin.saveSettings();
                        })
                });
    }
}