import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';

export interface HotkeyConfig {
  key: string;
  callback: () => void;
}

let registeredHotkey: string | null = null;

export async function registerGlobalHotkey(key: string, callback: () => void): Promise<boolean> {
  try {
    if (registeredHotkey) {
      await unregisterGlobalHotkey(registeredHotkey);
    }

    await register(key, (event) => {
      if (event.state === 'Pressed') {
        callback();
      }
    });

    registeredHotkey = key;
    return true;
  } catch (error) {
    console.error('Failed to register hotkey:', error);
    return false;
  }
}

export async function unregisterGlobalHotkey(key: string): Promise<void> {
  try {
    await unregister(key);
    if (registeredHotkey === key) {
      registeredHotkey = null;
    }
  } catch (error) {
    console.error('Failed to unregister hotkey:', error);
  }
}

export async function checkHotkeyRegistered(key: string): Promise<boolean> {
  try {
    return await isRegistered(key);
  } catch {
    return false;
  }
}
