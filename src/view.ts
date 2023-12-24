import { MarkdownView, Notice, setIcon, debounce, Debouncer, Menu, ViewStateResult, View} from 'obsidian';

import { ItemView, WorkspaceLeaf, TFile} from 'obsidian';

import { getAllDailyNotes, getDateFromFile, createDailyNote, getDateUID, 
	getAllWeeklyNotes, getAllMonthlyNotes, getAllQuarterlyNotes, getAllYearlyNotes, IGranularity } from "obsidian-daily-notes-interface";
import moment from "moment"

import DailyNoteOutlinePlugin, { DailyNoteOutlineSettings, OutlineData, FileInfo, FileStatus, DAYS_PER_UNIT,GRANULARITY_LIST, GRANULARITY_TO_PERIODICITY, FILEINFO_TO_DISPLAY, FILEINFO_TO_DISPLAY_DAY, DateInfo} from 'src/main';

import { createAndOpenDailyNote } from 'src/createAndOpenDailyNote';
import { ModalExtract } from 'src/modalExtract';

// Periodic Notes
import {type CalendarSet,} from 'src/periodicNotesTypes';
import { createAndOpenPeriodicNote } from './createAndOpenPeriodicNote';

import { drawUI } from 'src/drawUI';
import { getTargetFiles, getTargetPeriodicNotes } from './getTargetFiles';
import { getFileInfo, getOutline } from './getOutline';
import { drawOutline } from './constructDOM';

import { getAPI } from "obsidian-dataview";



export const DailyNoteOutlineViewType = 'daily-note-outline';

// Stateで現在表示中の粒度、カレンダーセットを保持
interface IDailyNoteOutlineState {
	activeSet: number;
	activeGranularity: number;
}

export class DailyNoteOutlineView extends ItemView implements IDailyNoteOutlineState {
	
	plugin: DailyNoteOutlinePlugin;
	settings:DailyNoteOutlineSettings;

	allDailyNotes: Record<string,TFile>;
	
	targetFiles: TFile[];
	// fileStatus: FileStatus[];
	fileInfo: FileInfo[];

	dateInfo: DateInfo[];
	
	searchRange: {
		latest: moment,
		earliest: moment
	} = {
		latest: window.moment(),
		earliest: window.moment()
	};
	outlineData: OutlineData[][];

	flagRedraw: boolean;
	flagRegetAll: boolean;

	extractMode: boolean = false;
	extractTask: boolean = false;

	//全ファイルの折りたたみ
	collapseAll: boolean = false;

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
			if (this.targetFiles?.includes(file)){
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
		this.collapseAll = this.settings.collapseAllAtStartup;
		
		this.verPN = await this.checkPeriodicNotes();
		this.resetSearchRange();
		
		this.refreshView(true, true, true);
	
	}

	private async bootDelay(): Promise<void> {
		return new Promise(resolve => { setTimeout(resolve, 300);});
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
	async refreshView(flagRegetAll: boolean, flagGetTarget:boolean, flagGetOutline:boolean){
		const startTime = performance.now();
		if (this.settings.showDebugInfo){
			console.log('DNO:start refreshing view. CalendarSets:',this.calendarSets);
		}
		this.verPN = await this.checkPeriodicNotes();

		if (this.verPN != 2){
			// core daily note/ periodic notes plugin v0.x の場合
			if (flagRegetAll){
				this.allDailyNotes = this.getAllNotes();
			}

			// await this.testBacklinks();

			if (flagGetTarget){
				this.targetFiles = getTargetFiles.call(this, this.allDailyNotes, GRANULARITY_LIST[this.activeGranularity]);
			}
			if(flagGetOutline){
				this.fileInfo = await getFileInfo.call(this, this.targetFiles);
				this.outlineData = await getOutline.call(this, this.targetFiles,this.fileInfo);
			}
			drawUI.call(this);
			drawOutline.call(this, this.targetFiles, this.fileInfo, this.outlineData);
		} else {
			// periodic notes plugin v1.x対応
			if (!this.calendarSets[this.activeSet]){
				this.activeSet = 0;
			}
			if (!this.calendarSets[this.activeSet][GRANULARITY_LIST[this.activeGranularity]]?.enabled){
				if (this.settings.showDebugInfo){
					console.log('DNO: Calender set is not enabled. this.activeGranularity is set to 0. Calendarsets, this.activeSet, this.activeGranularity:',this.calendarSets, this.activeSet, this.activeGranularity);
				}
				this.activeGranularity = 0;
			}

			// await this.testBacklinks();

			if (flagGetTarget){
				this.targetFiles = getTargetPeriodicNotes.call(this, this.calendarSets[this.activeSet], GRANULARITY_LIST[this.activeGranularity])
			}
			if (flagGetOutline){
				this.fileInfo = await getFileInfo.call(this, this.targetFiles);
				this.outlineData = await getOutline.call(this, this.targetFiles,this.fileInfo);
			}

			drawUI.call(this);
			drawOutline.call(this, this.targetFiles, this.fileInfo, this.outlineData);

			}
			
		const endTime = performance.now();
		if (this.settings.showDebugInfo){
			console.log ('DNO: time required to refresh view: ', endTime - startTime);
		}
	}

	// ［ ］の除去
	private stripMarkdownSymbol(text: string): string {
		return (text.replace(/(\[\[)|(\]\])/g,''));
	}

	// 探索範囲を設定に合わせて初期化
	public resetSearchRange():void {
		if (this.settings.initialSearchType == 'forward'){
			const onsetDate = window.moment(this.settings.onset,"YYYY-MM-DD");
			if (onsetDate.isValid()){
				this.searchRange.earliest = onsetDate;
				this.searchRange.latest = onsetDate.clone().add(this.settings.duration.day -1,'days');
			} else {  
				// onsetDateが不正なら当日起点のbackward searchを行う
				new Notice('onset date is invalid');
				this.searchRange.latest = window.moment().startOf('day');
				this.searchRange.earliest = window.moment().startOf('day').subtract(this.settings.duration.day - 1,'days')
			}
		}
		
		if (this.settings.initialSearchType == 'backward'){
			this.searchRange.latest = window.moment().startOf('day');
			this.searchRange.earliest = window.moment().startOf('day').subtract(this.settings.duration.day - 1 ,'days');
		} 
	}

	// Periodic Notesの状態をチェック  return 0:オフ 1:v0.x.x 2:v1.0.0-
	private async checkPeriodicNotes(): Promise<number> {
		
		if (this.settings.showDebugInfo){
			console.log('DNO:checking the version of Periodic Notes plugin');
		}

		if (app.plugins.plugins['periodic-notes']){
			if (Number(app.plugins.plugins['periodic-notes'].manifest.version.split(".")[0]) >=1){
				// ver 1.0.0以上
				this.calendarSets = this.app.plugins.getPlugin("periodic-notes")?.calendarSetManager.getCalendarSets();

				if (this.settings.showDebugInfo){
					console.log('return of this.app.PN.calendarSetManager.getCalendarSets(): ',this.app.plugins.getPlugin("periodic-notes")?.calendarSetManager.getCalendarSets());
					console.log('return of window.app.PN.calendarSetManager.getCalendarSets(): ',window.app.plugins.getPlugin("periodic-notes")?.calendarSetManager.getCalendarSets());
				}
				
				if (!this.calendarSets.length){
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

				if (this.settings.showDebugInfo){
					console.log('obtained verPN: ', this.verPN ,' calendarSets: ', this.calendarSets);
				}
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

	// バックリンク、dataviewのテスト用
	// async testBacklinks():Promise<void>{

	// 	const startTime = performance.now();
	// 	// 未解決リンク
	// 	let unresolvedLinks = this.app.metadataCache.unresolvedLinks;
	// 	console.log('未解決リンク',unresolvedLinks);
	// 	// 特定の未解決リンクを含むノートを抽出
	// 	const result = Object.entries(unresolvedLinks).filter((valueArray)=> valueArray[1].hasOwnProperty("2023-12-22_Friday"));

	// 	const endTime = performance.now();
	// 	console.log('未解決リンク探索所要時間', endTime - startTime);

	// 	const sTime2 = performance.now();
	// 	//dataviewAPI 取得
	// 	const dataviewAPI= getAPI();
	// 	const testValue = await dataviewAPI.pages('-"Daily"');
	// 	console.log('Dailyを除くファイル',testValue);
	// 	const eTime2 = performance.now();
	// 	console.log('dataview pages取得所要時間', eTime2-sTime2);

	// 	const sTime3 = performance.now();
	// 	// 特定のmdayを持つファイルの検索
	// 	//let testValue2 = [];
	// 	// for (let i = 0; i< 56; i++){
	// 	// 	const dvquery:string = 'LIST WHERE file.mday = date(today) - dur(' + i + ' d)';
	// 	// 	const result = await dataviewAPI.query(dvquery);
	// 	// 	testValue2.push(result.value.values);
	// 	// }
	// 	//console.log('データビュー2',testValue2);
	// 	const eTime3 = performance.now();
	// 	console.log('期間範囲指定mday', eTime3-sTime3);
	// }
}
