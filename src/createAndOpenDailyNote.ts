import moment  from "moment";
import { TFile, WorkspaceLeaf } from 'obsidian';
import { createDailyNote, getDailyNote, createPeriodicNote, IGranularity, getDateUID, createQuarterlyNote, createYearlyNote} from "obsidian-daily-notes-interface";


export async function createAndOpenDailyNote( granularity: IGranularity, date: moment, allFiles: Record<string,TFile>): Promise<void> {
	const { workspace } = window.app;

	const createFile = async () => {
		// createPeriodicNoteはquarter/yearには対応していないようなので分岐。
		let newNote:TFile;
		switch (granularity){
			case 'quarter':
				newNote = await createQuarterlyNote(date);
				break;
			case 'year':
				newNote = await createYearlyNote(date);
				break;
			default:
				newNote = await createPeriodicNote(granularity, date);
		}
				await workspace.getLeaf().openFile(newNote);

	};
	const dailynote = allFiles[getDateUID(date, granularity)];
	//const dailynote = getDailyNote(date, allFiles);
	if (!dailynote){
		await createFile();
	} else {
		await workspace.getLeaf().openFile(dailynote);
	}

}
