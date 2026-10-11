/// <reference types="vite/client" />
import type { SpikeApi } from '../../preload/index';
declare global {
  interface Window {
    openword: SpikeApi;
  }
}
