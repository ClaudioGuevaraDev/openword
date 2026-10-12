// Registro tipado de handlers IPC. Cada mensaje pasa por: origen de confianza → esquema del
// canal (safeParse) → handler con los argumentos ya tipados por el contrato.
import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from 'electron';
import { z } from 'zod';
import type {
  InvokeArgs,
  InvokeChannel,
  InvokeResult,
  PushChannel,
  PushChannels,
  SendChannel,
  SendChannels,
} from '@shared/ipc-contract';
import { invokeArgs, sendArgs } from './ipc-schemas';
import { logError } from './log';
import { isTrustedOrigin } from './url-policy';

export class IpcRejected extends Error {}

export interface IpcRouter {
  handle<C extends InvokeChannel>(
    channel: C,
    handler: (
      event: IpcMainInvokeEvent,
      ...args: InvokeArgs<C>
    ) => InvokeResult<C> | Promise<InvokeResult<C>>,
  ): void;
  on<C extends SendChannel>(
    channel: C,
    listener: (event: IpcMainEvent, ...args: SendChannels[C]) => void,
  ): void;
}

export function createIpcRouter(devServerUrl: string | undefined): IpcRouter {
  const checkOrigin = (event: IpcMainEvent | IpcMainInvokeEvent) => {
    const url = event.senderFrame?.url ?? '';
    if (!isTrustedOrigin(url, devServerUrl))
      throw new IpcRejected(`IPC rechazado desde ${url || 'origen desconocido'}`);
  };
  const parse = <T>(channel: string, schema: z.ZodType<T>, args: unknown[]): T => {
    const parsed = schema.safeParse(args);
    if (!parsed.success)
      throw new IpcRejected(`Argumentos inválidos en ${channel}: ${z.prettifyError(parsed.error)}`);
    return parsed.data;
  };

  return {
    handle(channel, handler) {
      const schema = invokeArgs[channel];
      ipcMain.handle(channel, (event, ...raw: unknown[]) => {
        checkOrigin(event);
        return handler(event, ...parse(channel, schema, raw));
      });
    },
    on(channel, listener) {
      const schema = sendArgs[channel];
      ipcMain.on(channel, (event, ...raw: unknown[]) => {
        // Sin respuesta: un error aquí no tiene a quién volver y acabaría como excepción no
        // capturada en main. Se registra y el mensaje se descarta.
        try {
          checkOrigin(event);
          listener(event, ...parse(channel, schema, raw));
        } catch (error) {
          logError(`ipc ${channel}`, error);
        }
      });
    },
  };
}

/** Envío main → renderer con la forma que fija el contrato. */
export function push<C extends PushChannel>(
  contents: WebContents,
  channel: C,
  ...args: PushChannels[C]
): void {
  if (!contents.isDestroyed()) contents.send(channel, ...args);
}
