
import { setIcon, TFile, Menu } from 'obsidian';
import { GRANULARITY_LIST, GRANULARITY_TO_PERIODICITY, FILEINFO_TO_DISPLAY, FILEINFO_TO_DISPLAY_DAY,DAYS_PER_UNIT,  } from './main';
import { createAndOpenDailyNote } from 'src/createAndOpenDailyNote';
import { ModalExtract } from 'src/modalExtract';
import {type CalendarSet,} from 'src/periodicNotesTypes';
import { createAndOpenPeriodicNote } from './createAndOpenPeriodicNote';
import { IGranularity } from 'obsidian-daily-notes-interface';

export function drawUI(): void {
    
    const navHeader: HTMLElement = createDiv("nav-header");
    const navButtonContainer: HTMLElement = navHeader.createDiv("nav-buttons-container");

    // periodic notes
    const granularity = GRANULARITY_LIST[this.activeGranularity];
    
    // アイコン描画
    uiPreviousPage.call(this, navButtonContainer, granularity);
    uiNextPage.call(this, navButtonContainer, granularity);
    uiReturnHome.call(this, navButtonContainer);
    // uiUpdate.call(this, navButtonContainer);
    uiSetting.call(this, navButtonContainer, granularity);
    uiCreateDailyNote.call(this, navButtonContainer, granularity);
    uiExtract.call(this, navButtonContainer);
    uiCollapse.call(this, navButtonContainer);

       
    // 日付の範囲の描画
    const navDateRange: HTMLElement = navHeader.createDiv("nav-date-range");
    let latest = this.searchRange.latest.clone();
    let earliest = this.searchRange.earliest.clone();

    if (this.settings.initialSearchType =='backward'){
        earliest = latest.clone().subtract(this.settings.duration[granularity] - 1 ,granularity);
        if (latest.isSame(window.moment(),"day")){
            latest = latest.add(Math.ceil(this.settings.offset/DAYS_PER_UNIT[granularity]),granularity);
        }
    }
    if (this.settings.initialSearchType =='forward'){
        latest = earliest.clone().add(this.settings.duration[granularity] -1 ,granularity);
    }

    const dateRange: string = earliest.format("YYYY/MM/DD [-] ") + 
        latest.format( earliest.isSame(latest,'year') ?  "MM/DD": "YYYY/MM/DD");
    navDateRange.createDiv("nav-date-range-content").setText(dateRange);

    //日付範囲クリック時の動作 後で変更する
    navDateRange.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            event.preventDefault();
            const onsetDate = window.moment(this.settings.onset,"YYYY-MM-DD");
            if (onsetDate.isValid()){
                this.searchRange.earliest = onsetDate;
                this.searchRange.latest = onsetDate.clone().add(this.settings.duration.day -1,'days');
            } else {  
                // onsetDateが不正なら当日起点のbackward searchを行う
                this.searchRange.latest = window.moment().startOf('day');
                this.searchRange.earliest = window.moment().startOf('day').subtract(this.settings.duration.day - 1,'days')
            }
            this.refreshView(false, true, true);
        }
    );

    // Periodic Notes 粒度描画 & 粒度切り替え処理
    if (this.settings.periodicNotesEnabled){
        const navGranularity: HTMLElement = navHeader.createDiv("nav-date-range");
        navGranularity.createDiv("nav-date-range-content").setText(GRANULARITY_LIST[this.activeGranularity]);

        navGranularity.addEventListener(
            "click",
            (evet:MouseEvent) =>{
                if (this.settings.showDebugInfo){
                    console.log('DNO:clicked to change granularity. verPN, calendarSets:',this.activeGranularity, this.verPN, this.calendarSets);
                }
                const initialGranularity = this.activeGranularity;
                do {
                    this.activeGranularity = (this.activeGranularity + 1) % GRANULARITY_LIST.length;
                } while ((
                    (this.verPN == 2 && !this.calendarSets[this.activeSet][GRANULARITY_LIST[this.activeGranularity]]?.enabled) ||
                    (this.verPN == 1 && !this.app.plugins.getPlugin("periodic-notes").settings?.[GRANULARITY_TO_PERIODICITY[GRANULARITY_LIST[this.activeGranularity]]]?.enabled)
                    ) && this.activeGranularity != initialGranularity)
                    
                this.app.workspace.requestSaveLayout();
                this.refreshView(true, true, true); 
            }
        )

        // コンテキストメニュー
        navGranularity.addEventListener(
            "contextmenu",
            (event: MouseEvent) =>{
                const menu = new Menu();
                for (let i=0 ; i<GRANULARITY_LIST.length; i++){
                    if (
                        (this.verPN ==2 && this.calendarSets[this.activeSet][GRANULARITY_LIST[i]]?.enabled)||
                        (this.verPN ==1 && this.app.plugins.getPlugin("periodic-notes").settings?.[GRANULARITY_TO_PERIODICITY[GRANULARITY_LIST[i]]]?.enabled)
                        ){
                        const icon = ( i == this.activeGranularity)? "check":"";
                        menu.addItem((item)=>
                            item
                                .setTitle(GRANULARITY_LIST[i])
                                .setIcon(icon)
                                .onClick( ()=> {
                                    this.activeGranularity = i;
                                    this.app.workspace.requestSaveLayout();
                                    this.refreshView(true,true,true);
                                })
                        );
                    }
                }
                menu.showAtMouseEvent(event);
            }
        )
    }
    // Periodic Notes カレンダーセット描画 & セット切り替え処理
    if (this.settings.calendarSetsEnabled){
        const navCalendarSet: HTMLElement = navHeader.createDiv("nav-date-range");
        navCalendarSet.createDiv("nav-date-range-content").setText(this.calendarSets[this.activeSet].id);
    
        navCalendarSet.addEventListener(
            "click",
            (evet:MouseEvent) =>{
                this.activeSet = (this.activeSet + 1) % this.calendarSets.length;
                this.app.workspace.requestSaveLayout();
                this.refreshView(false,true,true);
            }
        )

        // コンテキストメニュー
        navCalendarSet.addEventListener(
            "contextmenu",
            (event: MouseEvent) =>{
                const menu = new Menu();
                for (let i=0 ; i<this.calendarSets.length; i++){
                    const icon = ( i == this.activeSet)? "check":"";
                    menu.addItem((item)=>
                        item
                            .setTitle(this.calendarSets[i].id)
                            .setIcon(icon)
                            .onClick( ()=> {
                                this.activeSet = i;
                                this.app.workspace.requestSaveLayout();
                                this.refreshView(false,true,true);
                            })
                    );
                }
                menu.showAtMouseEvent(event);
            }
        )
    }

    // 描画
    this.contentEl.empty();
    this.contentEl.appendChild(navHeader);
}


//過去に移動
function uiPreviousPage (parentEl: HTMLElement, granularity: IGranularity):void{

    let navActionButton: HTMLElement = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "previous notes";
    setIcon(navActionButton,"arrow-left");

    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.searchRange.latest = this.searchRange.latest.subtract(this.settings.duration[granularity], granularity);
            this.searchRange.earliest = this.searchRange.earliest.subtract(this.settings.duration[granularity],granularity);
            this.refreshView(false, true, true);
        }
    );
}

//未来に移動
function uiNextPage (parentEl: HTMLElement, granularity: IGranularity):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "next notes";
    setIcon(navActionButton,"arrow-right");

    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.searchRange.latest = this.searchRange.latest.add(this.settings.duration[granularity],granularity);
            this.searchRange.earliest = this.searchRange.earliest.add(this.settings.duration[granularity],granularity);
            this.refreshView(false, true, true);
        }
    );
}

// ホームに戻る
function uiReturnHome (parentEl: HTMLElement):void {
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "home";
    setIcon(navActionButton,"home");
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.resetSearchRange();
            this.refreshView(false, true, true);
        }
    );
    navActionButton.addEventListener(
        "contextmenu",
        (event: MouseEvent) => {
            const menu = new Menu();
            // 更新
            menu.addItem((item)=>
                item
                    .setTitle("refresh view")
                    .setIcon("refresh-cw")
                    .onClick(async()=>{
                        this.refreshView(true, true, true);
                    })
            );
            menu.showAtMouseEvent(event);
        }
    );
}

//更新
function uiUpdate (parentEl: HTMLElement):void {
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "refresh";
    setIcon(navActionButton,"refresh-cw");
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            // this.resetSearchRange();
            this.refreshView(true, true, true);
        }
    );
}

//設定
function uiSetting(parentEl: HTMLElement, granularity: IGranularity):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    navActionButton.ariaLabel = "open settings";
    setIcon(navActionButton,"settings");
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.app.setting.open();
            this.app.setting.openTabById(this.plugin.manifest.id);
        }
    );
    navActionButton.addEventListener(
        "contextmenu",
        (event: MouseEvent) => {
            const menu = new Menu();
            for (const element in this.settings.showElements){
                const icon = ( this.settings.showElements[element] == true)? "check":"";
                menu.addItem((item)=>
                    item
                        .setTitle(`show ${element}`)
                        .setIcon(icon)
                        .onClick(async()=>{
                            this.settings.showElements[element] = !this.settings.showElements[element];
                            await this.plugin.saveSettings();
                            this.refreshView(false,false,false);
                        })
                );
            }
            if (this.settings.showElements.listItems){
                const icon = (this.settings.taskOnly)? "check": "";
                menu.addItem((item)=>
                    item
                        .setTitle("tasks only")
                        .setIcon(icon)
                        .onClick(async()=>{
                            this.settings.taskOnly = !this.settings.taskOnly;
                            await this.plugin.saveSettings();
                            this.refreshView(false,false,false);
                        })
                );
            }

            const iconBacklink = (this.settings.showBacklinks == true)? "check":"";
            menu.addItem((item)=>
            item
                .setTitle(`show backlink files`)
                .setIcon(iconBacklink)
                .onClick(async()=>{
                    this.settings.showBacklinks = !this.settings.showBacklinks;
                    await this.plugin.saveSettings();
                    this.refreshView(false,false,false);
                })
            );

            menu.addSeparator();
            if (granularity =='day'){
                for (let index in FILEINFO_TO_DISPLAY_DAY){
                    const icon = ( index == this.settings.displayFileInfoDaily)? "check":"";
                    menu.addItem((item)=>
                        item
                            .setTitle(FILEINFO_TO_DISPLAY_DAY[index])
                            .setIcon(icon)
                            .onClick( async()=> {
                                this.settings.displayFileInfoDaily = index;
                                await this.plugin.saveSettings();
                                this.refreshView(false,false,false)
                            }))
                }
            } else {
                for (let index in FILEINFO_TO_DISPLAY){
                    const icon = ( index == this.settings.displayFileInfoPeriodic)? "check":"";
                    menu.addItem((item)=>
                        item
                            .setTitle(FILEINFO_TO_DISPLAY[index])
                            .setIcon(icon)
                            .onClick( async()=> {
                                this.settings.displayFileInfoPeriodic = index;
                                await this.plugin.saveSettings();
                                this.refreshView(false,false,false)
                            }))
                }
            }
            menu.addSeparator();

            const iconTooltip = (this.settings.tooltipPreview)? "check":"";
            menu.addItem((item)=>
                item
                    .setTitle("show tooltip preview")
                    .setIcon(iconTooltip)
                    .onClick(async()=>{
                        this.settings.tooltipPreview = !this.settings.tooltipPreview;
                        await this.plugin.saveSettings();
                        this.refreshView(false,false,false);
                    })
            );
            menu.showAtMouseEvent(event);
        }
    );
}

// デイリーノート作成
function uiCreateDailyNote(parentEl:HTMLElement, granularity: IGranularity):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");

    // periodic noteのオンオフや粒度に従ってラベルを作成
    let labelForToday: string = 'create/open ';
    let labelForNext: string = 'create/open ';
    if (granularity == 'day'){
        labelForToday = labelForToday + "today's ";
        labelForNext = labelForNext + "tomorrow's ";
    } else {
        labelForToday = labelForToday + "present ";
        labelForNext = labelForNext + "next ";
    }
    labelForToday = labelForToday + GRANULARITY_TO_PERIODICITY[granularity] + ' note';
    labelForNext = labelForNext + GRANULARITY_TO_PERIODICITY[granularity] + ' note';

    if (this.verPN == 2){
        labelForToday = labelForToday + ' for ' + this.calendarSets[this.activeSet].id;
        labelForNext = labelForNext + ' for ' + this.calendarSets[this.activeSet].id;
    }

    navActionButton.ariaLabel = labelForToday;
    setIcon(navActionButton,"calendar-plus");
    navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            event.preventDefault;
            const date = window.moment();

            if (this.verPN == 2){
                createAndOpenPeriodicNote( granularity, date, this.calendarSets[this.activeSet]);
            } else {
                createAndOpenDailyNote(granularity, date, this.allDailyNotes);
            }
        }
    );
    navActionButton.addEventListener(
        "contextmenu",
        (event: MouseEvent) => {
            const menu = new Menu();
            menu.addItem((item) =>
                item
                    // .setTitle("create/open tomorrow's daily note")
                    .setTitle(labelForNext)
                    .setIcon("calendar-plus")
                    .onClick(async ()=> {
                        const date = window.moment().add(1,granularity);
                        if (this.verPN == 2){
                            createAndOpenPeriodicNote(granularity, date, this.calendarSets[this.activeSet]); 
                        } else {
                            createAndOpenDailyNote(granularity, date, this.allDailyNotes); 
                        }
                    })
            );
            menu.showAtMouseEvent(event);
        }
    );
}

//抽出
function uiExtract(parentEl: HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    if (!this.extractMode){
        //抽出をオンに
        navActionButton.ariaLabel = "extract";
        setIcon(navActionButton,"search");
        navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            //入力モーダルを開く
            event.preventDefault;
            const onSubmit = (enableExtract: boolean) => {
                if (enableExtract){
                    this.extractMode = true;
                    this.refreshView(false,false,false);
                }
            }

            new ModalExtract(this.app, this.plugin, onSubmit).open();
        });
    } else {
        //抽出をオフに
        navActionButton.ariaLabel = "unextract";
        setIcon(navActionButton,"x-circle");
        navActionButton.classList.add('is-active');
        navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.extractMode = false;
            this.extractTask = false;
            this.refreshView(false,false,false);

        });
    }
    navActionButton.addEventListener(
        "contextmenu",
        (event: MouseEvent) => {
            const menu = new Menu();
            menu.addItem((item) =>
                item
                    .setTitle("extract tasks")
                    .setIcon("check-square")
                    .onClick(async ()=> {
                        this.extractMode = true;
                        this.extractTask = true;
                        this.refreshView(false,false,false); 
                    })
            );
            menu.showAtMouseEvent(event);
        }
    );

}

//全体フォールド

function uiCollapse (parentEl:HTMLElement):void{
    let navActionButton = parentEl.createDiv("clickable-icon nav-action-button");
    if (this.collapseAll){
        navActionButton.classList.add('is-active');
    }
    if (!this.collapseAll){
        //全体フォールドをオンに
        navActionButton.ariaLabel = "collapse all";
        setIcon(navActionButton,"chevrons-down-up");
        navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.collapseAll = true;
            this.refreshView(false,false,false);
        });
    } else {
        //全体フォールドをオフに
        navActionButton.ariaLabel = "expand";
        setIcon(navActionButton,"chevrons-down-up");
        navActionButton.addEventListener(
        "click",
        async (event:MouseEvent) =>{
            this.collapseAll = false;
            this.refreshView(false,false,false);

        });
    }
}