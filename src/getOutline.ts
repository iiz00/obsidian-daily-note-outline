import { TFile } from "obsidian";
import { getDateFromFile } from "obsidian-daily-notes-interface";
import { FileInfo, GRANULARITY_LIST, OutlineData } from "./main";
import { getBacklinkFilesDataview } from "./getTargetFiles";

// デイリーノートの配列から各ファイルに関する情報を抽出
export async function getFileInfo(files:TFile[]):Promise<FileInfo[]>{
    let fileInfo:FileInfo[]=[];
    for (let i=0; i < files.length ; i++){
        const content = await this.app.vault.cachedRead(files[i]);
        const lines = content.split("\n");

        const backlinkFiles = (this.settings.getBacklinks) ? getBacklinkFilesDataview( this.app, files[i]): undefined;

        let info:FileInfo = {
            date: getDateFromFile(files[i],GRANULARITY_LIST[this.activeGranularity]),
            //content: content,
            lines: lines,
            numOfLines: lines.length,
            isFolded: false,
            backlinks: backlinkFiles,
            frontmatterLinks: undefined
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
export async function getOutline(files:TFile[],info:FileInfo[]):Promise<OutlineData[][]>{
    let data:OutlineData[][]=[];    
    for (let i=0; i< files.length ; i++){
        const cache = this.app.metadataCache.getFileCache(files[i]);

        // properties(frontmatter)からリンクを取得
        info[i].frontmatterLinks = cache?.frontmatterLinks;

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
                    //マークダウンリンクに対応
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