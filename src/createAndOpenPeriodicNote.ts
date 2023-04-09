/*
Codes in this file is adapted from Periodic Notes by Liam Cain https://github.com/liamcain/obsidian-periodic-notes

The original work is MIT-licensed.

MIT License

Copyright (c) 2021 Liam Cain

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


import moment from "moment";
import { App, TFile, WorkspaceLeaf, normalizePath, Notice } from 'obsidian';
import { IGranularity } from "obsidian-daily-notes-interface";

import { CalendarSet } from "./periodicNotesTypes";

import { Granularity, PeriodicConfig } from "./periodicNotesTypes";

const DEFAULT_NOTE_FORMAT = {
	day: "YYYY-MM-DD",
	week: "gggg-[W]ww",
	month: "YYYY-MM",
	quarter: "YYYY-[Q]Q",
	year: "YYYY"
}


export async function createAndOpenPeriodicNote( granularity: IGranularity, date: moment, calendarSet: CalendarSet): Promise<void> {
	const { workspace } = window.app;


	let file = window.app.plugins.getPlugin("periodic-notes").cache.getPeriodicNote(
		calendarSet.id, granularity, date 
	);
	if (!file) {
		//  fileを作成
    	const config = calendarSet[granularity];
    	const format = calendarSet[granularity].format;

		const filename = date.format(format ? format : DEFAULT_NOTE_FORMAT[granularity]);
		const templateContents = await getTemplateContents(window.app, config.templatePath);
		const renderedContents = applyTemplateTransformations(
			filename,
			granularity as Granularity,
			date,
			format,
			templateContents
    	);
    const destPath = await getNoteCreationPath(window.app, filename, config);
    file = await window.app.vault.create(destPath, renderedContents);
  }

	await workspace.getLeaf().openFile(file);
}


// Periodic Notes util.tsから
async function getTemplateContents(
	app: App,
	templatePath: string | undefined
  ): Promise<string> {
	const { metadataCache, vault } = app;
	const normalizedTemplatePath = normalizePath(templatePath ?? "");
	if (templatePath === "/") {
	  return Promise.resolve("");
	}
  
	try {
	  const templateFile = metadataCache.getFirstLinkpathDest(normalizedTemplatePath, "");
	  return templateFile ? vault.cachedRead(templateFile) : "";
	} catch (err) {
	  console.error(
		`Failed to read the daily note template '${normalizedTemplatePath}'`,
		err
	  );
	  new Notice("Failed to read the daily note template");
	  return "";
	}
  }

function applyTemplateTransformations(
filename: string,
granularity: Granularity,
date: moment,
format: string,
rawTemplateContents: string
): string {
let templateContents = rawTemplateContents;

templateContents = rawTemplateContents
	.replace(/{{\s*date\s*}}/gi, filename)
	.replace(/{{\s*time\s*}}/gi, window.moment().format("HH:mm"))
	.replace(/{{\s*title\s*}}/gi, filename);

if (granularity === "day") {
	templateContents = templateContents
	.replace(/{{\s*yesterday\s*}}/gi, date.clone().subtract(1, "day").format(format))
	.replace(/{{\s*tomorrow\s*}}/gi, date.clone().add(1, "d").format(format))
	.replace(
		/{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
		(_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
		const now = window.moment();
		const currentDate = date.clone().set({
			hour: now.get("hour"),
			minute: now.get("minute"),
			second: now.get("second"),
		});
		if (calc) {
			currentDate.add(parseInt(timeDelta, 10), unit);
		}

		if (momentFormat) {
			return currentDate.format(momentFormat.substring(1).trim());
		}
		return currentDate.format(format);
		}
	);
}

if (granularity === "week") {
	templateContents = templateContents.replace(
	/{{\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*:(.*?)}}/gi,
	(_, dayOfWeek, momentFormat) => {
		const day = getDayOfWeekNumericalValue(dayOfWeek);
		return date.weekday(day).format(momentFormat.trim());
	}
	);
}

if (granularity === "month") {
	templateContents = templateContents.replace(
	/{{\s*(month)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
	(_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
		const now = window.moment();
		const monthStart = date
		.clone()
		.startOf("month")
		.set({
			hour: now.get("hour"),
			minute: now.get("minute"),
			second: now.get("second"),
		});
		if (calc) {
		monthStart.add(parseInt(timeDelta, 10), unit);
		}

		if (momentFormat) {
		return monthStart.format(momentFormat.substring(1).trim());
		}
		return monthStart.format(format);
	}
	);
}

if (granularity === "quarter") {
	templateContents = templateContents.replace(
	/{{\s*(quarter)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
	(_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
		const now = window.moment();
		const monthStart = date
		.clone()
		.startOf("quarter")
		.set({
			hour: now.get("hour"),
			minute: now.get("minute"),
			second: now.get("second"),
		});
		if (calc) {
		monthStart.add(parseInt(timeDelta, 10), unit);
		}

		if (momentFormat) {
		return monthStart.format(momentFormat.substring(1).trim());
		}
		return monthStart.format(format);
	}
	);
}

if (granularity === "year") {
	templateContents = templateContents.replace(
	/{{\s*(year)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
	(_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
		const now = window.moment();
		const monthStart = date
		.clone()
		.startOf("year")
		.set({
			hour: now.get("hour"),
			minute: now.get("minute"),
			second: now.get("second"),
		});
		if (calc) {
		monthStart.add(parseInt(timeDelta, 10), unit);
		}

		if (momentFormat) {
		return monthStart.format(momentFormat.substring(1).trim());
		}
		return monthStart.format(format);
	}
	);
}

return templateContents;
}


async function getNoteCreationPath(
	app: App,
	filename: string,
	periodicConfig: PeriodicConfig
  ): Promise<string> {
	const directory = periodicConfig.folder ?? "";
	const filenameWithExt = !filename.endsWith(".md") ? `${filename}.md` : filename;
  
	const path = normalizePath(join(directory, filenameWithExt));
	await ensureFolderExists(app, path);
	return path;
  }

// Credit: @creationix/path.js
function join(...partSegments: string[]): string {
	// Split the inputs into a list of path commands.
	let parts: string[] = [];
	for (let i = 0, l = partSegments.length; i < l; i++) {
		parts = parts.concat(partSegments[i].split("/"));
	}
	// Interpret the path commands to get the new resolved path.
	const newParts = [];
	for (let i = 0, l = parts.length; i < l; i++) {
		const part = parts[i];
		// Remove leading and trailing slashes
		// Also remove "." segments
		if (!part || part === ".") continue;
		// Push new path segments.
		else newParts.push(part);
	}
	// Preserve the initial slash if there was one.
	if (parts[0] === "") newParts.unshift("");
	// Turn back into a single string path.
	return newParts.join("/");
}


async function ensureFolderExists(app: App, path: string): Promise<void> {
	const dirs = path.replace(/\\/g, "/").split("/");
	dirs.pop(); // remove basename

	if (dirs.length) {
		const dir = join(...dirs);
		if (!app.vault.getAbstractFileByPath(dir)) {
		await app.vault.createFolder(dir);
		}
	}
}


function getDaysOfWeek(): string[] {
	const { moment } = window;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let weekStart = (moment.localeData() as any)._week.dow;
	const daysOfWeek = [
	  "sunday",
	  "monday",
	  "tuesday",
	  "wednesday",
	  "thursday",
	  "friday",
	  "saturday",
	];
  
	while (weekStart) {
	  const day = daysOfWeek.shift();
	  if (day) daysOfWeek.push(day);
	  weekStart--;
	}
	return daysOfWeek;
  }

function getDayOfWeekNumericalValue(dayOfWeekName: string): number {
	return getDaysOfWeek().indexOf(dayOfWeekName.toLowerCase());
  }