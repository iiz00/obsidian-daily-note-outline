import { Plugin, Pos, TFile } from 'obsidian';

// Daily Note Interface
import { getAllDailyNotes, getDailyNote, getDateFromFile } from "obsidian-daily-notes-interface";
// moment.js
import moment from "moment";

import { DailyNoteOutlineView, DailyNoteOutlineViewType } from 'src/view'
import { DailyNoteOutlineSettingTab } from 'src/setting'


// 設定項目
export interface DailyNoteOutlineSettings {
	initialSearchType: string; //forward or backward 特定日から前方探索or当日から後方探索
	offset: number;		// 未来の日付も含む場合何日分含めるか number of future days to show 
	onset: string;		// 特定日からforwardに探索する場合の起点日 onset date
	duration: number;	// 探索日数 number of days to search per page
	showElements:{
		heading: boolean,
		link: boolean,
		tag: boolean,
		listItems: boolean
	};
	headingLevel: boolean[];
	allRootItems: boolean;
	displayFileInfo: string; // none || lines || days

	headingsToIgnore: string[];  // filter
	linksToIgnore: string[];
	tagsToIgnore: string[];
	listItemsToIgnore: string[];

}

// 設定項目デフォルト
export const DEFAULT_SETTINGS: DailyNoteOutlineSettings = {
	initialSearchType: 'backward',
	offset: 7,
	onset: '2020-03-30',
	duration: 28,
	showElements: {
		heading: true,
		link: true,
		tag: true,
		listItems: true
	},
	
	headingLevel: [true, true, true, true, true, true],
	allRootItems: true,
	displayFileInfo: 'lines',

	headingsToIgnore: [],
	linksToIgnore: [],
	tagsToIgnore: [],
	listItemsToIgnore: [],
}

export interface FileInfo {
	// file:TFile;
	date: moment;
	//content: string;
	lines: string[];
	numOfLines: number
}

export interface OutlineData {	

	typeOfElement:'heading'|'link'|'tag'|'listItems';
	position:Pos;
	link?:string;
	displayText?: string;
	level?:number;
}

export default class DailyNoteOutlinePlugin extends Plugin {

	settings: DailyNoteOutlineSettings;

	async onload() {
		
		await this.loadSettings();

		//register custome view according to Devloper Docs
		this.registerView(
			DailyNoteOutlineViewType,
			(leaf) => new DailyNoteOutlineView(leaf, this, this.settings)
		);

		//コマンド追加
		// Open Outline: アウトライン表示用のカスタムビューを開く
		this.addCommand({
			id: 'daily-note-outline-open',
			name: 'Open Outline',

			callback: async ()=> {
				let [leaf] = this.app.workspace.getLeavesOfType(DailyNoteOutlineViewType);
				if (!leaf) {
					leaf = this.app.workspace.getRightLeaf(false);
					await leaf.setViewState({ type: DailyNoteOutlineViewType});
				}
				this.app.workspace.revealLeaf(leaf);
			}
		});
		
		// get Today's Note: DailyNoteInterfaceのtestのための開発用コマンド。
		// 全DailyNoteを取得したのち、本日分を取得して、consoleに表示する。
		
		// this.addCommand({
		// 	id: 'daily-note-outline-getTodaysNote',
		// 	name: "Get Today's Note",
		// 	callback: async ()=>{
		// 		// 全てのデイリーノートを取得
		// 		const allDailyNotes = getAllDailyNotes();
		// 		console.log(allDailyNotes);
		// 		console.log(typeof allDailyNotes);
		// 		console.log('momentそのまま',moment());
		// 		console.log(`DailyNoteInterfaceのキーの形式に。day-${moment().startOf('day').format()}`);

		// 		//本日のデイリーノートを取得
		// 		const todaysNote = getDailyNote(moment(), allDailyNotes);
		// 		if (todaysNote){
		// 			console.log(todaysNote)
		// 			// 日付の取得
		// 			const noteDate = getDateFromFile(todaysNote,"day");
		// 			console.log(`日付は ${noteDate}です`);
					
		// 			const cache = this.app.metadataCache.getFileCache(todaysNote);
		// 			console.log('cache:', cache);

		// 			const note = this.app.vault.cachedRead(todaysNote);
		// 			console.log(note);

		// 		} else {
		// 			console.log('今日のノートがみあたりません');
		// 		}
		// 	}
		// });
		

	// This adds a settings tab so the user can configure various aspects of the plugin
	this.addSettingTab(new DailyNoteOutlineSettingTab(this.app, this));

	}

	onunload() {
		// Developer Docsに従ってカスタムビューをデタッチ
		this.app.workspace.detachLeavesOfType(DailyNoteOutlineViewType);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}