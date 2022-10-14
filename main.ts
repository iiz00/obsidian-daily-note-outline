import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
// サンプルから独自に追加したのはItemView, WorkspaceLeaf  →だったけどview.tsに移動した。
//TFileも追加。

// デイリーノートインターフェースのimport   daily notes viewerを参考に
import { getAllDailyNotes, getDailyNote, getDateFromFile, getDateUID } from "obsidian-daily-notes-interface";
import moment from "moment";
import{ DailyNoteOutlineView, DailyNoteOutlineViewType } from './src/view'
import{ DailyNoteOutlineSettingTab } from './src/setting'


// 設定項目
export interface DailyNoteOutlineSettings {
	initialSearchType: string; //forwardまたはbackward 特定日から前方探索or当日から後方探索
	offset: number;		// 未来の日付も含む場合何日分含めるか
	onset: string;		// 特定日からforwardに探索する場合の起点日
	duration: number;	// 探索日数
	showElements:{
		heading: boolean,
		link: boolean,
		tag: boolean,
		listItems: boolean
	};
	headingLevel: boolean[];
	allRootItems: boolean;

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
	allRootItems: true

}

export interface OutlineData {	

	typeOfElement:'heading'|'link'|'tag'|'listItems';
	position:object;
	// とりあえず除外  offset:number;
	link?:string;
	displayText?: string;
	level?:number;
}

/* おそらく使わない
export interface OutlineFilter{
	filteredByType:boolean;
	filteredByLevel:boolean;
	filteredBySetting:boolean;
	filteredByWord:boolean;
	filteredByChain:boolean;
}
*/

export default class DailyNoteOutlinePlugin extends Plugin {

	settings: DailyNoteOutlineSettings;

	async onload() {
		
		await this.loadSettings();

		//Dev Docsに従ってカスタムビューをレジスト
		// outlineData,settingsは引数として渡す必要があるのだろうか。
		this.registerView(
			DailyNoteOutlineViewType,
			(leaf) => new DailyNoteOutlineView(leaf, this, this.settings)

		);
		//上について、recentFilesはもっと複雑な記述をしている。

		//コマンド追加
		// Open Outline
		//DailyNoteOutlineではビューを開くOpenコマンドだけ？
		// This adds a simple command that can be triggered anywhere
		// アウトライン表示用のカスタムビューを開く
		this.addCommand({
			id: 'daily-note-outline-open',
			name: 'Open Outline',

			// 以下はrecentfilesから
			// [leaf]は分割代入？ getLeavesOfType(DailyNoteOutlineViewType)の初めの値をleafに入れ、falsyだったらgetLeftLeaf(false)をfに代入
			//getLeftLeaf(false)はrightに置き換え
			callback: async ()=> {
				let [leaf] = this.app.workspace.getLeavesOfType(DailyNoteOutlineViewType);
				if (!leaf) {
					leaf = this.app.workspace.getRightLeaf(false);
					await leaf.setViewState({ type: DailyNoteOutlineViewType});
				}
				this.app.workspace.revealLeaf(leaf);
			}
		});
		
		// get Today's Note
		// DailyNoteInterfaceのテストのためのコマンド。
		// 全DNを取得したのち、本日分を取得する。
		this.addCommand({
			id: 'daily-note-outline-getTodaysNote',
			name: "Get Today's Note",
			callback: async ()=>{
				// 全てのデイリーノートを取得
				let allDailyNotes = getAllDailyNotes();
				console.log(allDailyNotes);

				//本日のデイリーノートを取得
				let todaysNote = getDailyNote(moment(), allDailyNotes);
				if (todaysNote){
					console.log(todaysNote)
					// 日付の取得
					//getDateFromFileの第2引数を空欄にするとエラーになるし、"day"をいれてもmoment全体が表示されてしまう。
					let noteDate = getDateFromFile(todaysNote,"day");
					console.log(`日付は ${noteDate}です`);
					
					const cache = this.app.metadataCache.getFileCache(todaysNote);
					console.log('cache:', cache);

					const note = this.app.vault.cachedRead(todaysNote);
					console.log(note);

				} else {
					console.log('今日のノートがみあたりません');
				}
			}
		});


	// This adds a settings tab so the user can configure various aspects of the plugin
	this.addSettingTab(new DailyNoteOutlineSettingTab(this.app, this));

	}

	onunload() {
		// DevDocsに従ってカスタムビューをデタッチ
		this.app.workspace.detachLeavesOfType(DailyNoteOutlineViewType);

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}