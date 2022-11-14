import { MarkdownView, Notice, setIcon, debounce, Debouncer} from 'obsidian';

import { ItemView, WorkspaceLeaf, TFile} from 'obsidian'

import { getAllDailyNotes, getDateFromFile } from "obsidian-daily-notes-interface";
import moment from "moment"

import DailyNoteOutlinePlugin, { DailyNoteOutlineSettings, OutlineData, FileInfo } from 'src/main';


export const DailyNoteOutlineViewType = 'daily-note-outline';


export class DailyNoteOutlineView extends ItemView {
	
	private plugin: DailyNoteOutlinePlugin;		
	private settings:DailyNoteOutlineSettings;

	private allDailyNotes: Record<string,TFile>;
	// private arrayAll: [string, TFile][]; 
	private targetFiles: TFile[];
	private fileInfo: FileInfo[];
	private searchRange: {
		latest: moment,
		earliest: moment
	};
	private outlineData: OutlineData[][];

	private flagRedraw: boolean;
	private flagRegetAll: boolean;
  
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

		// // 日数固定版
		// let i = 0;
		// let files: TFile[] = [];
		// while ( i < arrayAll.length){
		// 	const noteDate: moment = getDateFromFile(arrayAll[i][1], 'day');
		// 	if (noteDate.isSameOrBefore(this.searchRange.latest,'day')){
		// 		if (noteDate.isSameOrAfter(this.searchRange.earliest, 'day')){
		// 			files.push(arrayAll[i][1]);
		// 		} else {
		// 			break;
		// 		}
		// 	}
		// 	i++;
		// }
		// return files;


		// 件数固定版
		/*日数固定に移行したためコメントアウト
		let i = 0;
		let offset: number;
		while ( i < arrayAll.length ){
			// offsetの日付と現在の起点日を比較
			// もし起点日がoffsetの日付と同じかより未来なら、offsetの値を決定する。
			// もし起点日がoffsetより昔なら、offsetを+1する。
			// もしoffsetのDNの日付が起点日より昔なら、offsetを決定する
			if (getDateFromFile(arrayAll[i][1],'day').isSameOrBefore(this.startingDateTemp,'day')){
				offset = i;
				break;
			}
			i++;
		}
		if (offset == null){
			console.log("offsetなし。最後の日にします");
			offset = i;
		}
		// arrayAllから表示するデイリーノート配列を切り出す
		const targetArray = arrayAll.slice(offset,
			((offset + this.settings.numberOfDN)<(arrayAll.length - 1)) ? (offset + this.settings.numberOfDN):(arrayAll.length-1)
			 );
		const targetFiles: TFile[] = targetArray.map( e => e[1]);
		this.endingDateTemp = getDateFromFile(targetFiles[targetFiles.length-1],"day");
		return targetFiles;
		*/
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
			
		// 日付の範囲
		const navDateRange: HTMLElement = navHeader.createDiv("nav-date-range");
		const dateRange: string = this.searchRange.earliest.format("YYYY/MM/DD [-] ") + 
			this.searchRange.latest.format( this.searchRange.earliest.isSame(this.searchRange.latest,'year') ?  "MM/DD": "YYYY/MM/DD");
		navDateRange.createDiv("nav-date-range-content").setText(dateRange);

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
			
			dailyNoteTitleEl.createDiv("nav-dailynote-title-content").setText(files[i].basename);
			
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

			//アウトライン要素の描画。data[i]が要素0ならスキップ
			//二重ループから抜けるためラベルelementloopをつけた
			if (data[i].length > 0){
				elementloop: for (let j=0; j<data[i].length; j++){
					//// フィルタリング filtering

					//要素ごとの非表示判定  設定で非表示になっていればスキップ
					const element = data[i][j].typeOfElement;
					if (this.settings.showElements[element] == false){
						continue;
					}
					//// 要素種別ごとの処理
					
					// headings
					if (element == 'heading'){
						// 特定の見出しレベルが非表示の場合、該当すればスキップ
						if ( !this.settings.headingLevel[data[i][j].level - 1]){
							continue;
						}
						
						// 除外ワードにマッチすればスキップ
						for (const value of this.settings.headingsToIgnore){
							if ( (value) && data[i][j].displayText.includes(value)){
								continue elementloop;
							}
						}
					}

					// links
					if (element == 'link'){
						for (const value of this.settings.linksToIgnore){
							if ( (value) && data[i][j].displayText.includes(value)){
								continue elementloop;
							}
						}
					}

					// tags
					if (element == 'tag'){
						for (const value of this.settings.tagsToIgnore){
							if ( (value) && data[i][j].displayText.includes(value)){
								continue elementloop;
							}
						}
					}


					// listItems
					if (element == 'listItems'){
						// トップ以外のリストアイテムが非表示の場合、該当すればスキップ
						if (!this.settings.allRootItems){
							if (!(data[i][j].level == 0)){
								continue;
							}
						}

						// 除外ワードにマッチすればスキップ
						for (const value of this.settings.listItemsToIgnore){
							if ( (value) && data[i][j].displayText.includes(value)){
								continue elementloop;
							}
						}
					}

					//アウトライン要素部分作成
					const outlineEl: HTMLElement = dailyNoteChildrenEl
							.createDiv("nav-outline");
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
					outlineTitle.createDiv("nav-outline-title-content").setText(data[i][j].displayText);

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

				}
			} else {
				//要素0だったときの処理
				//各行をチェックし、空行でない初めの行を表示する
				for (let j = 0; j < info[i].lines.length; j++){
					if (info[i].lines[j] == ""){
						continue;
					} else {
						const outlineEl: HTMLElement = dailyNoteChildrenEl
								.createDiv("nav-outline");
						const outlineTitle: HTMLElement = outlineEl.createDiv("nav-file-title nav-action-button");
						outlineTitle.createDiv("nav-outline-title-content").setText(info[i].lines[j]);
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
		// アウトライン部分の描画実行
		this.contentEl.appendChild(containerEl);
	}
}