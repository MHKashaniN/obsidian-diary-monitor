import { randomInt } from 'crypto';
import {Plugin, ItemView, WorkspaceLeaf, TFile, normalizePath} from 'obsidian';

type dayObject = {
	dayName: string;
	value: number;
}
type yearObject = {
	yearName: string;
	days: dayObject[];
}

export const VIEW_TYPE_HEATMAP = "heatmap-view";

export class HeatmapView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_HEATMAP;
  }

  getDisplayText() {
    return "Heatmap view";
  }

  getIcon() {
	return "layout-grid";
  }

  async onResize(): Promise<void> {

  }

  async onOpen() {
	let fileResults = await this.getFileValues();
	let years = fileResults.years;
	const container = this.containerEl.children[1];
	container.empty();

	let viewWidthStr = container.getCssPropertyValue("width");
	let viewWidth: number = viewWidthStr.substring(0, viewWidthStr.length-2) as unknown as number;
	let dayBlockSize: number = 0.8 * viewWidth / 55;
	if (years) {
		for (let year of years) {
			this.createYearBlock(container, year, viewWidth, dayBlockSize, fileResults.minValue, fileResults.maxValue);
		}
	}
  }

  async onClose() {
    // Nothing to clean up.
  }

  createYearBlock(container: Element, year: yearObject, viewWidth: number, dayBlockSize: number, minValue: number, maxValue: number) {
	container.createEl("h1", { text: year.yearName, cls: "year-name"});
    let currentYear = container.createEl("div", { cls: "year-block"});
    currentYear.style.height = String(7 * dayBlockSize * 10 / 8) + "px";
	let pDate: number[] = [+year.yearName, 1, 1]
	let mDate = this.jalali_to_gregorian(pDate[0], pDate[1], pDate[2]);
	let date = new Date(mDate[0], mDate[1]-1, mDate[2]);
    let column: number = 0, row: number = (date.getDay() + 1) % 7;
    while (pDate[0] == (year.yearName as unknown as number)) {
    	let currentDay = currentYear.createEl("div", { cls: "day-block" });
		let pDateStr: string = String(pDate[0]) + '-' + pDate[1].toString().padStart(2, '0') + '-' + pDate[2].toString().padStart(2, '0')
		let value = year.days.find((value: dayObject) => value.dayName == pDateStr)?.value;
    	currentDay.style.position = "absolute";
    	currentDay.style.left = String(column * (viewWidth/55)) + "px";
    	currentDay.style.top = String(row * (viewWidth/55)) + "px";
    	currentDay.style.width = String(dayBlockSize) + "px";
    	currentDay.style.height = String(dayBlockSize) + "px";
		if (value)
			currentDay.style.backgroundColor = "hsl(134, 100%, " + String(100 - ((value - minValue)/(maxValue - minValue))*80) + "%)";

    	row ++;
    	if (row == 7) {
    		row = 0;
    		column ++;
    	}
		date.setDate(date.getDate() + 1);
		pDate = this.gregorian_to_jalali(date.getFullYear(), date.getMonth()+1, date.getDate());
    }
  }

  gregorian_to_jalali(gy: number, gm: number, gd: number) {
	let g_d_m: number[], jy: number, jm: number, jd: number, gy2: number, days: number;
	g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
	gy2 = (gm > 2) ? (gy + 1) : gy;
	days = 355666 + (365 * gy) + ~~((gy2 + 3) / 4) - ~~((gy2 + 99) / 100) + ~~((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
	jy = -1595 + (33 * ~~(days / 12053));
	days %= 12053;
	jy += 4 * ~~(days / 1461);
	days %= 1461;
	if (days > 365) {
	  jy += ~~((days - 1) / 365);
	  days = (days - 1) % 365;
	}
	if (days < 186) {
	  jm = 1 + ~~(days / 31);
	  jd = 1 + (days % 31);
	} else {
	  jm = 7 + ~~((days - 186) / 30);
	  jd = 1 + ((days - 186) % 30);
	}
	return [jy, jm, jd];
  }
  
  jalali_to_gregorian(jy: number, jm: number, jd: number) {
	let sal_a: number[], gy: number, gm: number, gd: number, days: number;
	jy += 1595;
	days = -355668 + (365 * jy) + (~~(jy / 33) * 8) + ~~(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
	gy = 400 * ~~(days / 146097);
	days %= 146097;
	if (days > 36524) {
	  gy += 100 * ~~(--days / 36524);
	  days %= 36524;
	  if (days >= 365) days++;
	}
	gy += 4 * ~~(days / 1461);
	days %= 1461;
	if (days > 365) {
	  gy += ~~((days - 1) / 365);
	  days = (days - 1) % 365;
	}
	gd = days + 1;
	sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
	return [gy, gm, gd];
  }

  async getFileValues() {
	const daysFolder = app.vault.getFolderByPath(normalizePath("Diary"));
	const dayFiles = daysFolder?.children;
	let years: yearObject[] = [];
	let minValue = 0;
	let maxValue = 0;
	if (dayFiles) {
		dayFiles.sort((a: TFile, b: TFile): number => {
			if (a.basename.substring(0, 4) == b.basename.substring(0, 4))
				return a.basename.localeCompare(b.basename);
			else
				return -a.basename.substring(0, 4).localeCompare(b.basename.substring(0, 4))
		});
		await dayFiles.forEach(async (file: TFile) => {
			let year = file.basename.substring(0, 4);
			let frontMatterEnd = app.metadataCache.getFileCache(file)?.frontmatterPosition?.end.offset;
			let text = (await app.vault.cachedRead(file)).substring(frontMatterEnd??0);
			while (text[0] == '\n' || text[0] == '\r')
				text = text.substring(1);
			
			let value = (text.length > 0)? text.split(/\s+/).length : 0;
			if (value < minValue)
				minValue = value;
			if (value > maxValue)
				maxValue = value;
			let dayObj = {dayName: file.basename.substring(0, 10), value: value};
			if (!years.find(x => x.yearName == year))
				years.push({yearName: year, days: [dayObj]});
			else
				years[years.findIndex(x => x.yearName == year)].days.push(dayObj);
		});
	}
	return {years: years, minValue: minValue, maxValue: maxValue};
  }
}

export default class DiaryMonitor extends Plugin {
	async onload() {
		this.registerView(
			VIEW_TYPE_HEATMAP,
			(leaf) => new HeatmapView(leaf)
			);

		this.addRibbonIcon("layout-grid", "Open heatmap view", () => {
			this.activateView();
		});
	}

	async onunload() {
		//app.workspace.detachLeavesOfType(VIEW_TYPE_HEATMAP);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_HEATMAP);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE_HEATMAP, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}
}

// import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// // Remember to rename these classes and interfaces!

// interface MyPluginSettings {
// 	mySetting: string;
// }

// const DEFAULT_SETTINGS: MyPluginSettings = {
// 	mySetting: 'default'
// }

// export default class MyPlugin extends Plugin {
// 	settings: MyPluginSettings;

// 	async onload() {
// 		await this.loadSettings();

// 		// This creates an icon in the left ribbon.
// 		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
// 			// Called when the user clicks the icon.
// 			new Notice('This is a notice!');
// 		});
// 		// Perform additional things with the ribbon
// 		ribbonIconEl.addClass('my-plugin-ribbon-class');

// 		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
// 		const statusBarItemEl = this.addStatusBarItem();
// 		statusBarItemEl.setText('Status Bar Text');

// 		// This adds a simple command that can be triggered anywhere
// 		this.addCommand({
// 			id: 'open-sample-modal-simple',
// 			name: 'Open sample modal (simple)',
// 			callback: () => {
// 				new SampleModal(this.app).open();
// 			}
// 		});
// 		// This adds an editor command that can perform some operation on the current editor instance
// 		this.addCommand({
// 			id: 'sample-editor-command',
// 			name: 'Sample editor command',
// 			editorCallback: (editor: Editor, view: MarkdownView) => {
// 				console.log(editor.getSelection());
// 				editor.replaceSelection('Sample Editor Command');
// 			}
// 		});
// 		// This adds a complex command that can check whether the current state of the app allows execution of the command
// 		this.addCommand({
// 			id: 'open-sample-modal-complex',
// 			name: 'Open sample modal (complex)',
// 			checkCallback: (checking: boolean) => {
// 				// Conditions to check
// 				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
// 				if (markdownView) {
// 					// If checking is true, we're simply "checking" if the command can be run.
// 					// If checking is false, then we want to actually perform the operation.
// 					if (!checking) {
// 						new SampleModal(this.app).open();
// 					}

// 					// This command will only show up in Command Palette when the check function returns true
// 					return true;
// 				}
// 			}
// 		});

// 		// This adds a settings tab so the user can configure various aspects of the plugin
// 		this.addSettingTab(new SampleSettingTab(this.app, this));

// 		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
// 		// Using this function will automatically remove the event listener when this plugin is disabled.
// 		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
// 			console.log('click', evt);
// 		});

// 		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
// 		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
// 	}

// 	onunload() {

// 	}

// 	async loadSettings() {
// 		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
// 	}

// 	async saveSettings() {
// 		await this.saveData(this.settings);
// 	}
// }

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: MyPlugin;

// 	constructor(app: App, plugin: MyPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }
