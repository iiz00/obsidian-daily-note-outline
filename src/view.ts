import { MarkdownView, Notice, setIcon, debounce, Debouncer, Menu, ViewStateResult, View} from 'obsidian';

import { ItemView, WorkspaceLeaf, TFile} from 'obsidian';

import { getAllDailyNotes, getDateFromFile, createDailyNote, getDateUID, 
	getAllWeeklyNotes, getAllMonthlyNotes, getAllQuarterlyNotes, getAllYearlyNotes, IGranularity } from "obsidian-daily-notes-interface";
import moment from "moment"

import DailyNoteOutlinePlugin, { DailyNoteOutlineSettings, OutlineData, FileInfo, DAYS_PER_UNIT,GRANULARITY_LIST, GRANULARITY_TO_PERIODICITY} from 'src/main';

import { createAndOpenDailyNote } from 'src/createAndOpenDailyNote';
import { ModalExtract } from 'src/modalExtract';

// Periodic Notes
import {type CalendarSet,} from 'src/periodicNotesTypes';
import { createAndOpenPeriodicNote } from './createAndOpenPeriodicNote';





export const DailyNoteOutlineViewType = 'daily-note-outline';

// Stateで現在表示中の粒度、カレンダーセットを保持
interface IDailyNoteOutlineState {
	activeSet: number;
	activeGranularity: number;
}

export class DailyNoteOutlineView extends ItemView implements IDailyNoteOutlineState {
	
	private plugin: DailyNoteOutlinePlugin;		
	private settings:DailyNoteOutlineSettings;

	private allDailyNotes: Record<string,TFile>;
	
	private targetFiles: TFile[];
	private fileInfo: FileInfo[];
	private searchRange: {
		latest: moment,
		earliest: moment
	} = {
		latest: moment(),
		earliest: moment()
	};
	private outlineData: OutlineData[][];

	private flagRedraw: boolean;
	private flagRegetAll: boolean;

	private extractMode: boolean = false;
	private extractTask: boolean = false;

	// Periodic Notes
	verPN: number;  // Periodic Notes pluginのバージョン  0：off  1：<1.0.0  2:>=1.0.0 
	calendarSets: CalendarSet[];
	activeSet: number = 0; 
	activeGranularity: number = 0; // day | week | month | quarter | year GRANULARITY_LISTの添え字として
  
	constructor(
		leaf: WorkspaceLeaf,
		plugin: DailyNoteOutlinePlugin,
		settings: DailyNoteOutlineSettings,
	) {
		super(leaf);
		this.plugin = plugin;
		this.settings = settings;
	}
  
	getViewType(): string {
		return DailyNoteOutlineViewType;
	}
  
	getDisplayText(): string {
		return 'Daily Note Outline';
	}
  
	getIcon(): string {
		return 'calendar-clock';
	}

	
	async onOpen(){

		this.initView();
		//  初回のデイリーノート探索処理はinitView()に移動し、実行前にわずかにウエイト(bootDelay)を入れた。
		//  そうしないと起動時に全デイリーノートのデータ取得に失敗するようだったため。

		//自動更新のためのデータ変更、ファイル追加/削除の監視 observe file change/create/delete
		const debouncerRequestRefresh:Debouncer<[]> = debounce(this.autoRefresh,2000,true);
		this.flagRedraw = false;
		this.flagRegetAll = false; 
		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
			if (this.targetFiles.includes(file)){
				this.flagRedraw = true;
				debouncerRequestRefresh.call(this);
			}
		}));

		this.registerEvent(this.app.vault.on('create',(file)=>{
			this.flagRegetAll = true;
			debouncerRequestRefresh.call(this);
		}));
		this.registerEvent(this.app.vault.on('delete',(file)=>{
			this.flagRegetAll = true;
			debouncerRequestRefresh.call(this);
		}));
	}

	async onClose(){
		// Nothin to clean up
	}

	// https://liamca.in/Obsidian/API+FAQ/views/persisting+your+view+state
	async setState(state: IDailyNoteOutlineState, result:ViewStateResult):Promise<void>{
		if (state.activeSet){
			this.activeSet = state.activeSet;
		}
		if (state.activeGranularity){
			this.activeGranularity = state.activeGranularity;
		}
		return super.setState(state, result);
	}

	getState(): IDailyNoteOutlineState {
		return {
			activeSet: this.activeSet,
			activeGranularity: this.activeGranularity,
		};
	}

	private async initView() {
		await this.bootDelay(); //少し待たないと起動直後はDaily Noteの取得に失敗するようだ

		this.verPN = await this.checkPeriodicNotes();
		this.resetSearchRange();
		
		this.refreshView(true, true, true);
	}

	private async bootDelay(): Promise<void> {
		return new Promise(resolve => { setTimeout(resolve, 200);});
	}

	private async autoRefresh(){
		if (!(this.flagRedraw || this.flagRegetAll)){
			return;
		}

		this.refreshView(this.flagRegetAll, this.flagRegetAll, true);
		this.flagRegetAll = false;
		this.flagRedraw = false;
	}

	// リフレッシュセンター
	// regetAllがtrue: 全デイリーノートを取得し直す
	// getTargetがtrue: 現在の探索範囲に含まれるデイリーノートを特定
	// getOutlineがtrue: 対象ファイル群のファイル情報、アウトライン情報を取得
	// その後UI部分とアウトライン部分を描画
	async refreshView(regetAll: boolean, getTarget:boolean, getOutline:boolean){
		await this.checkPeriodicNotes();

		if (this.verPN != 2){
			// core daily note/ periodic notes plugin v0.x の場合
			if (regetAll){
				this.allDailyNotes = this.getAllNotes();
			}
			if (getTarget){
				this.targetFiles = this.getTargetFiles(this.allDailyNotes, GRANULARITY_LIST[this.activeGranularity]);
			}
			if(getOutline){
				this.fileInfo = await this.getFileInfo(this.targetFiles);
				this.outlineData = await this.getOutline(this.targetFiles);
			}
			this.drawUI();
			this.drawOutline(this.targetFiles, this.fileInfo, this.outlineData);
		} else {
			// periodic notes plugin v1.x対応
			if (!this.calendarSets[this.activeSet]){
				this.activeSet = 0;
			}
			if (!this.calendarSets[this.activeSet][GRANULARITY_LIST[this.activeGranularity]]?.enabled){
				this.activeGranularity = 0;
			}

			if (getTarget){
				this.targetFiles = this.getTargetPeriodicNotes(this.calendarSets[this.activeSet], GRANULARITY_LIST[this.activeGranularity])
			}
			if (getOutline){
				this.fileInfo = await this.getFileInfo(this.targetFiles);
				this.outlineData = await this.getOutline(this.targetFiles);
			}
			this.drawUI();
			this.drawOutline(this.targetFiles, this.fileInfo, this.outlineData);
		}
	}


	// 取得した全デイリーノートから探索範囲のデイリーノートを切り出す  
	// (ver0.x.xのperiodic notesにも対応。)
	private getTargetFiles(allFiles:Record<string,TFile>, granularity: IGranularity): TFile[]{

		let files: TFile[] = [];
		let checkDate = this.searchRange.latest.clone();
		let checkDateEarliest = this.searchRange.earliest.clone();

		if (this.settings.initialSearchType =='backward'){
			if(checkDate.isSame(moment(),'day')){
				checkDate.add(Math.ceil(this.settings.offset/DAYS_PER_UNIT[granularity]),granularity);
			}
			checkDateEarliest = this.searchRange.latest.clone().subtract(this.settings.duration[granularity] - 1,granularity);
		} else {
			// forward searchのとき
			checkDate = this.searchRange.earliest.clone().add(this.settings.duration[granularity] - 1,granularity);
		}
		
		while (checkDate.isSameOrAfter(checkDateEarliest,granularity)){
			if (allFiles[getDateUID(checkDate, granularity)]){
				files.push(allFiles[getDateUID(checkDate, granularity)]);
			}
			checkDate.subtract(1,granularity);
		}
		return files;
	}

	// 探索範囲のPeriodic Notesを取得する （peirodic notes 1.x.x用）
	private getTargetPeriodicNotes(calendarSet: CalendarSet, granularity: IGranularity): TFile[]{
		let files: TFile[] = [];

		// day基準の探索範囲であるsearchRangeを元に、粒度に応じて探索範囲を拡張したものをcheckDate,checkDateEarliestに代入
		let checkDate = this.searchRange.latest.clone();
		let checkDateEarliest = this.searchRange.earliest.clone();
		
		if (this.settings.initialSearchType=='backward'){
			if(checkDate.isSame(moment(),'day')){
				checkDate.add(Math.ceil(this.settings.offset/DAYS_PER_UNIT[granularity]),granularity);
			}
			checkDateEarliest = this.searchRange.latest.clone().subtract(this.settings.duration[granularity] - 1,granularity);
		} else {
			// forward searchのとき
			checkDate = this.searchRange.earliest.clone().add(this.settings.duration[granularity] - 1,granularity);
		}	

		while (checkDate.isSameOrAfter(checkDateEarliest,granularity)){
			const caches = this.app.plugins.getPlugin("periodic-notes").cache.getPeriodicNotes(calendarSet.id,granularity,checkDate);
			if (caches) {
				for (const file of caches){
					// ファイルパスにPNのフォルダパスが含まれていない && PNのフォルダパスが指定されている のときは処理をスキップ
					// ＊現状のPNベータでは、カレンダーセットの指定にかかわらず全セットに含まれるPNが返されるようであるため、各セットのフォルダパスでフィルタリングする
					// ただしファオルダパスが指定されていないときはスキップ
					if (!file.filePath.startsWith(calendarSet[granularity].folder.concat("/")) && calendarSet[granularity].folder){
						continue;
					}
					const fileobj = this.app.vault.getAbstractFileByPath(file.filePath);
					if (fileobj instanceof TFile){
						files.push(fileobj);
					}
				}
			}
			checkDate.subtract(1,granularity);
		}
		return files;
	}


	// デイリーノートの配列から各ファイルに関する情報を抽出
	private async getFileInfo(files:TFile[]):Promise<FileInfo[]>{
		let fileInfo:FileInfo[]=[];
		for (let i=0; i < files.length ; i++){
			const content = await this.app.vault.cachedRead(files[i]);
			const lines = content.split("\n");
			let info:FileInfo = {
				date: getDateFromFile(files[i],GRANULARITY_LIST[this.activeGranularity]),
				//content: content,
				lines: lines,
				numOfLines: lines.length
			}
			// periodic notes beta対応
			if (this.verPN == 2){
				info.date = this.app.plugins.getPlugin("periodic-notes").cache.cachedFiles.get(this.calendarSets[this.activeSet].id).get(files[i].path).date;
			}

			fileInfo.push(info);
		}
		return fileInfo;
	}

	// メタデータからアウトライン要素を抽出
	private async getOutline(files:TFile[]):Promise<OutlineData[][]>{
		let data:OutlineData[][]=[];    
		for (let i=0; i< files.length ; i++){
			const cache = this.app.metadataCache.getFileCache(files[i]);
			// 空配列を指定
			data[i]=[];
			// headings,links,tagsを抽出

			// console.log('check headings',cache.hasOwnProperty("headings") );
			if (cache.hasOwnProperty("headings")){
				for (let j=0; j< cache.headings.length ; j++){
					const element:OutlineData = {
						typeOfElement : "heading",
						position : cache.headings[j].position,
						displayText : cache.headings[j].heading,
						level: cache.headings[j].level
					};
					data[i].push(element);
				}
			}

			// console.log('check links',cache.hasOwnProperty("links") );
			if (cache.hasOwnProperty("links")){
				for (let j=0; j< cache.links.length ; j++){
					const element:OutlineData = {
						typeOfElement : "link",
						position : cache.links[j].position,
						//マークダウンリンク に対応
						displayText : 
							(cache.links[j].displayText =="") 
							? cache.links[j].original.substring(1,cache.links[j].original.indexOf("]")) 
							: cache.links[j].displayText,
						link: cache.links[j].link
					};
					data[i].push(element);
				}				
			}
			
			// console.log('check lists');
			if (cache.hasOwnProperty("listItems")){

				for (let j=0; j< cache.listItems.length ; j++){
					//以下でリストアイテムの階層の判定を行う。
					//リストの先頭の項目:0、先頭ではないがルートレベル:1、第2階層以下：2としている。
					//parentが正の数なら第2階層以下
					//負の数で、絶対値がposition.start.lineと一致していればトップアイテム(0)、非一致ならルート（1）
					//ただし視覚的に離れたトップレベルのアイテムでも、間にheadingがないとルートアイテムとして判定されてしまうので、
					//前のリストアイテムとの行の差が1の時のみルートアイテムとして判定するよう修正する。
					let listLevel: number = 0; // 0:top item of a list 1:root leve 2:other
					if (cache.listItems[j].parent >0){
						listLevel = 2;
					} else if (j>0){
						if (!(Math.abs(cache.listItems[j].parent) == cache.listItems[j].position.start.line) &&
							(cache.listItems[j].position.start.line - cache.listItems[j-1].position.start.line == 1)){
									listLevel = 1;
						}
					}
					const element:OutlineData = {
						typeOfElement : "listItems",
						position : cache.listItems[j].position,
						displayText : this.fileInfo[i].lines[cache.listItems[j].position.start.line].replace(/^(\s|\t)*-\s(\[.\]\s)*/,''),
						level : listLevel,
						task : cache.listItems[j].task
					};
					data[i].push(element);
				}
			}
			
			// console.log('check tags',cache.hasOwnProperty("tags") );
			if (cache.hasOwnProperty("tags")){
				for (let j=0; j< cache.tags.length ; j++){
					const element:OutlineData = {
						typeOfElement : "tag",
						position : cache.tags[j].position,
						displayText : cache.tags[j].tag.substring(1),
					};
					data[i].push(element);
				}
			}
			// 要素の登場順にソート
			data[i].sort((a,b)=> {
				return (a.position.start.offset - b.position.start.offset);
			});

		}

		return data;

	}

	// 操作アイコン部分を描画
	private drawUI(){

		const navHeader: HTMLElement = createDiv("nav-header");
		const navButtonContainer: HTMLElement = navHeader.createDiv("nav-buttons-container");

		// periodic notes
		const granularity = GRANULARITY_LIST[this.activeGranularity];
		
		// 過去に移動
		let navActionButton: HTMLElement = navButtonContainer.createDiv("clickable-icon nav-action-button");
		navActionButton.ariaLabel = "previous notes";
		setIcon(navActionButton,"arrow-left",20);

		navActionButton.addEventListener(
			"click",
			async (event:MouseEvent) =>{
				event.preventDefault();
				this.searchRange.latest = this.searchRange.latest.subtract(this.settings.duration[granularity],granularity);
				this.searchRange.earliest = this.searchRange.earliest.subtract(this.settings.duration[granularity],granularity);
				this.refreshView(false, true, true);
			}
		);

		//未来に移動
		navActionButton = navButtonContainer.createDiv("clickable-icon nav-action-button");
		navActionButton.ariaLabel = "next notes";
		setIcon(navActionButton,"arrow-right",20);

		navActionButton.addEventListener(
			"click",
			async (event:MouseEvent) =>{
				event.preventDefault();
				this.searchRange.latest = this.searchRange.latest.add(this.settings.duration[granularity],granularity);
				this.searchRange.earliest = this.searchRange.earliest.add(this.settings.duration[granularity],granularity);
				this.refreshView(false, true, true);
			}
		);

		//ホームに戻る
		navActionButton = navButtonContainer.createDiv("clickable-icon nav-action-button");
		navActionButton.ariaLabel = "home";
		setIcon(navActionButton,"home",20);
		navActionButton.addEventListener(
			"click",
			async (event:MouseEvent) =>{
				event.preventDefault();
				this.resetSearchRange();
				this.refreshView(false, true, true);
			}
		);

		//リフレッシュ
		navActionButton = navButtonContainer.createDiv("clickable-icon nav-action-button");
		navActionButton.ariaLabel = "refresh";
		setIcon(navActionButton,"refresh-cw",20);
		navActionButton.addEventListener(
			"click",
			async (event:MouseEvent) =>{
				event.preventDefault();
				this.resetSearchRange();
				this.refreshView(true, true, true);
			}
		);
		// 設定
		navActionButton = navButtonContainer.createDiv("clickable-icon nav-action-button");
		navActionButton.ariaLabel = "open settings";
		setIcon(navActionButton,"settings",20);
		navActionButton.addEventListener(
			"click",
			async (event:MouseEvent) =>{
				this.app.setting.open();
				this.app.setting.openTabById(this.plugin.manifest.id);
			}
		);

		// デイリーノート作成
		navActionButton = navButtonContainer.createDiv("clickable-icon nav-action-button");

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
		setIcon(navActionButton,"calendar-plus",20);
		navActionButton.addEventListener(
			"click",
			async (event:MouseEvent) =>{
				event.preventDefault;
				const date = moment();

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
							const date = moment().add(1,granularity);
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

		// 抽出
		navActionButton = navButtonContainer.createDiv("clickable-icon nav-action-button");
		if (!this.extractMode){
			//抽出をオンに
			navActionButton.ariaLabel = "extract";
			setIcon(navActionButton,"search",20);
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
			setIcon(navActionButton,"x-circle",20);
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
			
		// 日付の範囲の描画
		const navDateRange: HTMLElement = navHeader.createDiv("nav-date-range");
		let latest = this.searchRange.latest.clone();
		let earliest = this.searchRange.earliest.clone();

		if (this.settings.initialSearchType =='backward'){
			earliest = latest.clone().subtract(this.settings.duration[granularity] - 1 ,granularity);
			if (latest.isSame(moment(),"day")){
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
				const onsetDate = moment(this.settings.onset,"YYYY-MM-DD");
				if (onsetDate.isValid()){
					this.searchRange.earliest = onsetDate;
					this.searchRange.latest = onsetDate.clone().add(this.settings.duration.day -1,'days');
				} else {  
					// onsetDateが不正なら当日起点のbackward searchを行う
					this.searchRange.latest = moment().startOf('day');
					this.searchRange.earliest = moment().startOf('day').subtract(this.settings.duration.day - 1,'days')
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

	//  アウトライン描画	
	private drawOutline( files: TFile[], info: FileInfo[], data: OutlineData[][]):void {

		const containerEl: HTMLElement = createDiv("nav-files-container node-insert-event");
		const rootEl: HTMLElement = containerEl.createDiv("nav-folder mod-root"); 
		const rootChildrenEl: HTMLElement = rootEl.createDiv("nav-folder-children"); 

		if (files.length == 0){
			rootChildrenEl.createEl("h4",{
				text: "No daily/periodic note found"
			});
		}

		// include only modeがオンになっているか
		let includeMode: boolean = (this.settings.includeOnly != 'none') && (Boolean(this.settings.wordsToInclude.length) || (this.settings.includeBeginning));

		// 表示オンになっている見出しレベルの最高値
		let maxLevel = this.settings.headingLevel.indexOf(true);

		for (let i=0; i<files.length ; i++){

			// デイリーノートのタイトル部分作成 = フォルダ作成
			const dailyNoteEl: HTMLDivElement = rootChildrenEl.createDiv("nav-folder");
			const dailyNoteTitleEl: HTMLDivElement = dailyNoteEl.createDiv("nav-folder-title");
			const dailyNoteChildrenEl: HTMLDivElement = dailyNoteEl.createDiv("nav-folder-children");
			//const collapseIconEl: HTMLDivElement = dailyNoteTitleEl.createDiv("nav-folder-collapse-indicator collapse-icon");
			
			/*いずれノートの折りたたみ処理を…
			collapseIconEl.innerHTML = COLLAPSE_ICON;
			if (noteCollapsed[i]) {
				(collapseIconEl.childNodes[0] as HTMLElement).style.transform = "rotate(-90deg)";
			}
			*/
			
			//ファイル名にアイコンを付加
			switch(this.settings.icon.note){
				case 'none':
					break;
				case 'custom':
					setIcon(dailyNoteTitleEl, this.settings.customIcon.note);
					break;
				default:
					if (this.settings.icon.note){
						setIcon(dailyNoteTitleEl, this.settings.icon.note);
					}
					break;
			}

			//weekly noteの場合日付の範囲を付加表示
			let name = files[i].basename;
			if (this.settings.attachWeeklyNotesName && GRANULARITY_LIST[this.activeGranularity] =='week'){
				name = name + " (" +this.fileInfo[i].date.clone().startOf('week').format("MM/DD [-] ") + this.fileInfo[i].date.clone().endOf('week').format("MM/DD") +")";
			}
			dailyNoteTitleEl.createDiv("nav-folder-title-content").setText(name);

			//ファイル名の後の情報を表示
			switch (this.settings.displayFileInfo) {
				case 'lines':
					dailyNoteTitleEl.dataset.subinfo = info[i].numOfLines.toString();
					break;
				case 'days':
					let basedate = (this.settings.initialSearchType == "backward")? moment(): this.settings.onset;
					dailyNoteTitleEl.dataset.subinfo = Math.abs(info[i].date.diff(basedate.startOf(GRANULARITY_LIST[this.activeGranularity]),GRANULARITY_LIST[this.activeGranularity])).toString();
					break;
				case 'none':
					break;
				default:
					break;
			}

			//ノートタイトルをクリックしたらそのファイルをopen
			dailyNoteTitleEl.addEventListener(
				"click",
				(event: MouseEvent) => {
					event.preventDefault();
					this.app.workspace.getLeaf().openFile(files[i]);
				},
				false
			);
			// コンテキストメニュー
			dailyNoteTitleEl.addEventListener(
				"contextmenu",
				(event: MouseEvent) => {
					const menu = new Menu();

					//新規タブに開く
					menu.addItem((item)=>
						item
							.setTitle("Open in new tab")
							.setIcon("file-plus")
							.onClick(()=> {
								event.preventDefault();
								this.app.workspace.getLeaf('tab').openFile(files[i]);
							})
					);
					//右に開く
					menu.addItem((item)=>
						item
							.setTitle("Open to the right")
							.setIcon("separator-vertical")
							.onClick(()=> {
								event.preventDefault();
								this.app.workspace.getLeaf('split').openFile(files[i]);
							})
					);

					this.app.workspace.trigger(
						"file-menu",
						menu,
						files[i],
						'link-context-menu'
					);
					menu.showAtMouseEvent(event);
				}
			)

			// include mode 用の変数を宣言
			let isIncluded = this.settings.includeBeginning;
			let includeModeHeadingLevel: number;
			// exclude mode 用変数
			let isExcluded = false;
			let excludeType: string;
			let excludeModeHeadingLevel: number;
			let primeType = this.settings.includeOnly == 'none' ? this.settings.primeElement : this.settings.includeOnly;
			// extract マッチする項目があったかどうか
			let isExtracted = false;

			//アウトライン要素の描画。data[i]が要素0ならスキップ
			//二重ループから抜けるためラベルelementloopをつけた
			if (data[i].length > 0){

				elementloop: for (let j=0; j<data[i].length; j++){

					// 現アウトライン要素の種別を取得
					const element = data[i][j].typeOfElement;

					//// include mode
					if (includeMode && this.settings.includeOnly == element){
						if (isIncluded == true && element == 'heading' && data[i][j].level > includeModeHeadingLevel  ){
							//下位見出しの場合は処理をスキップ
						} else {
							// 組み入れるワードにマッチするか判定
							isIncluded = false;
							for (const value of this.settings.wordsToInclude){
								if ( (value) && data[i][j].displayText.includes(value)){
									isIncluded = true;
									if (element == 'heading'){
										includeModeHeadingLevel = data[i][j].level;
									}
								}
							}
						}
					}
					if (!isIncluded){
						continue;
					}
					
					//// exclude mode
					if (!isExcluded || (isExcluded && (excludeType == element || primeType == element))){
						if (element == 'heading' && data[i][j].level > excludeModeHeadingLevel){
						// 下位見出しの場合は処理をスキップ	
						} else {
							isExcluded = false;
							for (const value of this.settings.wordsToExclude[element]){
								if ( (value) && data[i][j].displayText.includes(value)){
									isExcluded = true;
									excludeType = element;
									if (element == 'heading'){
										excludeModeHeadingLevel = data[i][j].level;
									}
								}
							}

						}
					}   
					if (isExcluded){
						continue;
					}

					//要素ごとの非表示判定  設定で非表示になっていればスキップ
					
					if (this.settings.showElements[element] == false){
						continue;
					}

					// simple filter 除外ワードにマッチすればスキップ

					for (const value of this.settings.wordsToIgnore[element]){
						if( (value) && data[i][j].displayText.includes(value)){
							continue elementloop;
						}
					}

					//// 抽出 extract

					if (this.extractMode == true) {
						if (this.extractTask == false && !data[i][j].displayText.includes(this.settings.wordsToExtract)){
							continue;
						} else if (this.extractTask == true && data[i][j].task === void 0){
							continue;
						} else {
							isExtracted = true;
						}
					}

					//// 要素種別ごとの処理
					
					// headings
					if (element == 'heading'){
						// 特定の見出しレベルが非表示の場合、該当すればスキップ
						if ( !this.settings.headingLevel[data[i][j].level - 1]){
							continue;
						}
					}

					// links
					if (element == 'link'){
					}

					// tags
					if (element == 'tag'){
					}


					// listItems

					if (element == 'listItems'){
						// 完了タスク非表示設定であれば完了タスクはスキップ
						if (this.settings.hideCompletedTasks == true && data[i][j].task =='x'){
							continue;
						// 非タスク非表示設定であれば非タスクはスキップ
						} else if (this.settings.taskOnly == true && data[i][j].task === void 0){
							continue;
						// 非タスクの通常リストアイテム、または タスクは全表示の設定で無ければレベルに応じてスキップ
						} else if (this.settings.allTasks == false || data[i][j].task === void 0){
							if ( (data[i][j].level == 2) || (data[i][j].level ==1 && this.settings.allRootItems == false)){
								continue;
							}
						}
					}

					//アウトライン要素部分作成
					const outlineEl: HTMLElement = dailyNoteChildrenEl
							.createDiv("nav-file");
					//中身を設定
					const outlineTitle: HTMLElement = outlineEl.createDiv("nav-file-title nav-action-button");

					//アイコン icon
					switch(this.settings.icon[element]){
						case 'none':
							break;
						case 'headingwithnumber':
							setIcon(outlineTitle, `heading-${data[i][j].level}`);
							break;
						case 'custom':
							setIcon(outlineTitle, this.settings.customIcon[element]);
							break;
						default:
							setIcon(outlineTitle, this.settings.icon[element]);
							break;
					}
					// タスクだった場合アイコン上書き
					if (element =='listItems' && data[i][j].task !== void 0){
						if (data[i][j].task == 'x'){
							setIcon(outlineTitle, this.settings.icon.taskDone == 'custom' ? 
								this.settings.customIcon.taskDone : this.settings.icon.taskDone);
						} else {
							setIcon(outlineTitle, this.settings.icon.task =='custom' ?
								this.settings.customIcon.task : this.settings.icon.task);
						}
					}
					
					//prefix、インデント
					let prefix = this.settings.prefix[element];
					if ( element == 'heading'){
						switch (this.settings.repeatHeadingPrefix){
							case 'level':
								prefix = prefix.repeat(data[i][j].level);
								break;
							case 'levelminus1':
								prefix = prefix.repeat(data[i][j].level - 1 );
								break;
						}
					}

					if (element =='heading' && this.settings.indent.heading == true){
						outlineTitle.style.paddingLeft = `${(data[i][j].level - maxLevel - 1)*1.5 + 0.5}em`;
					}
					// リンクが前のエレメントと同じ行だった場合インデント付加
					if (element =='link' && data[i][j].position.start.line == data[i][j-1]?.position.start.line){
						outlineTitle.style.paddingLeft = '2em';
					}


					if (element =='listItems' && data[i][j].task !== void 0) {
							prefix = data[i][j].task == 'x' ? 
								this.settings.prefix.taskDone : this.settings.prefix.task;
							if (this.settings.addCheckboxText){
								prefix = prefix + '['+data[i][j].task+'] ';
							}
					}
					let dispText = this.stripMarkdownSympol(data[i][j].displayText);

					outlineTitle.createDiv("nav-file-title-content").setText(prefix + dispText);

					// インラインプレビュー
					// リンクとタグは、アウトライン要素のあとに文字列が続く場合その行をプレビュー、そうでなければ次の行をプレビュー
					if (this.settings.inlinePreview) {
						let previewText: string ='';
						
						if ((element == 'link' || element == 'tag') && data[i][j].position.end.col < info[i].lines[ data[i][j].position.start.line ].length){
							previewText = info[i].lines[ data[i][j].position.start.line ].slice(data[i][j].position.end.col);
						} else {
							previewText = ( data[i][j].position.start.line < info[i].numOfLines -1 )?
								info[i].lines[ data[i][j].position.start.line + 1] : ""; 
						}
						outlineTitle.createDiv("nav-file-title-preview").setText(previewText);
					}
					// ツールチッププレビュー
					// その要素の行から次の要素の前までをプレビュー
					if (this.settings.tooltipPreview){
						let previewText2:string ='';
						// まず次の表示要素の引数を特定
						let endLine:Number = info[i].numOfLines - 1;  //初期値は文章末
						let k = j +1; // 現在のアウトライン引数+1からループ開始
						endpreviewloop: while (k< data[i].length) {
							//表示するエレメントタイプであれば行を取得してループを打ち切る
							if (this.settings.showElements[data[i][k].typeOfElement]){
								//ただし各種の実際には非表示となる条件を満たしていたら打ち切らない
								// リストの設定による非表示
								if (data[i][k].typeOfElement == 'listItems' && 
										( data[i][k].level >=2 ||
										((this.settings.allRootItems == false && data[i][k].level == 1) && (this.settings.allTasks == false || data[i][k].task === void 0)) ||
										(this.settings.taskOnly && data[i][k].task === void 0) ||
										(this.settings.hideCompletedTasks && data[i][k].task == 'x'))){
									k++;
									continue;
								// 見出しのレベルによる非表示
								} else if (data[i][k].typeOfElement == 'heading' &&
									this.settings.headingLevel[data[i][k].level - 1] == false){
									k++;
									continue;
								// simple filterによる非表示
								} else {
									for (const value of this.settings.wordsToIgnore[data[i][k].typeOfElement]){
										if( (value) && data[i][k].displayText.includes(value)){
											k++;
											continue endpreviewloop;
										} 
									}
									endLine = data[i][k].position.start.line -1;
									break;
								}
							}
							k++;
						}
						for (let l = data[i][j].position.start.line; l <= endLine; l++){
							previewText2 = previewText2 + info[i].lines[l] +'\n';
						}
						// 空行を除去
						previewText2 = previewText2.replace(/\n$|\n(?=\n)/g,'');
						outlineTitle.ariaLabel = previewText2;
						outlineTitle.setAttribute('aria-label-position',this.settings.tooltipPreviewDirection);
						outlineTitle.setAttribute('aria-label-classes','daily-note-preview');
					}
					
					
					outlineTitle.addEventListener(
						"click",
						async(event: MouseEvent) => {
							event.preventDefault();
							await this.app.workspace.getLeaf().openFile(files[i]);
							const view = this.app.workspace.getActiveViewOfType(MarkdownView);

							if (view) {
								view.editor.focus();

								view.editor.setCursor (data[i][j].position.start.line, data[i][j].position.start.col);
								view.editor.scrollIntoView( {
									from: {
										line: data[i][j].position.start.line,
										ch:0
									},
									to: {
										line: data[i][j].position.start.line,
										ch:0
									}
								}, true);
							}
						},
						false
					);

					//hover preview 
					outlineTitle.addEventListener('mouseover', (event: MouseEvent) => {
						this.app.workspace.trigger('hover-link', {
							event,
							source: DailyNoteOutlineViewType,
							hoverParent: rootEl,
							targetEl: outlineTitle,
							linktext: files[i].path,
							state:{scroll: data[i][j].position.start.line}
						});
					});

					// contextmenu
					outlineTitle.addEventListener(
						"contextmenu",
						(event: MouseEvent) => {
							const menu = new Menu();
							//抽出
							menu.addItem((item) =>
								item
									.setTitle("Extract")
									.setIcon("search")
									.onClick(async ()=>{
										this.plugin.settings.wordsToExtract = data[i][j].displayText;
										await this.plugin.saveSettings();
										this.extractMode = true;
										this.extractTask = false;
										this.refreshView(false,false,false);
									})
							);
							menu.addSeparator();
							//新規タブに開く
							menu.addItem((item)=>
								item
									.setTitle("Open in new tab")
									.setIcon("file-plus")
									.onClick(async()=> {
										await this.app.workspace.getLeaf('tab').openFile(files[i]);
										this.scrollToElement(data[i][j].position.start.line, data[i][j].position.start.col);

									})
							);
							//右に開く
							menu.addItem((item)=>
								item
									.setTitle("Open to the right")
									.setIcon("separator-vertical")
									.onClick(async()=> {
										await this.app.workspace.getLeaf('split').openFile(files[i]);
										this.scrollToElement(data[i][j].position.start.line, data[i][j].position.start.col);
									})
							);
							//新規ウィンドウに開く
							menu.addItem((item)=>
								item
									.setTitle("Open in new window")
									.setIcon("scan")
									.onClick(async()=> {
										await this.app.workspace.getLeaf('window').openFile(files[i]);
										this.scrollToElement(data[i][j].position.start.line, data[i][j].position.start.col);
									})
							);

							menu.showAtMouseEvent(event);
						}
					);

				}
			} else {
				//要素0だったときの処理
				//各行をチェックし、空行でない初めの行を表示する(抽出モードでは行わない)
				if (this.extractMode == false){
					for (let j = 0; j < info[i].lines.length; j++){

						if (info[i].lines[j] == ""){
							continue;
						} else {
							const outlineEl: HTMLElement = dailyNoteChildrenEl
									.createDiv("nav-file");
							const outlineTitle: HTMLElement = outlineEl.createDiv("nav-file-title nav-action-button");
							outlineTitle.createDiv("nav-file-title-content").setText(info[i].lines[j]);
							outlineTitle.addEventListener(
								"click",
								async(event: MouseEvent) => {
									event.preventDefault();
									await this.app.workspace.getLeaf().openFile(files[i]);
								},
								false
							);
							break;
						}
					}
				}
			

			}
			// 抽出モードで抽出した要素がない場合、ノート自体を非表示に。
			if (this.extractMode == true && isExtracted == false){
				dailyNoteEl.remove();
			}
		}
		// アウトライン部分の描画実行
		this.contentEl.appendChild(containerEl);
	}

	// エディタをアウトライン要素の位置までスクロール
	private scrollToElement(line: number, col: number): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			view.editor.focus();
			view.editor.setCursor (line, col);
			view.editor.scrollIntoView( {
				from: {
					line: line,
					ch:0
				},
				to: {
					line: line,
					ch:0
				}
			}, true);
		}
	}

	// ［ ］の除去
	private stripMarkdownSympol(text: string): string {
		return (text.replace(/(\[\[)|(\]\])/g,''));
	}

	// 探索範囲を設定に合わせて初期化
	public resetSearchRange():void {
		if (this.settings.initialSearchType == 'forward'){
			const onsetDate = moment(this.settings.onset,"YYYY-MM-DD");
			if (onsetDate.isValid()){
				this.searchRange.earliest = onsetDate;
				this.searchRange.latest = onsetDate.clone().add(this.settings.duration.day -1,'days');
			} else {  
				// onsetDateが不正なら当日起点のbackward searchを行う
				new Notice('onset date is invalid');
				this.searchRange.latest = moment().startOf('day');
				this.searchRange.earliest = moment().startOf('day').subtract(this.settings.duration.day - 1,'days')
			}
		}
		
		if (this.settings.initialSearchType == 'backward'){
			this.searchRange.latest = moment().startOf('day');
			this.searchRange.earliest = moment().startOf('day').subtract(this.settings.duration.day - 1 ,'days');
		} 
	}

	// Periodic Notesの状態をチェック  return 0:オフ 1:v0.x.x 2:v1.0.0-
	private async checkPeriodicNotes(): Promise<number> {
		if (app.plugins.plugins['periodic-notes']){
			if (Number(app.plugins.plugins['periodic-notes'].manifest.version.split(".")[0]) >=1){
				// ver 1.0.0以上
				this.calendarSets = this.app.plugins.getPlugin("periodic-notes")?.calendarSetManager.getCalendarSets();
				if (!this.calendarSets){
					new Notice('failed to import calendar sets to Daily Note Outline');
				}
				const initialGranularity = this.activeGranularity;
				while (!this.calendarSets[this.activeSet][GRANULARITY_LIST[this.activeGranularity]]?.enabled){
					this.activeGranularity = (this.activeGranularity + 1) % GRANULARITY_LIST.length;
					if(this.activeGranularity == initialGranularity){
						break;
					}
				}	
				this.app.workspace.requestSaveLayout();
				return 2;
			} else {
				// ver 0.x.x
				this.settings.calendarSetsEnabled = false;
				this.activeSet = 0;
				await this.plugin.saveSettings();  

				const initialGranularity = this.activeGranularity;
				while (!this.app.plugins.getPlugin("periodic-notes").settings?.[GRANULARITY_TO_PERIODICITY[GRANULARITY_LIST[this.activeGranularity]]]?.enabled){
					this.activeGranularity = (this.activeGranularity + 1) % GRANULARITY_LIST.length;
					if(this.activeGranularity == initialGranularity){
						break;
					}
				}	
				this.app.workspace.requestSaveLayout();
				return 1;
			}
		} else {
			// Periodic Notesがオフかインストールされていない
			this.settings.periodicNotesEnabled = false;
			this.settings.calendarSetsEnabled = false;
			this.activeGranularity = 0;
			this.activeSet = 0;
			await this.plugin.saveSettings();
			return 0;
		}
	}

	// granularityに従って全てのdaily/weekly/monthly/quarterly/yearlyノートを取得
	getAllNotes():Record<string,TFile> {
		switch (this.activeGranularity){
			case 0:
				return getAllDailyNotes();
			case 1:
				return getAllWeeklyNotes();
			case 2:
				return getAllMonthlyNotes();
			case 3:
				return getAllQuarterlyNotes();
			case 4:
				return getAllYearlyNotes();
		}
	}
}

