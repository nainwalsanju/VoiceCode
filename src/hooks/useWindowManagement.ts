import { invoke } from '@tauri-apps/api/core';

export async function setAlwaysOnTop(onTop: boolean): Promise<void> {
  await invoke('set_always_on_top', { onTop });
}

export async function showMainWindow(): Promise<void> {
  await invoke('show_window');
}

export async function hideMainWindow(): Promise<void> {
  await invoke('hide_window');
}
