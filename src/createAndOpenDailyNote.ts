import { ExecOptionsWithStringEncoding } from "child_process";
import moment  from "moment";
import { TFile, WorkspaceLeaf } from 'obsidian';
import { createDailyNote, getDailyNote } from "obsidian-daily-notes-interface";

// import type { ISettings } from "src/settings";
// import { createConfirmationDialog } from "src/ui/modal";

/**
 * Create a Daily Note for a given date.
 */
export async function createAndOpenDailyNote( date: moment, allFiles: Record<string,TFile> 
  // inNewSplit: boolean,
  // settings: ISettings,
  // cb?: (newFile: TFile) => void
): Promise<void> {
  const { workspace } = window.app;
  // const { format } = getDailyNoteSettings();
  // const filename = date.format(format);

  const createFile = async () => {
    const newNote = await createDailyNote(date);
    // const leaf = inNewSplit
    //   ? workspace.splitActiveLeaf()
    //   : workspace.getUnpinnedLeaf();
    // const leaf = workspace.getUnpinnedLeaf();
    // await leaf.openFile(newNote, { active : true });
    await workspace.getLeaf().openFile(newNote);
    // cb?.(dailyNote);
  };
  const dailynote = getDailyNote(date, allFiles);
  if (!dailynote){
    await createFile();
  } else {
    await workspace.getLeaf().openFile(dailynote);
  }

  // if (settings.shouldConfirmBeforeCreate) {
  //   createConfirmationDialog({
  //     cta: "Create",
  //     onAccept: createFile,
  //     text: `File ${filename} does not exist. Would you like to create it?`,
  //     title: "New Daily Note",
  //   });
  // } else {
  //   await createFile();
  // }
}
