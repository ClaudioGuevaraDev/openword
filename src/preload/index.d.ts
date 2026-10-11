import type { OpenWordApi } from '../shared/ipc-contract';

declare global {
  interface Window {
    readonly openword: OpenWordApi;
  }
}
