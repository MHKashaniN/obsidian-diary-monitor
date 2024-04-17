import DiaryMonitor from "main";
import { App, PluginSettingTab, Setting } from "obsidian"

export class DMSettingsTab extends PluginSettingTab {
    plugin: DiaryMonitor;

    constructor(app: App, plugin: DiaryMonitor) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        let { containerEl } = this;
        containerEl.empty();
        new Setting(containerEl)
            .setName("Diary Path")
            .setDesc("Set the path of daily notes")
            .addText((item) => {
                item.setValue(this.plugin.settings.diaryPath)
                    .onChange((value) => {
                        this.plugin.settings.diaryPath = value;
                        this.plugin.saveSettings();
                    })
            });
        new Setting(containerEl)
            .setName("Notes Calender System")
            .setDesc("Calender system used in your daily notes")
            .addDropdown((item) => {
                item.addOption("persian", "Persian")
                    .addOption("gregorian", "Gregorain")
                    .setValue(this.plugin.settings.notesCalender)
                    .onChange((value) => {
                        this.plugin.settings.notesCalender = value;
                        this.plugin.saveSettings();
                    })
            });
    }
}