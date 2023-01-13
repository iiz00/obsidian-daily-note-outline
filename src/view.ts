import { MarkdownView, Notice, setIcon, debounce, Debouncer, Menu} from 'obsidian';

import { ItemView, WorkspaceLeaf, TFile} from 'obsidian'

import { getAllDailyNotes, getDateFromFile, createDailyNote } from "obsidian-daily-notes-interface";
import moment from "moment"

import DailyNoteOutlinePlugin, { DailyNoteOutlineSettings, OutlineData, FileInfo } from 'src/main';

import { createAndOpenDailyNote } from 'src/createAndOpenDailyNote'
import { ModalExtract } from 'src/modalExtract'


export const DailyNoteOutlineViewType = 'daily-note-outline';


export class DailyNoteOutlineView extends ItemView {
	
	private plugin: DailyNoteOutlinePlugin;		
	private settings:DailyNoteOutlineSettings;

	private allDailyNotes: Record<string,TFile>;
	
	private targetFiles: TFile[];
	private fileInfo: FileInfo[];
	private searchRange: {
		latest: moment,
		earliest: moment
	};
	private outlineData: OutlineData[][];

	private flagRedraw: boolean;
	private flagRegetAll: boolean;

	private extractMode: boolean = false;

  
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
			// console.log("on changed called");
			if (getDateFromFile(file,"day")){
				if (this.targetFiles.includes(file)){
					this.flagRedraw = true;
					debouncerRequestRefresh.call(this);
					//単にdebouncerRequestRefresh()だとthisがグローバルオブジェクトになってしまう
				}
			}
		}));

		this.registerEvent(this.app.vault.on('create',(file)=>{
			//console.log('on create called');
			if (file instanceof TFile){
				if (getDateFromFile(file,"day")){
					this.flagRegetAll = true;
					debouncerRequestRefresh.call(this);
				}
			}
		}));
		this.registerEvent(this.app.vault.on('delete',(file)=>{
			//console.log('on delete called');
			if (file instanceof TFile){
				if (getDateFromFile(file,"day")){
					this.flagRegetAll = true;
					debouncerRequestRefresh.call(this);
				}
			}
		}));
	}

	async onClose(){
		// Nothin to clean up
	}

	private async initView() {
		await this.bootDelay(); //少し待たないと起動直後はDaily Noteの取得に失敗するようだ

		if (this.settings.initialSearchType == 'forward'){
			const onsetDate = moment(this.settings.onset,"YYYY-MM-DD");
			if (onsetDate.isValid()){
				this.searchRange = {
					earliest : onsetDate,
					latest : onsetDate.clone().add(this.settings.duration -1,'days')
				};
			} else {  
				// onsetDateが不正なら当日起点のbackward searchを行う
				new Notice('onset date is invalid');
				this.searchRange = {
					latest : moment().startOf('day').add(this.settings.offset,'days'),
					earliest: moment().startOf('day').subtract(this.settings.duration - 1,'days')
				};
			}
		}

		if (this.settings.initialSearchType == 'backward'){
			this.searchRange = {
				latest : moment().startOf('day').add(this.settings.offset,'days'),
				earliest: moment().startOf('day').subtract(this.settings.duration - 1,'days')
			};
		}

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
	private async refreshView(regetAll: boolean, getTarget:boolean, getOutline:boolean){
		

		if (regetAll){
			this.allDailyNotes = getAllDailyNotes();
		}
		if (getTarget){
			this.targetFiles = this.getTargetFiles(this.allDailyNotes);
		}
		if(getOutline){
			this.fileInfo = await this.getFileInfo(this.targetFiles);
			this.outlineData = await this.getOutline(this.targetFiles);
		}
		this.drawUI();
		this.drawOutline(this.targetFiles, this.fileInfo, this.outlineData);
	}


	// 取得した全デイリーノートから探索範囲のデイリーノートを切り出す
		private getTargetFiles(allFiles:Record<string,TFile>): TFile[]{
		// 日数固定版 日付範囲のループによる探索
		// review comment に基づく
		let files: TFile[] = [];
		let checkDate = this.searchRange.latest.clone();
		while (checkDate.isSameOrAfter(this.searchRange.earliest,'day')){
			if (allFiles[`day-${checkDate.format()}`]){
				files.push(allFiles[`day-${checkDate.format()}`]);
			}
			checkDate.subtract(1,'days');
		}
		return files;
	}

	// デイリーノートの配列から各ファイルに関する情報を抽出
	private async getFileInfo(files:TFile[]):Promise<FileInfo[]>{
		let fileInfo:FileInfo[]=[];
		for (let i=0; i < files.length ; i++){
			const content = await this.app.vault.cachedRead(files[i]);
			const lines = content.split("\n");
			const info:FileInfo = {
				date: getDateFromFile(files[i],'day'),
				//content: content,
				lines: lines,
				numOfLines: lines.length
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
						displayText : cache.headings[j].heading.padStart(cache.headings[j].heading.length + cache.headings[j].level - 1,'.'),
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
					// parent が負の数であればルートレベルアイテム。
					if (cache.listItems[j].parent < 0){
						// リストアイテムがリストのトップアイテムか、ルートレベルアイテムだがトップではないかの判定
						// parentとposition.start.lineと絶対値が一致していればリストの最初のアイテム。
						// 不一致だとルートレベル。
						// ただし視覚的に離れたトップレベルのアイテムでも、間にheadingがないとルートアイテムとして判定されてしまうので、
						// 前のリストアイテムとの行の差が1の時のみルートアイテムとして判定するよう修正する。
						// element.level :  トップレベル＝0 , ルートレベル＝1
						let isTopLevel = true;
						if (j>0){
							if (!(Math.abs(cache.listItems[j].parent) == cache.listItems[j].position.start.line) &&
								(cache.listItems[j].position.start.line - cache.listItems[j-1].position.start.line == 1)){
									isTopLevel = false;
							}
						}
						
						const element:OutlineData = {
						typeOfElement : "listItems",
						position : cache.listItems[j].position,
						displayText : this.fileInfo[i].lines[cache.listItems[j].position.start.line].replace(/^(\s|\t)*-\s(\[.+\]\s)*/,''),
						level : (isTopLevel) ? 0 : 1
						};
						data[i].push(element);
					}
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

		// 過去に移動
		let navActionButton: HTMLElement = navButtonContainer.createDiv("clickable-icon nav-action-button");
		navActionButton.ariaLabel = "previous notes";
		setIcon(navActionButton,"arrow-left",20);

		navActionButton.addEventListener(
			"click",
			async (event:MouseEvent) =>{
				event.preventDefault();
				this.searchRange.latest = this.searchRange.earliest.clone().subtract(1,'days');
				this.searchRange.earliest = this.searchRange.latest.clone().subtract(this.settings.duration - 1,'days');
				
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
				this.searchRange.earliest = this.searchRange.latest.clone().add(1,'days');
				this.searchRange.latest = this.searchRange.earliest.clone().add(this.settings.duration - 1,'days');
				if (this.searchRange.latest.isSame(moment(),'day') ){
					this.searchRange.latest = this.searchRange.latest.add(this.settings.offset,'days');
				}

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

				if (this.settings.initialSearchType == 'forward'){
					const onsetDate = moment(this.settings.onset,"YYYY-MM-DD");
					if (onsetDate.isValid()){
						this.searchRange.earliest = onsetDate;
						this.searchRange.latest = onsetDate.clone().add(this.settings.duration -1,'days');
					} else {  
						// onsetDateが不正なら当日起点のbackward searchを行う
						new Notice('onset date is invalid');
						this.searchRange.latest = moment().startOf('day').add(this.settings.offset,'days');
						this.searchRange.earliest = moment().startOf('day').subtract(this.settings.duration - 1,'days')
					}
				}
				
				if (this.settings.initialSearchType == 'backward'){
					this.searchRange.latest = moment().startOf('day').add(this.settings.offset,'days');
					this.searchRange.earliest = moment().startOf('day').subtract(this.settings.duration - 1 ,'days');
				} 
				
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
				if (this.settings.initialSearchType == 'forward'){
					const onsetDate = moment(this.settings.onset,"YYYY-MM-DD");
					if (onsetDate.isValid()){
						this.searchRange.earliest = onsetDate;
						this.searchRange.latest = onsetDate.clone().add(this.settings.duration -1,'days');
					} else {  
						// onsetDateが不正なら当日起点のbackward searchを行う
						new Notice('onset date is invalid');
						this.searchRange.latest = moment().startOf('day').add(this.settings.offset,'days');
						this.searchRange.earliest = moment().startOf('day').subtract(this.settings.duration - 1,'days')
					}
				}
				
				if (this.settings.initialSearchType == 'backward'){
					this.searchRange.latest = moment().startOf('day').add(this.settings.offset,'days');
					this.searchRange.earliest = moment().startOf('day').subtract(this.settings.duration - 1 ,'days');
				} 

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
		navActionButton.ariaLabel = "create/open today's daily note";
		setIcon(navActionButton,"calendar-plus",20);
		navActionButton.addEventListener(
			"click",
			async (event:MouseEvent) =>{
				event.preventDefault;
				const date = moment();
				createAndOpenDailyNote(date, this.allDailyNotes);
			}
		);
		navActionButton.addEventListener(
			"contextmenu",
			(event: MouseEvent) => {
				const menu = new Menu();
				menu.addItem((item) =>
					item
						.setTitle("create/open tomorrow's daily note")
						.setIcon("calendar-plus")
						.onClick(async ()=> {
							const date = moment().add(1,'days');
							createAndOpenDailyNote(date, this.allDailyNotes); 
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
				this.refreshView(false,false,false);
			});
		}
			
		// 日付の範囲
		const navDateRange: HTMLElement = navHeader.createDiv("nav-date-range");
		const dateRange: string = this.searchRange.earliest.format("YYYY/MM/DD [-] ") + 
			this.searchRange.latest.format( this.searchRange.earliest.isSame(this.searchRange.latest,'year') ?  "MM/DD": "YYYY/MM/DD");
		navDateRange.createDiv("nav-date-range-content").setText(dateRange);

		navDateRange.addEventListener(
			"click",
			async (event:MouseEvent) =>{
				event.preventDefault();
				const onsetDate = moment(this.settings.onset,"YYYY-MM-DD");
				if (onsetDate.isValid()){
					this.searchRange.earliest = onsetDate;
					this.searchRange.latest = onsetDate.clone().add(this.settings.duration -1,'days');
				} else {  
					// onsetDateが不正なら当日起点のbackward searchを行う
					this.searchRange.latest = moment().startOf('day').add(this.settings.offset,'days');
					this.searchRange.earliest = moment().startOf('day').subtract(this.settings.duration - 1,'days')
				}
				this.refreshView(false, true, true);
			}
		);

		// 描画実行
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
				text: "No daily note found"
			});
		}

		// include only modeか
		let includeMode: boolean = (this.settings.includeOnly != 'none') && (Boolean(this.settings.wordsToInclude.length) || (this.settings.includeBeginning));
		

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
			
			dailyNoteTitleEl.createDiv("nav-folder-title-content").setText(files[i].basename);
			
			//ファイル名の後の情報を表示

			switch (this.settings.displayFileInfo) {
				case 'lines':
					dailyNoteTitleEl.dataset.subinfo = info[i].numOfLines.toString();
					break;
				case 'days':
					let basedate = (this.settings.initialSearchType == "backward")? moment(): this.settings.onset;
					dailyNoteTitleEl.dataset.subinfo = Math.abs(info[i].date.diff(basedate,'days')).toString();
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
						if (!data[i][j].displayText.includes(this.settings.wordsToExtract)){
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
						// トップ以外のリストアイテムが非表示の場合、該当すればスキップ
						if (!this.settings.allRootItems){
							if (!(data[i][j].level == 0)){
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
					switch (element){
						case 'link':
							setIcon(outlineTitle,"link");
							break;
						case 'tag':
							setIcon(outlineTitle,"tag");
							break;
						case 'listItems':
							setIcon(outlineTitle,"list");
							break;
						default:
							break;
					}

					//要素ごとのテキスト
					outlineTitle.createDiv("nav-file-title-content").setText(data[i][j].displayText);

					// インラインプレビュー
					//アウトライン要素のあとに文字列が続く場合その行をプレビュー、そうでなければ次の行をプレビュー
					if (this.settings.inlinePreview) {
						let previewText: string ='';

						if (data[i][j].position.end.col < info[i].lines[ data[i][j].position.start.line ].length){
							previewText = info[i].lines[ data[i][j].position.start.line ];
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
						while (k< data[i].length) {
							//表示するエレメントタイプであれば行を取得してループを打ち切る
							if (this.settings.showElements[data[i][k].typeOfElement]){
								//ただし非トップのルートレベルリストアイテムの場合、非表示になっているので打ち切らない
								if (!(data[i][k].typeOfElement == 'listItems' && this.settings.allRootItems == false && data[i][k].level ==1)){
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
							menu.addItem((item) =>
								item
									.setTitle("extract")
									.setIcon("search")
									.onClick(async ()=>{
										this.plugin.settings.wordsToExtract = data[i][j].displayText;
										await this.plugin.saveSettings();
										this.extractMode = true;
										this.refreshView(false,false,false);
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
}