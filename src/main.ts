import { Plugin, Pos, TFile, WorkspaceLeaf } from 'obsidian';

// Daily Note Interface
import { getAllDailyNotes, getDailyNote, getDateFromFile, IGranularity } from "obsidian-daily-notes-interface";
// moment.js
import moment from "moment";

import { DailyNoteOutlineView, DailyNoteOutlineViewType } from 'src/view'
import { DailyNoteOutlineSettingTab } from 'src/setting'



// 設定項目 
export interface DailyNoteOutlineSettings {
	initialSearchType: string; //forward or backward 特定日から前方探索or当日から後方探索
	offset: number;		// 未来の日付も含む場合何日分含めるか number of future days to show 
	onset: string;		// 特定日からforwardに探索する場合の起点日 onset date
	duration:{
		day:number;
		week:number;
		month:number;
		quarter:number;
		year:number;
	} // 探索日数 number of days to search per page
	showElements:{
		heading: boolean;
		link: boolean;
		tag: boolean;
		listItems: boolean
	};
	headingLevel: boolean[];
	allRootItems: boolean;
	allTasks: boolean;
	taskOnly: boolean;
	hideCompletedTasks: boolean;
	displayFileInfo: string; // none || lines || days   legacy
	displayFileInfoDaily: string; // none,lines,days,dow(day of the week),dowshort,weeknumber,tag
	displayFileInfoPeriodic: string; // none,lines,days,tag

	viewPosition: string;	//right || left || tab || split || popout 

	markdownOnly: boolean;
	exactMatchOnly: boolean;

	wordsToIgnore:{	//filter
		heading: string[];
		link: string[];
		tag: string[];
		listItems: string[]
	};

	inlinePreview: boolean;
	tooltipPreview: boolean;
	tooltipPreviewDirection: string; // left || right


	includeOnly: string;	// none || heading, link, tag, listItems
	wordsToInclude: string[];
	includeBeginning: boolean;

	primeElement: string; // none || heading, link, tag, listItems
	wordsToExclude:{
		heading: string[];
		link: string[];
		tag: string[];
		listItems: string[]
	};
	wordsToExtract: string;

	icon:{	//icon for each type of element
		heading: string;
		link: string;
		tag: string;
		listItems: string;
		note: string;
		task: string;
		taskDone: string;
	};

	customIcon:{
		heading: string;
		link: string;
		tag: string;
		listItems: string;
		note: string;
		task: string;
		taskDone: string;
	};

	indent:{
		heading: boolean;
		link: boolean;
		listItems: boolean;
	};
	indentFollowHeading: number; // 0 don't follow 1:same level 2: level+1

	prefix:{
		heading: string;
		link: string;
		tag: string;
		listItems: string;
		task: string;
		taskDone: string;
	};
	repeatHeadingPrefix: string; // none, level, level-1
	addCheckboxText: boolean;

	periodicNotesEnabled: boolean;
	calendarSetsEnabled: boolean;
	attachWeeklyNotesName: boolean;

	showDebugInfo: boolean;

	noteTitleBackgroundColor: string; // none, accent, custom
	customNoteTitleBackgroundColor: {
		accent: {
			light: string;
			dark: string;
		};
		custom: {
			light: string;
			dark: string;
		};
	};
	customNoteTitleBackgroundColorHover: {
		accent: {
			light: string;
			dark: string;
		};
		custom: {
			light: string;
			dark: string;
		};
	};

	// 各デイリーノートの情報
	fileFlag: {
		[path: string]: {
			'fold'?: boolean;
		};
	};

	// taskのcustom status
	taskIcon: {
		[status: string]: {
			symbol: string;
			icon: string;
		};
	};

	collapseAllAtStartup: boolean;

}

// 設定項目デフォルト
export const DEFAULT_SETTINGS: DailyNoteOutlineSettings = {
	initialSearchType: 'backward',
	offset: 7,
	onset: '2020-03-30',
	duration: {
		day:28,
		week:12,
		month:12,
		quarter:8,
		year:3
	},
	showElements: {
		heading: true,
		link: true,
		tag: true,
		listItems: true
	},
	
	headingLevel: [true, true, true, false, false, false],
	allRootItems: false,
	allTasks: true,
	taskOnly: false,
	hideCompletedTasks: false,
	displayFileInfo: 'lines',
	displayFileInfoDaily: 'lines', // none,lines,days,dow(day of the week),dowshort,weeknumber,tag
	displayFileInfoPeriodic: 'lines', // none,lines,days,tag
	viewPosition: 'right',

	markdownOnly: true,
	exactMatchOnly: false,

	wordsToIgnore:{
		heading: [],
		link: [],
		tag: [],
		listItems: []
	},

	inlinePreview: true,
	tooltipPreview: true,
	tooltipPreviewDirection: 'left',

	
	includeOnly: 'none',
	wordsToInclude: [],
	includeBeginning: true,

	primeElement: 'none',
	wordsToExclude:{
		heading: [],
		link: [],
		tag: [],
		listItems: []
	},
	wordsToExtract: '',

	icon:{	
		heading: 'none',
		link: 'link',
		tag: 'tag',
		listItems: 'list',
		note: 'file',
		task: 'square',
		taskDone: 'check-square'
	},
	customIcon:{
		heading: 'hash',
		link: 'link',
		tag: 'tag',
		listItems: 'list',
		note:'file',
		task:'square',
		taskDone:'check-square'
	},

	indent:{
		heading: true,
		link: true,
		listItems: true,
	},
	indentFollowHeading: 0,
	prefix:{
		heading: '',
		link: '',
		tag: '',
		listItems: '',
		task: '',
		taskDone: ''
	},
	repeatHeadingPrefix:'none',
	addCheckboxText: false,

	// dailyNoteCore: true,
	periodicNotesEnabled: true,
	calendarSetsEnabled: true,
	attachWeeklyNotesName: true,

	showDebugInfo: false,

	noteTitleBackgroundColor: 'none', // none, accent, custom
	customNoteTitleBackgroundColor: {
		accent: {
			light: '#E3E3E3',
			dark: '#363636',
		},
		custom: {
			light: '#BEBEBE',
			dark: '#4E4E4E',
		},
	},
	customNoteTitleBackgroundColorHover: {
		accent: {
			light: '#D3D3D3',
			dark: '#464646',
		},
		custom: {
			light: '#AEAEAE',
			dark: '#5E5E5E',
		},
	},
	
	fileFlag: {},

	// taskのcustom status
	taskIcon: {
		// todo: {symbol:' ', icon:'square'},
		incomplete: {symbol:'/', icon:'columns'},
		// done: {symbol:'x', icon:'check-square'},
		canceled: {symbol:'-', icon:'minus-square'},
		fowarded: {symbol:'>', icon:'send'},
		scheduling: {symbol:'<', icon:'calendar'},
		question: {symbol:'?', icon:'help-circle'},
		important: {symbol:'!', icon:'alert-triangle'},
		star: {symbol:'*', icon:'star'},
		quote: {symbol:'"', icon:'quote'},
		location: {symbol:'l', icon:'map-pin'},
		bookmark: {symbol:'b', icon:'bookmark'},
		information: {symbol:'i', icon:'info'},
		savings: {symbol:'S', icon:'dollar-sign'},
		idea: {symbol:'I', icon:'siren'},
		pros: {symbol:'p', icon:'thumbs-up'},
		cons: {symbol:'c', icon:'thumbs-down'},
		fire: {symbol:'f', icon:'flame'},
		key: {symbol:'k', icon:'key'},
		win: {symbol:'w', icon:'cake'},
		up: {symbol:'u', icon:'trending-up'},
		down: {symbol:'d', icon:'trending-down'},
	},

	collapseAllAtStartup: false,
}

// export interface FileStatus {
// 	isFolded: boolean;
// }

export interface FileInfo {
	// file:TFile;
	date: moment;
	//content: string;
	lines: string[];
	numOfLines: number
	isFolded: boolean;
}

export interface OutlineData {	

	typeOfElement:'heading'|'link'|'tag'|'listItems';
	position:Pos;
	link?:string;
	displayText?: string;
	// level ：listItemsについては0：トップ、1：ルート、2：それ以下
	level?:number;
	task?: string|undefined;
}

export const DAYS_PER_UNIT ={
	day: 1,
	week: 7,
	month: 30,
	quarter: 90,
	year:365
}

export const GRANULARITY_LIST: IGranularity[] = ['day','week','month','quarter','year']

export const GRANULARITY_TO_PERIODICITY = {
	day: 'daily',
	week: 'weekly',
	month: 'monthly',
	quarter: 'quarterly',
	year: 'yearly'
} 

export const FILEINFO_TO_DISPLAY = {
	none: 'none',
	lines: 'num of lines',
	days: 'distance',
	tag: 'first tag'
}

export const FILEINFO_TO_DISPLAY_DAY = {
	none: 'none',
	lines: 'num of lines',
	days: 'distance',
	tag: 'first tag',
	dow: 'day of week',
	dowshort: 'day of week(short)',
	weeknumber: 'week number'
}

export default class DailyNoteOutlinePlugin extends Plugin {

	settings: DailyNoteOutlineSettings;
	view: DailyNoteOutlineView;

	async onload() {
		
		await this.loadSettings();
		//register custome view according to Devloper Docs
		this.registerView(
			DailyNoteOutlineViewType,
			(leaf) => (this.view = new DailyNoteOutlineView(leaf, this, this.settings))
		);

		//コマンド追加
		// Open Outline: アウトライン表示用のカスタムビューを開く
		this.addCommand({
			id: 'daily-note-outline-open',
			name: 'Open Outline',

			callback: async ()=> {
				this.checkView(true);
			}
		});


		
		// // get Today's Note: DailyNoteInterfaceのtestのための開発用コマンド。
		// // 全DailyNoteを取得したのち、本日分を取得して、consoleに表示する。
		
		// this.addCommand({
		// 	id: 'daily-note-outline-getTodaysNote',
		// 	name: "Get Today's Note",
		// 	callback: async ()=>{
		// 		// 全てのデイリーノートを取得
		// 		const allDailyNotes = getAllDailyNotes();
		// 		console.log(allDailyNotes);
		// 		console.log(typeof allDailyNotes);
		// 		console.log('momentそのまま',moment());
		// 		console.log(`DailyNoteInterfaceのキーの形式に。day-${window.moment().startOf('day').format()}`);

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
	
	//  viewの更新(アップデート時用)
	this.app.workspace.onLayoutReady(async()=>{
		this.checkView(false);
	})

	// This adds a settings tab so the user can configure various aspects of the plugin
	this.addSettingTab(new DailyNoteOutlineSettingTab(this.app, this));

	}

	onunload() {
		// Developer Docsに従ってカスタムビューをデタッチ
		this.app.workspace.detachLeavesOfType(DailyNoteOutlineViewType);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// v0.6.0以前の設定データに対して互換性を維持するための対応
		// 0.6．0以前はdurationは number型だったが、 day~yearのプロパティを持つオブジェクトに変更した。
		if (typeof this.settings.duration === "number"){
			this.settings.duration = DEFAULT_SETTINGS.duration;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	checkView = async(activateView: boolean):Promise<void> => {

		let [leaf] = this.app.workspace.getLeavesOfType(DailyNoteOutlineViewType);
		if (!leaf) {
			switch (this.settings.viewPosition) {
				case 'right':
					leaf = this.app.workspace.getRightLeaf(false);
					break;
				case 'left':
					leaf = this.app.workspace.getLeftLeaf(false);
					break;
				case 'tab':
					leaf = this.app.workspace.getLeaf('tab');
					break;
				case 'split':
					leaf = this.app.workspace.getLeaf('split');
					break;
				case 'popout':
					leaf = this.app.workspace.getLeaf('window');
					break;
			}
			await leaf.setViewState({ type: DailyNoteOutlineViewType});
		}
		
		if (activateView) {
			this.app.workspace.revealLeaf(leaf);
		}
	} 
	 
}