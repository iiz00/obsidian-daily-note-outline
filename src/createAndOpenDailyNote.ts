import moment  from "moment";
import { TFile, WorkspaceLeaf } from 'obsidian';
import { createDailyNote, getDailyNote } from "obsidian-daily-notes-interface";


export async function createAndOpenDailyNote( date: moment, allFiles: Record<string,TFile> 

): Promise<void> {
	const { workspace } = window.app;

	const createFile = async () => {
		const newNote = await createDailyNote(date);

		await workspace.getLeaf().openFile(newNote);

	};
	const dailynote = getDailyNote(date, allFiles);
	if (!dailynote){
		await createFile();
	} else {
		await workspace.getLeaf().openFile(dailynote);
	}

}
