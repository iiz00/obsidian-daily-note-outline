	// 取得した全デイリーノートから探索範囲のデイリーノートを切り出す  

import { TFile } from "obsidian";
import { IGranularity, getDateUID } from "obsidian-daily-notes-interface";
import { DAYS_PER_UNIT } from "./main";
import { CalendarSet } from "./periodicNotesTypes";

	// (ver0.x.xのperiodic notesにも対応。)
export function getTargetFiles(allFiles:Record<string,TFile>, granularity: IGranularity): TFile[]{

		let files: TFile[] = [];
		let checkDate = this.searchRange.latest.clone();
		let checkDateEarliest = this.searchRange.earliest.clone();

		if (this.settings.initialSearchType =='backward'){
			if(checkDate.isSame(window.moment(),'day')){
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
	export function getTargetPeriodicNotes(calendarSet: CalendarSet, granularity: IGranularity): TFile[]{
		let files: TFile[] = [];

		// day基準の探索範囲であるsearchRangeを元に、粒度に応じて探索範囲を拡張したものをcheckDate,checkDateEarliestに代入
		let checkDate = this.searchRange.latest.clone();
		let checkDateEarliest = this.searchRange.earliest.clone();
		
		if (this.settings.initialSearchType=='backward'){
			if(checkDate.isSame(window.moment(),'day')){
				checkDate.add(Math.ceil(this.settings.offset/DAYS_PER_UNIT[granularity]),granularity);
			}
			checkDateEarliest = this.searchRange.latest.clone().subtract(this.settings.duration[granularity] - 1,granularity);
		} else {
			// forward searchのとき
			checkDate = this.searchRange.earliest.clone().add(this.settings.duration[granularity] - 1,granularity);
		}
		if (this.settings.showDebugInfo){
			console.log('DNO:searching caches of Periodic Notes... calendar set:',calendarSet);
		}

		while (checkDate.isSameOrAfter(checkDateEarliest,granularity)){
			const caches = this.app.plugins.getPlugin("periodic-notes").cache.getPeriodicNotes(calendarSet.id,granularity,checkDate);
			for (const file of caches){
				//厳密にマッチしたファイル出なければスキップ
				if ( this.settings.exactMatchOnly && !file?.matchData?.exact) {
					continue;
				}
				//ファイルパスが.mdで終わらなければ（マークダウンファイルでなければ）スキップ
				if (this.settings.markdownOnly && !file?.filePath.endsWith(".md")){
					continue;
				}
				// ファイルパスにPNのフォルダパスが含まれていない && PNのフォルダパスが指定されている のときは処理をスキップ
				// ＊現状のPNベータでは、カレンダーセットの指定にかかわらず全セットに含まれるPNが返されるようであるため、各セットのフォルダパスでフィルタリングする
				// ただしフォルダパスが指定されていないときはスキップ
				if (!file.filePath.startsWith(calendarSet[granularity].folder.concat("/")) && calendarSet[granularity].folder){
					continue;
				}
				const fileobj = this.app.vault.getAbstractFileByPath(file.filePath);
				if (fileobj instanceof TFile){
					files.push(fileobj);
				}
			}
			checkDate.subtract(1,granularity);
		}
		return files;
	}