import { App, MarkdownView, Menu, TFile, parseLinktext, setIcon, setTooltip } from "obsidian";
import { FileInfo, OutlineData, GRANULARITY_LIST } from "./main";
import { addFlag, checkFlag, getSubpathPosition, removeFlag } from "./util";
import { DailyNoteOutlineViewType } from "./view";

//  アウトライン描画	
export function drawOutline( files: TFile[], info: FileInfo[], data: OutlineData[][]):void {

    const containerEl: HTMLElement = createDiv("nav-files-container node-insert-event");
    const rootEl: HTMLElement = containerEl.createDiv("tree-item nav-folder mod-root"); 
    const rootChildrenEl: HTMLElement = rootEl.createDiv("tree-item-children nav-folder-children"); 

    if (files.length == 0){
        rootChildrenEl.createEl("h4",{
            text: "Daily/periodic note loading error(try clicking on the Home icon)"
        });
    }

    // include only modeがオンになっているか
    let includeMode: boolean = (this.settings.includeOnly != 'none') && (Boolean(this.settings.wordsToInclude.length) || (this.settings.includeBeginning));

    // 表示オンになっている見出しレベルの最高値
    let maxLevel = this.settings.headingLevel.indexOf(true);

    


    for (let i=0; i<files.length ; i++){

        // 最新の見出しレベル
        let latestHeadingLevel = 0;

        // デイリーノートのタイトル部分作成 = フォルダ作成
        const dailyNoteEl: HTMLElement = rootChildrenEl.createDiv("tree-item nav-folder");
        const dailyNoteTitleEl: HTMLElement = dailyNoteEl.createDiv("tree-item-self is-clickable mod-collapsible nav-folder-title");
        const dailyNoteChildrenEl: HTMLElement = dailyNoteEl.createDiv("tree-item-children nav-folder-children");

        // ノートタイトルに背景色を負荷
        const changeColor = this.settings.noteTitleBackgroundColor;

        if (changeColor !='none'){
            const customColor = this.settings.customNoteTitleBackgroundColor;
            const customColorHover = this.settings.customNoteTitleBackgroundColorHover;
            const theme = Boolean(document.getElementsByTagName('body')[0].classList.contains('theme-light'))? 'light':'dark'

            dailyNoteTitleEl.style.backgroundColor = customColor[changeColor][theme];
            dailyNoteTitleEl.addEventListener("mouseover", function(){
                this.style.backgroundColor = customColorHover[changeColor][theme];
            });
            dailyNoteTitleEl.addEventListener("mouseout", function(){
                this.style.backgroundColor =customColor[changeColor][theme];
            });
        }

        //  折りたたみアイコン
        const noteCollapseIcon:HTMLElement = dailyNoteTitleEl.createDiv("tree-item-icon collapse-icon nav-folder-collapse-indicator");
        setIcon(noteCollapseIcon,"right-triangle");

        //ファイル名にアイコンを付加
        // switch(this.settings.icon.note){
        //     case 'none':
        //         break;
        //     case 'custom':
        //         setIcon(dailyNoteTitleEl, this.settings.customIcon.note);
        //         break;
        //     default:
        //         if (this.settings.icon.note){
        //             setIcon(dailyNoteTitleEl, this.settings.icon.note);
        //         }
        //         break;
        // }

        

        //  折りたたみアイコンクリック時の処理
        noteCollapseIcon.addEventListener(
            "click",
            async (event: MouseEvent) => {
                event.stopPropagation();

                // フォールドされている場合
                if (info[i].isFolded){
                    // 個別フォールドフラグを除去
                    if (!this.collapseAll) {
                        if (checkFlag(files[i], 'fold', this.settings)){
                            removeFlag(files[i], 'fold', this.settings);
                            await this.plugin.saveSettings();
                        }
                    }

                    // オープン処理
                    dailyNoteEl.classList.remove('is-collapsed');
                    noteCollapseIcon.classList.remove('is-collapsed');
                    info[i].isFolded = false;
                    dailyNoteChildrenEl.style.display = 'block';

                } else {
                    // 開いている場合
                
                    // 個別フォールドフラグを追加
                    if (!this.collapseAll) {
                        addFlag(files[i],'fold',this.settings);
                    }
                    await this.plugin.saveSettings();
        
                    // フォールド処理
                    dailyNoteEl.classList.add('is-collapsed');
                    noteCollapseIcon.classList.add('is-collapsed');
                    info[i].isFolded = true;
                    dailyNoteChildrenEl.style.display = 'none';
                }
        })


        //weekly noteの場合、ファイル名に日付の範囲を付加表示
        let name = files[i].basename;
        if (this.settings.attachWeeklyNotesName && GRANULARITY_LIST[this.activeGranularity] =='week'){
            name = name + " (" +this.fileInfo[i].date.clone().startOf('week').format("MM/DD [-] ") + this.fileInfo[i].date.clone().endOf('week').format("MM/DD") +")";
        }
        dailyNoteTitleEl.createDiv("tree-item-inner nav-folder-title-content").setText(name);

        //ファイル名の後の情報を表示
        const infoToDisplay = (this.activeGranularity == 0 ) ? this.settings.displayFileInfoDaily : this.settings.displayFileInfoPeriodic;

        switch (infoToDisplay) {
            case 'lines':
                dailyNoteTitleEl.dataset.subinfo = info[i].numOfLines.toString();
                break;
            case 'days':
                let basedate = (this.settings.initialSearchType == "backward")? window.moment(): window.moment(this.settings.onset);
                dailyNoteTitleEl.dataset.subinfo = Math.abs(info[i].date.diff(basedate.startOf(GRANULARITY_LIST[this.activeGranularity]),GRANULARITY_LIST[this.activeGranularity])).toString();
                break;
            case 'dow':
                dailyNoteTitleEl.dataset.subinfo = info[i].date.format("dddd");
                break;
            case 'dowshort':
                dailyNoteTitleEl.dataset.subinfo = info[i].date.format("ddd");
                break;
            case 'weeknumber':
                dailyNoteTitleEl.dataset.subinfo = info[i].date.format("[w]ww");
                break;
            case 'tag':
                let firsttagIndex = data[i].findIndex( (element,index) =>
                    data[i][index].typeOfElement =='tag');
                if (firsttagIndex >= 0){
                    dailyNoteTitleEl.dataset.subinfo = data[i][firsttagIndex].displayText;
                }
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
                this.app.workspace.getLeaf().openFile(files[i]);
            },
            false
        );

        //hover preview
        dailyNoteTitleEl.addEventListener('mouseover', (event: MouseEvent) => {
            this.app.workspace.trigger('hover-link', {
                event,
                source: DailyNoteOutlineViewType,
                hoverParent: rootEl,
                targetEl: dailyNoteTitleEl,
                linktext: files[i].path,
            });
        });
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
                //新規ウィンドウに開く
                menu.addItem((item)=>
                    item
                        .setTitle("Open in new window")
                        .setIcon("scan")
                        .onClick(async()=> {
                            // await this.app.workspace.getLeaf('window').openFile(linkTarget);
                            await this.app.workspace.openPopoutLeaf({size:{width:this.settings.popoutSize.width,height:this.settings.popoutSize.height}}).openFile(files[i]);
                            if (this.settings.popoutAlwaysOnTop){
                                setPopoutAlwaysOnTop();
                            }
                        })
                );
                menu.showAtMouseEvent(event);
            }
        );

        // constructOutlineDOM.call(this, files[i], info[i], data[i], dailyNoteChildrenEl);

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


        // propertiesの処理
        if (this.settings.showPropertyLinks && info[i].frontmatterLinks){
            for (let j = 0; j < info[i].frontmatterLinks.length; j++){
                
                const linkTarget = this.app.metadataCache.getFirstLinkpathDest(parseLinktext(info[i].frontmatterLinks[j].link).path, files[i].path);
                if (!(linkTarget instanceof TFile)) {
                    continue;
                }
                const linkSubpath = parseLinktext(info[i].frontmatterLinks[j].link).subpath;
                // 抽出 extract
                if (this.extractMode == true) {
                    if (this.extractTask == true || !info[i].frontmatterLinks[j].displayText.toLowerCase().includes(this.settings.wordsToExtract.toLowerCase())){
                        continue;
                    } else {
                        isExtracted = true;
                    }
                }

                const outlineEl: HTMLElement = dailyNoteChildrenEl.createDiv("tree-item nav-file");
                const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");
                setIcon(outlineTitle,'link');
        
                outlineTitle.style.paddingLeft ='0.5em';
                outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(info[i].frontmatterLinks[j].displayText);
        
            
                //クリック時
                outlineTitle.addEventListener(
                    "click",
                    (event: MouseEvent) => {
                        event.preventDefault();
                        this.app.workspace.getLeaf().openFile(files[i]);
                    },
                    false
                );

                //hover preview
                outlineTitle.addEventListener('mouseover', (event: MouseEvent) => {
                    if (linkTarget){
                        //リンク情報にsubpath（見出しへのリンク）が含まれる場合、その位置を取得
                        let posInfo = {};
                        if(linkSubpath){
                            const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
                            if (subpathPosition?.start?.line){
                                posInfo = { scroll: subpathPosition.start.line};
                            }
                        }
                        this.app.workspace.trigger('hover-link', {
                            event,
                            source: DailyNoteOutlineViewType,
                            hoverParent: rootEl,   // rootEl→parentElにした
                            targetEl: outlineTitle,
                            linktext: linkTarget.path,
                            state: posInfo
                        });
                    }
                });

                // contextmenu
                outlineTitle.addEventListener(
                    "contextmenu",
                    (event: MouseEvent) => {
                        const menu = new Menu();

                        //抽出 filter関連コメントアウト
                        menu.addItem((item) =>
                            item
                                .setTitle("Extract")
                                .setIcon("search")
                                .onClick(async ()=>{
                                    this.plugin.settings.wordsToExtract = info[i].frontmatterLinks[j].displayText;
                                    await this.plugin.saveSettings();
                                    this.extractMode = true;
                                    this.extractTask = false;
                                    this.refreshView(false,false);
                                })
                        );
                        menu.addSeparator();


                        menu.addItem((item)=>
                            item
                                .setTitle("Open linked file")
                                .setIcon("links-going-out")
                                .onClick(async()=>{
                                    await this.app.workspace.getLeaf().openFile(linkTarget);

                                    if (linkSubpath){
                                        const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
                                        scrollToElement(subpathPosition.start?.line,0,this.app);
                                    }
                                })
                        );
                        menu.addSeparator();

                        //リンク先を新規タブに開く
                        menu.addItem((item)=>
                            item
                                .setTitle("Open linked file in new tab")
                                .setIcon("file-plus")
                                .onClick(async()=> {
                                    await this.app.workspace.getLeaf('tab').openFile(linkTarget);
                                    if (linkSubpath){
                                        // linkSubpathがあるときはそこまでスクロール
                                        const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
                                        scrollToElement(subpathPosition.start?.line, 0, this.app);
                                    }
                                })
                        );
                        //リンク先を右に開く
                        menu.addItem((item)=>
                            item
                                .setTitle("Open linked file to the right")
                                .setIcon("separator-vertical")
                                .onClick(async()=> {
                                    await this.app.workspace.getLeaf('split').openFile(linkTarget);
                                    if (linkSubpath){
                                        const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
                                        scrollToElement(subpathPosition.start?.line, 0, this.app);
                                    }
                                })
                        );
                        //リンク先を新規ウィンドウに開く
                        menu.addItem((item)=>
                            item
                                .setTitle("Open linked file in new window")
                                .setIcon("scan")
                                .onClick(async()=> {
                                    // await this.app.workspace.getLeaf('window').openFile(linkTarget);
                                    await this.app.workspace.openPopoutLeaf({size:{width:this.settings.popoutSize.width,height:this.settings.popoutSize.height}}).openFile(linkTarget);
                                    if (linkSubpath){
                                        const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
                                        scrollToElement(subpathPosition.start?.line, 0, this.app);
                                    }
                                    if (this.settings.popoutAlwaysOnTop){
                                        setPopoutAlwaysOnTop();
                                    }
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
                                })
                        );
                        //右に開く
                        menu.addItem((item)=>
                            item
                                .setTitle("Open to the right")
                                .setIcon("separator-vertical")
                                .onClick(async()=> {
                                    await this.app.workspace.getLeaf('split').openFile(files[i]);
                                })
                        );
                        //新規ウィンドウに開く
                        menu.addItem((item)=>
                            item
                                .setTitle("Open in new window")
                                .setIcon("scan")
                                .onClick(async()=> {
                                    await this.app.workspace.getLeaf('window').openFile(files[i]);
                                })
                        );
                        menu.showAtMouseEvent(event);
                    }
                );
            }
        }


        //アウトライン要素の描画。data[i]が要素0ならスキップ
        //二重ループから抜けるためラベルelementloopをつけた
        if (data[i].length > 0){

            elementloop: for (let j=0; j<data[i].length; j++){

                // 現アウトライン要素の種別を取得
                const element = data[i][j].typeOfElement;
                const linkTarget = (element !== 'link')? null : this.app.metadataCache.getFirstLinkpathDest(parseLinktext(data[i][j]?.link).path, files[i].path);
                const linkSubpath = (!linkTarget)? undefined : parseLinktext(data[i][j]?.link).subpath;
    
    
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
                    if (this.extractTask == false && !data[i][j].displayText.toLowerCase().includes(this.settings.wordsToExtract.toLowerCase())){
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
                    // 最新の見出しレベルを取得
                    latestHeadingLevel = data[i][j].level;
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
                        .createDiv("tree-item nav-file");
                //中身を設定
                const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");

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
                    const customStatus = Object.keys(this.settings.taskIcon).find((customStatus)=> this.settings.taskIcon[customStatus].symbol === data[i][j].task);
                    if (customStatus) {
                        setIcon(outlineTitle, this.settings.taskIcon[customStatus].icon);
                    }
                    // setIcon(outlineTitle, this.settings.taskIcon[Object.keys(this.settings.taskIcon).find((iconName)=> this.settings.taskIcon[iconName] === data[i][j].task)]);

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

                let indent: number = 0.5;
                // 見出しのインデント
                if (element =='heading' && this.settings.indent.heading == true){
                    indent = indent + (data[i][j].level - (maxLevel + 1))*1.5;
                }
                // 見出し以外のインデント
                if (element !='heading' && this.settings.indentFollowHeading){
                    const additionalIndent = (latestHeadingLevel - (maxLevel + 1) + (this.settings.indentFollowHeading == 2 ? 1: 0))*1.5;
                    indent = indent + (additionalIndent > 0 ? additionalIndent : 0);
                }
                // リンクが前のエレメントと同じ行だった場合インデント付加
                if (element =='link' && data[i][j].position.start.line == data[i][j-1]?.position.start.line){
                    indent = indent + 1.5;
                }

                outlineTitle.style.paddingLeft = `${indent}em`;


                if (element =='listItems' && data[i][j].task !== void 0) {
                        prefix = data[i][j].task == 'x' ? 
                            this.settings.prefix.taskDone : this.settings.prefix.task;
                        if (this.settings.addCheckboxText){
                            prefix = prefix + '['+data[i][j].task+'] ';
                        }
                }
                let dispText = this.stripMarkdownSymbol(data[i][j].displayText);

                outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(prefix + dispText);

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
                    let endLine:number = info[i].numOfLines - 1;  //初期値は文章末
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
                    setTooltip(outlineTitle, previewText2, {classes:['daily-note-preview']});

                    outlineTitle.dataset.tooltipPosition = this.settings.tooltipPreviewDirection;
                    outlineTitle.setAttribute('data-tooltip-delay','10');
                }

                outlineTitle.addEventListener(
                    "click",
                    async(event: MouseEvent) => {
                        await this.app.workspace.getLeaf().openFile(files[i]);
                        scrollToElement(data[i][j].position.start.line,data[i][j].position.start.col, this.app);
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
                        // (リンクのみ）リンク先を直接開く
                        if (element =='link'){
                            menu.addItem((item)=>
                                item
                                    .setTitle("Open linked file")
                                    .setIcon("links-going-out")
                                    .onClick(async()=>{
                                        await this.app.workspace.getLeaf().openFile(linkTarget);
                                        if (linkSubpath){
                                            const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
                                            scrollToElement(subpathPosition.start?.line,0,this.app);
                                        }
                                    })
                            );
                            menu.addSeparator();
                            //リンク先を新規タブに開く
                            menu.addItem((item)=>
                                item
                                    .setTitle("Open linked file in new tab")
                                    .setIcon("file-plus")
                                    .onClick(async()=> {
                                        await this.app.workspace.getLeaf('tab').openFile(linkTarget);
                                        if (linkSubpath){
                                            const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
                                            scrollToElement(subpathPosition.start?.line, 0, this.app);
                                        }
                                    })
							);
							//リンク先を右に開く
							menu.addItem((item)=>
								item
									.setTitle("Open linked file to the right")
									.setIcon("separator-vertical")
									.onClick(async()=> {
										if (linkTarget != this.activeFile){
											this.holdUpdateOnce = true;
										}
										await this.app.workspace.getLeaf('split').openFile(linkTarget);
										if (linkSubpath){
											const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
											scrollToElement(subpathPosition.start?.line, 0, this.app);
										}
									})
							);
							//リンク先を新規ウィンドウに開く
							menu.addItem((item)=>
								item
									.setTitle("Open linked file in new window")
									.setIcon("scan")
									.onClick(async()=> {
										if (linkTarget != this.activeFile){
											this.holdUpdateOnce = true;
										}
										// await this.app.workspace.getLeaf('window').openFile(linkTarget);
										await this.app.workspace.openPopoutLeaf({size:{width:this.settings.popoutSize.width,height:this.settings.popoutSize.height}}).openFile(linkTarget);
										if (linkSubpath){
											const subpathPosition = getSubpathPosition(this.app, linkTarget, linkSubpath);
											scrollToElement(subpathPosition.start?.line, 0, this.app);
										}
										if (this.settings.popoutAlwaysOnTop){
											setPopoutAlwaysOnTop();
										}
									})
							);
							menu.addSeparator();
                        }
                    
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
                                .createDiv("tree-item nav-file");
                        const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");
                        outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(info[i].lines[j]);
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
        //backlink filesの処理
        if (!this.settings.getBacklinks || !this.settings.showBacklinks){
            continue;
        }
        for (let j = 0; j < info[i].backlinks?.length; j++){
            
            // 抽出 extract
            if (this.extractMode == true) {
                if (this.extractTask == true || !info[i].backlinks[j].basename.toLowerCase().includes(this.settings.wordsToExtract.toLowerCase())){
                    continue;
                } else {
                    isExtracted = true;
                }
            }


            const outlineEl: HTMLElement = dailyNoteChildrenEl.createDiv("tree-item nav-file");
            const outlineTitle: HTMLElement = outlineEl.createDiv("tree-item-self is-clickable nav-file-title");
            setIcon(outlineTitle,'links-coming-in');
    
            outlineTitle.style.paddingLeft ='0.5em';
            outlineTitle.createDiv("tree-item-inner nav-file-title-content").setText(info[i].backlinks[j].basename);
    
        
            //クリック時
            outlineTitle.addEventListener(
                "click",
                async(event: MouseEvent) => {
                    await this.app.workspace.getLeaf().openFile(info[i].backlinks[j]);
                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                },
                false
            );
    
            //hover preview 
            outlineTitle.addEventListener('mouseover', (event: MouseEvent) => {
                this.app.workspace.trigger('hover-link', {
                    event,
                    source: DailyNoteOutlineViewType,
                    hoverParent: rootEl,   // rootEl→parentElにした
                    targetEl: outlineTitle,
                    linktext: info[i].backlinks[j].path,
                });
            });

			// contextmenu
			outlineTitle.addEventListener(
				"contextmenu",
				(event: MouseEvent) => {
					const menu = new Menu();
					//リンク元を新規タブに開く
					menu.addItem((item)=>
						item
							.setTitle("Open backlink file in new tab")
							.setIcon("file-plus")
							.onClick(async()=> {
								await this.app.workspace.getLeaf('tab').openFile(info[i].backlinks[j]);
							})
					);
					//リンク先を右に開く
					menu.addItem((item)=>
						item
							.setTitle("Open linked file to the right")
							.setIcon("separator-vertical")
							.onClick(async()=> {
								await this.app.workspace.getLeaf('split').openFile(info[i].backlinks[j]);
							})
					);
					//リンク先を新規ウィンドウに開く
					menu.addItem((item)=>
						item
							.setTitle("Open linked file in new window")
							.setIcon("scan")
							.onClick(async()=> {
								// await this.app.workspace.getLeaf('window').openFile(info.backlinks[i]);
								await this.app.workspace.openPopoutLeaf({size:{width:this.settings.popoutSize.width,height:this.settings.popoutSize.height}}).openFile(info[i].backlinks[j]);
								if (this.settings.popoutAlwaysOnTop){
									setPopoutAlwaysOnTop();
								}
							})
					);
					menu.showAtMouseEvent(event);
				});
        }


        // noteDOMの後処理

        // 折りたたまれていれば子要素を非表示にする
        if (this.collapseAll|| this.settings.fileFlag?.[files[i].path]?.fold){
            dailyNoteEl.classList.add('is-collpased');
            noteCollapseIcon.classList.add('is-collapsed');
            info[i].isFolded = true;
            dailyNoteChildrenEl.style.display = 'none';
        } else {
            info[i].isFolded =false;
        }


        // 抽出モードで抽出した要素がない場合、ノート自体を非表示に。
        if (this.extractMode == true && isExtracted == false){
            dailyNoteEl.remove();
        }
    }
    // アウトライン部分の描画実行
    this.contentEl.appendChild(containerEl);
}


// スクロール
export function scrollToElement(line: number, col: number, app: App): void {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
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

function setPopoutAlwaysOnTop(){
    const { remote } = require('electron');
    const activeWindow = remote.BrowserWindow.getFocusedWindow();
    activeWindow.setAlwaysOnTop(true);
}