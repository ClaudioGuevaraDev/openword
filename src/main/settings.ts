// Preferencias persistentes en userData/settings.json (escritura atómica sencilla).
import { app, BrowserWindow } from 'electron';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { IpcChannel } from '@shared/ipc-contract';
import { DEFAULT_SETTINGS, mergeSettings, type Settings, type SettingsPatch } from '@shared/settings';

export class SettingsStore {
  private current: Settings = DEFAULT_SETTINGS;
  private readonly file = join(app.getPath('userData'), 'settings.json');
  private readonly listeners = new Set<(settings: Settings) => void>();

  async load(): Promise<Settings> {
    try {
      this.current = mergeSettings(DEFAULT_SETTINGS, JSON.parse(await readFile(this.file, 'utf8')));
    } catch {
      this.current = DEFAULT_SETTINGS;
    }
    return this.current;
  }

  get(): Settings {
    return this.current;
  }

  async update(patch: SettingsPatch): Promise<Settings> {
    this.current = mergeSettings(this.current, {
      ...this.current,
      ...patch,
      spellcheck: { ...this.current.spellcheck, ...(patch.spellcheck ?? {}) },
    });
    const temp = `${this.file}.tmp`;
    await writeFile(temp, JSON.stringify(this.current, null, 2));
    await rename(temp, this.file);
    for (const listener of this.listeners) listener(this.current);
    for (const win of BrowserWindow.getAllWindows())
      win.webContents.send(IpcChannel.settingsChanged, this.current);
    return this.current;
  }

  onChange(listener: (settings: Settings) => void): void {
    this.listeners.add(listener);
  }
}
