// Preferencias persistentes en userData/settings.json (escritura atómica y en serie).
import { app, BrowserWindow } from 'electron';
import { copyFile, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { errnoCode } from '@shared/errors';
import { IpcChannel } from '@shared/ipc-contract';
import { DEFAULT_SETTINGS, mergeSettings, type Settings, type SettingsPatch } from '@shared/settings';
import { logError } from './log';

export class SettingsStore {
  private current: Settings = DEFAULT_SETTINGS;
  private readonly file = join(app.getPath('userData'), 'settings.json');
  private readonly listeners = new Set<(settings: Settings) => void>();
  /** Las escrituras se encadenan: dos cambios seguidos no compiten por el mismo archivo. */
  private queue: Promise<unknown> = Promise.resolve();
  private writes = 0;

  async load(): Promise<Settings> {
    try {
      this.current = mergeSettings(DEFAULT_SETTINGS, JSON.parse(await readFile(this.file, 'utf8')));
    } catch (error) {
      this.current = DEFAULT_SETTINGS;
      if (errnoCode(error) !== 'ENOENT') {
        // Archivo dañado o ilegible: se guarda una copia antes de que la próxima escritura lo pise.
        logError('settings', error);
        await copyFile(this.file, `${this.file}.bad`).catch(() => undefined);
      }
    }
    return this.current;
  }

  get(): Settings {
    return this.current;
  }

  update(patch: SettingsPatch): Promise<Settings> {
    const run = this.queue.then(() => this.write(patch));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async write(patch: SettingsPatch): Promise<Settings> {
    const next = mergeSettings(this.current, {
      ...this.current,
      ...patch,
      spellcheck: { ...this.current.spellcheck, ...(patch.spellcheck ?? {}) },
    });
    const temp = `${this.file}.${process.pid}-${++this.writes}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(next, null, 2));
      await rename(temp, this.file);
    } catch (error) {
      await unlink(temp).catch(() => undefined);
      throw error;
    }
    // Solo tras persistir: memoria, disco y ventanas quedan siempre de acuerdo.
    this.current = next;
    for (const listener of this.listeners) listener(next);
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IpcChannel.settingsChanged, next);
    return next;
  }

  onChange(listener: (settings: Settings) => void): void {
    this.listeners.add(listener);
  }
}
