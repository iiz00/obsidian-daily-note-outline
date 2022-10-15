// 必要性がわからないけど、とりあえずmainでimportしていたやつをまんまimportしておく。不要かも
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, setIcon, Setting, debounce, Debouncer} from 'obsidian';

import { ItemView, WorkspaceLeaf, TFile} from 'obsidian'

import { getAllDailyNotes, getDailyNote, getDateFromFile, getDateUID } from "obsidian-daily-notes-interface";
import moment from "moment"

import DailyNoteOutlinePlugin, { DailyNoteOutlineSettings, OutlineData, OutlineFilter } from '../main';

//SRSからコピペあとで修正を
import { COLLAPSE_ICON } from "src/constants";

export const DailyNoteOutlineViewType = 'daily-note-outline';


export class DailyNoteOutlineView extends ItemView {
	
	private readonly plugin: DailyNoteOutlinePlugin;		// この2行必要か.あとで検証
	private settings:DailyNoteOutlineSettings;

	/* 件数固定探索で使用していた
	startingDateTemp:moment;
	endingDateTemp:moment;
	*/

	arrayAll: [string, TFile][]; 
	targetFiles: TFile[];
	searchRange: {
		latest: moment,
		earliest: moment
	};
	outlineData: OutlineData[][];

	fragRedraw: boolean;
	fragRegetAll: boolean;
  
	constructor(
	  leaf: WorkspaceLeaf,
	  plugin: DailyNoteOutlinePlugin,
	  settings: DailyNoteOutlineSettings,

	) {
	  super(leaf);
  
	  this.plugin = plugin;
	  this.settings = settings;
	}
  
	getViewType(): string {					//多分public不要なので消した。でもTSにおいて省略＝publicかも
	  return DailyNoteOutlineViewType;			// getViewTypeはviewについてのユニークIDを返す。
	}
  
	getDisplayText(): string {
	  return 'DailyNote Outline';
	}
  
	getIcon(): string {				//viewのアイコンを決定
	  return 'calendar-clock';
	}

	// onOpen とonCloseをDev Docsからコピペ
	async onOpen(){

		this.initView();
		//  初回のデイリーノート探索はinitView()に移動し、実行前にわずかにウエイトを入れた。
		//そうしないと起動時に全デイリーノートのデータ取得に失敗するため。

		//自動更新のためのデータ変更、ファイル追加/削除の監視
		let debouncer:Debouncer<[]> = debounce(this.refreshOutline,3000,true);
		this.fragRedraw = false;
		this.fragRegetAll = false; 
		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
			console.log("on changed called");
			if (getDateFromFile(file,"day")){
				if (this.targetFiles.includes(file)){
					this.fragRedraw = true;
					console.log('DN changed');
					debouncer.call(this);
				}
			}
			// 単にdebouncer()だとthisがグローバルオブジェクトになってしまう
			//debouncer.call(this, file,'changed');
			}));

		this.registerEvent(this.app.vault.on('create',(file)=>{
			console.log('on create called');
			if (file instanceof TFile){
				if (getDateFromFile(file,"day")){
					this.fragRegetAll = true;
					console.log("file created",file);
					debouncer.call(this);
				}
			}
			
			}));
		this.registerEvent(this.app.vault.on('delete',(file)=>{
			console.log('on delete called');
			if (file instanceof TFile){
				if (getDateFromFile(file,"day")){
					this.fragRegetAll = true;
					console.log("file deleted",file);
					debouncer.call(this);
				}
			}

			}));
	
	}



	async onClose(){
		// Nothin to clean up
	}

	async initView() {
		await this.bootDelay(); //少し待たないと起動直後はDNの取得に失敗するようだ

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
					latest : moment().add(this.settings.offset,'days'),
					earliest: moment().subtract(this.settings.duration - 1,'days')
				};
			}
		}

		if (this.settings.initialSearchType == 'backward'){
			this.searchRange = {
				latest : moment().add(this.settings.offset,'days'),
				earliest: moment().subtract(this.settings.duration - 1,'days')
			};
	 	} 

		this.arrayAll = this.getArrayAll();
		console.log("arrayAllおよびsearchRange",this.arrayAll,this.searchRange);
		this.targetFiles = this.getTargetFiles(this.arrayAll);

		//let data: OutlineData[][] = await this.getOutline(this.targetFiles);
		this.outlineData = await this.getOutline(this.targetFiles);
		
		console.log('収集したアウトラインデータ',this.outlineData);
	

		// let filter: OutlineFilter[][] = this.checkFilter(data);

		/*おそらく使わない
		let noteCollapsed: boolean[]=[];
		//暫定処置
		for (let i=0; i<data.length; i++){
			noteCollapsed.push(false);
		}
		*/

		this.drawUI();
		this.drawOutline(this.targetFiles, this.outlineData);

	}

	async bootDelay(): Promise<void> {
		console.log("waiting");
		return new Promise(resolve => { setTimeout(resolve, 200);});
	}

	
	async refreshOutline(){
		if (this.fragRedraw || this.fragRegetAll){
			if (this.fragRegetAll){
				this.arrayAll = this.getArrayAll();
				this.targetFiles = this.getTargetFiles(this.arrayAll);
				this.fragRegetAll = false;

			}
			this.outlineData = await this.getOutline(this.targetFiles);
			this.drawUI();
			this.drawOutline(this.targetFiles, this.outlineData);
			this.fragRedraw = false;

		}
		

	}


	getArrayAll(): [string,TFile][]{ 
		let allDailyNotes = getAllDailyNotes();
		
		let arrayAll:[string,TFile][] = Object.entries(allDailyNotes);
		// 日付順にソート
		arrayAll.sort((a,b)=>{;
			if (a[0]<b[0]){
				return 1;
			} else {
				return -1;
			}
		});
		return arrayAll; 
	}

	// 指定範囲のデイリーノートを収集して、日付と対応させ、アウトライン要素を整えてOutlineData型のオブジェクトに格納する処理
	// ロード時や範囲を変更した際に実行

	getTargetFiles(arrayAll:[string,TFile][]): TFile[] {
		
		// 日数固定版
		let i = 0;
		let files: TFile[] = [];

		while ( i < arrayAll.length){
			let noteDate: moment = getDateFromFile(arrayAll[i][1], 'day');
			if (noteDate.isSameOrBefore(this.searchRange.latest,'day')){
				if (noteDate.isSameOrAfter(this.searchRange.earliest, 'day')){
					files.push(arrayAll[i][1]);
				} else {
					break;
				}
			}
			i++;
		}
		return files;

		// 件数固定版
		/*日数固定に移行したためコメントアウト
		console.log(this.startingDateTemp,'これが初めの日');
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

		//エラー処理
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
		console.log('最終日',this.endingDateTemp);
		
		return targetFiles;
		*/
	}
  
	async getOutline(files:TFile[]):Promise<OutlineData[][]>{
		// 一連のファイルをtargetFiles→filesと受け取り、それらのアウトライン要素群dataを返す

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
			};

			// console.log('check links',cache.hasOwnProperty("links") );
			if (cache.hasOwnProperty("links")){
				for (let j=0; j< cache.links.length ; j++){
					const element:OutlineData = {
						typeOfElement : "link",
						position : cache.links[j].position,
						//三項演算子でマークダウンリンクに対応
						displayText : 
							(cache.links[j].displayText =="") 
							? cache.links[j].original.substring(1,cache.links[j].original.indexOf("]")) 
							: cache.links[j].displayText,
						link: cache.links[j].link
					};
					//console.log('link',i,j);
					data[i].push(element);
				}				
			};
			
			// console.log('check lists');
			if (cache.hasOwnProperty("listItems")){
				// テキストを分解(現状リストアイテムが無ければ不要)
				const note = await this.app.vault.cachedRead(files[i]);
				const lines = note.split("\n");
				

				for (let j=0; j< cache.listItems.length ; j++){
					// parent が負の数であればルートレベルアイテム。
					if (cache.listItems[j].parent < 0){
						// リストアイテムがリストのトップアイテムか、ルートレベルアイテムだがトップではないかの判定
						// parentとposition.start.lineと絶対値が一致していればリストの最初のアイテム。
						// 不一致だとルートレベル。
						// ただし視覚的に離れたトップレベルのアイテムでも、間にheadingがないとルートアイテムとして判定されてしまうので、
						// 前のリストアイテムとの行の差が1の時のみルートアイテムとして判定するよう修正する。
						// element.level :  トップレベル＝0 , ルートレベル＝1
						let isTopLevel: boolean = true;
						if (j>0){
							if (!(Math.abs(cache.listItems[j].parent) == cache.listItems[j].position.start.line) &&
								(cache.listItems[j].position.start.line - cache.listItems[j-1].position.start.line == 1)){
									isTopLevel = false;
								}
							}
							
						const element:OutlineData = {
						typeOfElement : "listItems",
						position : cache.listItems[j].position,
						displayText : lines[cache.listItems[j].position.start.line].replace(/^(\s|\t)*-\s(\[.+\]\s)*/,''),
						level : (isTopLevel) ? 0 : 1
						};
						data[i].push(element);
					}
				}								
			};
			
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
			};
			// 要素順にソート
			data[i].sort((a,b)=> {
				return (a.position.start.offset - b.position.start.offset);
			});

		};
		return data;

	}

	/*消去予定	
	checkFilter(data:OutlineData[][]): OutlineFilter[][] {
		//以下はあくまで暫定的に全部falseにしてしまう処理。あとで要修正）
		let filter:OutlineFilter[][]=[];
		console.log('data dayo',data);
		for (let i=0; i<data.length -1; i++){
			filter[i]=[];
			for (let j=0; j<data[i].length -1; j++){
				filter[i].push({
					filteredByType: false,
					filteredByLevel:false,
					filteredBySetting:false,
					filteredByWord:false,
					filteredByChain:false
				});		

			}
		}
		return filter;
	}
	*/

	// 画面描画
	drawUI(){

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
				
				this.targetFiles = this.getTargetFiles(this.arrayAll);
				this.outlineData = await this.getOutline(this.targetFiles);

				this.drawUI();
				this.drawOutline(this.targetFiles, this.outlineData);
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
					this.searchRange.latest = this.searchRange.latest.add(this.plugin.settings.offset,'days');
				}

				this.targetFiles = this.getTargetFiles(this.arrayAll);
				this.outlineData = await this.getOutline(this.targetFiles);

				this.drawUI();
				this.drawOutline(this.targetFiles, this.outlineData);
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
						this.searchRange.latest = moment().add(this.settings.offset,'days');
						this.searchRange.earliest = moment().subtract(this.settings.duration - 1,'days')
					
					}
				}
				
				if (this.settings.initialSearchType == 'backward'){
					this.searchRange.latest = moment().add(this.settings.offset,'days');
					this.searchRange.earliest = moment().subtract(this.settings.duration - 1 ,'days');
					} 
				
				this.targetFiles = this.getTargetFiles(this.arrayAll);
				this.outlineData = await this.getOutline(this.targetFiles);

				this.drawUI();
				this.drawOutline(this.targetFiles, this.outlineData);
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
				this.arrayAll = this.getArrayAll();
				this.targetFiles = this.getTargetFiles(this.arrayAll);
				this.outlineData = await this.getOutline(this.targetFiles);

				this.drawUI();
				this.drawOutline(this.targetFiles, this.outlineData);
				}
		);
			
		// 日付
		const navDateRange: HTMLElement = navHeader.createDiv("nav-date-range");
		//const dateRange : string =  this.searchRange.earliest.format("L [-] ") + this.searchRange.latest.format('L');
		const dateRange: string = this.searchRange.earliest.format("YYYY/MM/DD [-] ") + 
			this.searchRange.latest.format( this.searchRange.earliest.isSame(this.searchRange.latest,'year') ?  "MM/DD": "YYYY/MM/DD");
		navDateRange.createDiv("nav-date-range-content").setText(dateRange);

		// 描画実行
		this.contentEl.empty();
		this.contentEl.appendChild(navHeader);
	}

	//  アウトライン描画	
	public drawOutline( files: TFile[], data: OutlineData[][]):void {

		const containerEl: HTMLElement = createDiv("nav-files-container node-insert-event");
		const rootEl: HTMLElement = containerEl.createDiv("nav-folder mod-root"); // nav-folderでいいのか？
		// rootEl.style.overflowY = "auto"; これはnav-folderの上のdivに与えるべき
		const rootChildrenEl: HTMLElement = rootEl.createDiv("nav-folder-children"); 
		//rootChildrenEl.style.position = "relative";
		// クラスの名前次第で、ファイルエクスプローラ（nav-folder）のcssを流用することも独立させることも可能と言うことか?

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
			// ノートのcollapse判定
			collapseIconEl.innerHTML = COLLAPSE_ICON;
			if (noteCollapsed[i]) {
				(collapseIconEl.childNodes[0] as HTMLElement).style.transform = "rotate(-90deg)";
			}
			*/
			
			dailyNoteTitleEl.createDiv("nav-dailynote-title-content").setText(files[i].basename);

			//navDailyNoteTitleElのonClickEvent
			dailyNoteTitleEl.addEventListener(
				"click",
				(event: MouseEvent) => {
					event.preventDefault();
					this.app.workspace.getLeaf().openFile(files[i]);
				},
				false
			);

			//アウトライン要素の描画。data[i]が要素0ならスキップ
			if (data[i].length > 0){
				for (let j=0; j<data[i].length; j++){
					//フィルタリング

					//要素ごとの非表示判定
					//console.log(keyof DailyNoteOutlineSettings);
					// 次の行に付けてたけど不要かも: keyof DailyNoteOutlineSettings['showElements'] 
					const element = data[i][j].typeOfElement;
					if (this.settings.showElements[element] == false){
						continue;
					}
					// 要素の種類ごとの処理

					if (element == 'heading'){
						if ( !this.settings.headingLevel[data[i][j].level - 1]){
							continue;
						}
					}
					
					if (element == 'listItems' && (!this.settings.allRootItems)){
						if (!(data[i][j].level == 0)){
							continue;
						}
					}

					//アウトライン要素部分作成 = ファイル作成
					////ここ単にfolderChildrenElではダメなのか。→大丈夫そうだった。
					const outlineEl: HTMLElement = dailyNoteChildrenEl
							.createDiv("nav-outline");
					//初期バージョン↓。
					//const navOutlineEl: HTMLElement = navDailyNoteEl
					//	.getElementsByClassName("nav-folder-children")[0]
					//	.createDiv("nav-outline");
					
					// SRSではここにhidden/collapsedによる非表示判定
					//フィルター判定もここにまとめられるかも。
					/*
					if (noteCollapsed[i]){
						outlineEl.style.display = "none";
					}
					*/

					//中身を設定
					const outlineTitle: HTMLElement = outlineEl.createDiv("nav-file-title nav-action-button");
					//アイコン
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

					outlineTitle.createDiv("nav-outline-title-content").setText(data[i][j].displayText);
					//ここにイベントリスナー追加
					outlineTitle.addEventListener(
						"click",
						async(event: MouseEvent) => {
							event.preventDefault();
							await this.app.workspace.getLeaf().openFile(files[i]);
							const view = this.app.workspace.getActiveViewOfType(MarkdownView);
							//console.log(data[i][j].position);
							//console.log(data[i][j].position.start.line);
							//console.log(data[i][j].position.start.col);
							//console.log(view);
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

					//ホバープレビュー
					outlineTitle.addEventListener('mouseover', (event: MouseEvent) => {
						this.app.workspace.trigger('hover-link', {
						  event,
						  source: DailyNoteOutlineViewType,
						  hoverParent: rootEl,
						  targetEl: outlineTitle,
						  linktext: files[i].path
						});
					  });

				}
			} else {
				//アウトラインがないときはcollapse非表示
				//collapseIconEl.style.display = "none";
			}

		}
		//console.log('this.contentEl',this.contentEl);
		//console.log('this.containerEl',this.containerEl);
		//console.log('this.contentEl.children',this.contentEl.children);
		//console.log('this.containerEl.children',this.containerEl.children);
		//this.contentEl.empty();  これあるとUIが消えちゃう
		this.contentEl.appendChild(containerEl);
		//console.log('現在の設定',this.plugin.settings);
	}




	// onHeaderとは? ペインのアイコンを右クリックしたときの（コンテキスト）メニューっぽい
	/*とりあえずコメントアウト
	public onHeaderMenu(menu: Menu): void {
	  menu
		.addItem((item) => {
		  item
			.setTitle('Clear list')
			.setIcon('sweep')
			.onClick(async () => {
			  this.data.recentFiles = [];
			  await this.plugin.saveData();
			  this.redraw();
			});
		})
		.addItem((item) => {
		  item
			.setTitle('Close')
			.setIcon('cross')
			.onClick(() => {
			  this.app.workspace.detachLeavesOfType(RecentFilesListViewType);
			});
		});
	}
	*/

	//publicということはAPIなのか？
	/*とりあえずコメントアウト

  	public load(): void { 
	  super.load();
	  this.registerEvent(this.app.workspace.on('file-open', this.update));
	}
	*/
  
	//描画  同様の処理が必要になるだろう
	/*とりあえずコメントアウト
	public readonly redraw = (): void => {
	  const openFile = this.app.workspace.getActiveFile();
  
	  const rootEl = createDiv({ cls: 'nav-folder mod-root' });
	  const childrenEl = rootEl.createDiv({ cls: 'nav-folder-children' });
  
	  this.data.recentFiles.forEach((currentFile) => {
		const navFile = childrenEl.createDiv({ cls: 'nav-file' });
		const navFileTitle = navFile.createDiv({ cls: 'nav-file-title' });
  
		if (openFile && currentFile.path === openFile.path) {
		  navFileTitle.addClass('is-active');
		}
  
		navFileTitle.createDiv({
		  cls: 'nav-file-title-content',
		  text: currentFile.basename,
		});
  
		navFile.setAttr('draggable', 'true');
		navFile.addEventListener('dragstart', (event: DragEvent) => {
		  const file = this.app.metadataCache.getFirstLinkpathDest(
			currentFile.path,
			'',
		  );
  
		  // eslint-disable-next-line @typescript-eslint/no-explicit-any
		  const dragManager = (this.app as any).dragManager;
		  const dragData = dragManager.dragFile(event, file);
		  dragManager.onDragStart(event, dragData);
		});
  
		navFile.addEventListener('mouseover', (event: MouseEvent) => {
		  this.app.workspace.trigger('hover-link', {
			event,
			source: RecentFilesListViewType,
			hoverParent: rootEl,
			targetEl: navFile,
			linktext: currentFile.path,
		  });
		});
  
		navFile.addEventListener('contextmenu', (event: MouseEvent) => {
		  const menu = new Menu(this.app);
		  const file = this.app.vault.getAbstractFileByPath(currentFile.path);
		  this.app.workspace.trigger(
			'file-menu',
			menu,
			file,
			'link-context-menu',
			this.leaf,
		  );
		  menu.showAtPosition({ x: event.clientX, y: event.clientY });
		});
  
		navFile.addEventListener('click', (event: MouseEvent) => {
		  this.focusFile(currentFile, event.ctrlKey || event.metaKey);
		});
	  });
  
	  const contentEl = this.containerEl.children[1];
	  contentEl.empty();
	  contentEl.appendChild(rootEl);
	};
	*/
  
	//データ更新？
	/*とりあえずコメントアウト
	private readonly updateData = async (file: TFile): Promise<void> => {
	  this.data.recentFiles = this.data.recentFiles.filter(
		(currFile) => currFile.path !== file.path,
	  );
	  this.data.recentFiles.unshift({
		basename: file.basename,
		path: file.path,
	  });
  
	  await this.plugin.pruneLength(); // Handles the save
	};
	*/
  
	// updateData と updateの違いは？
	/*とりあえずコメントアウト
	private readonly update = async (openedFile: TFile): Promise<void> => {
	  if (!openedFile || !this.plugin.shouldAddFile(openedFile)) {
		return;
	  }
  
	  await this.updateData(openedFile);
	  this.redraw();
	};
	*/
  
	/**
	 * Open the provided file in the most recent leaf.
	 *
	 * @param shouldSplit Whether the file should be opened in a new split, or in
	 * the most recent split. If the most recent split is pinned, this is set to
	 * true.
	 */
	//リンクを開く処理。使い回せるだろうか
	/*とりあえずコメントアウト
	private readonly focusFile = (file: FilePath, shouldSplit = false): void => {
	  const targetFile = this.app.vault
		.getFiles()
		.find((f) => f.path === file.path);
  
	  if (targetFile) {
		let leaf = this.app.workspace.getMostRecentLeaf();
  
		const createLeaf = shouldSplit || leaf.getViewState().pinned;
		if (createLeaf) {
		  leaf = this.app.workspace.createLeafBySplit(leaf);
		}
		leaf.openFile(targetFile);
	  } else {
		new Notice('Cannot find a file with that name');
		this.data.recentFiles = this.data.recentFiles.filter(
		  (fp) => fp.path !== file.path,
		);
		this.plugin.saveData();
		this.redraw();
	  }
	};
	*/
  }

/*＊＊＊ここまで */
