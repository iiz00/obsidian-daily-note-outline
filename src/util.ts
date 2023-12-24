import { App, Pos, TFile } from "obsidian";
import { DailyNoteOutlineSettings } from "./main";

// data.jsonのfileFlagを掃除：値が空配列のプロパティを削除
export function cleanFileFlag(file:TFile, settings:DailyNoteOutlineSettings): void {
    if (Object.keys(settings.fileFlag[file.path]).length == 0){
        delete settings.fileFlag[file.path];
    }
}

// data.jsonのfileFlagについて、file.pathのプロパティにflagで指定したフラグが存在するかチェック
export function checkFlag(file:TFile, flag: 'fold', settings: DailyNoteOutlineSettings): boolean {
    return settings.fileFlag[file.path]?.[flag];
}

// fileFlagに指定したフラグを追加
export function addFlag(file:TFile, flag: 'fold', settings: DailyNoteOutlineSettings): void {
    if(!settings.fileFlag.hasOwnProperty(file.path)){
        settings.fileFlag[file.path] = {};
    }
    settings.fileFlag[file.path][flag] = true;
}

//fileFlagから指定したフラグを除去
export function removeFlag(file:TFile, flag: 'fold', settings: DailyNoteOutlineSettings): void {
    delete settings.fileFlag[file.path][flag];
    cleanFileFlag(file, settings);
}

//fileFlagの指定したフラグをトグル
export function toggleFlag(file:TFile, flag: 'fold', settings: DailyNoteOutlineSettings): void {
    if (checkFlag(file, flag, settings) == true){
        removeFlag(file, flag, settings);
    } else {
        addFlag(file, flag, settings);
    }
}

// subpathを含むリンクのリンク先のpositionを取得
export function getSubpathPosition (app:App, file:TFile, subpath:string):Pos|null{
    const cache = app.metadataCache.getFileCache(file);
    if (!cache) {
        return null;
    }
    const checkpath = subpath.replace(/[#^]/g,'');
    if (cache.headings?.length){
        const index = cache.headings.findIndex((element) => element.heading.replace(/[#^]/g,'') == checkpath);
        if (index >= 0){
            return cache.headings[index].position;
        }
    }
    if (cache.sections?.length){
        const index = cache.sections.findIndex((element) => element.id?.replace(/[#^]/g,'') == checkpath);
        if (index >= 0){
            return cache.sections[index].position;
        }
    }
    return null;
}