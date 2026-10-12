// Validación en la frontera IPC: un esquema por canal, comprobado contra el contrato de
// @shared/ipc-contract. Lo que llega del renderer es `unknown` hasta pasar por aquí.
import { isAbsolute } from 'node:path';
import { z } from 'zod';
import type { InvokeArgs, InvokeChannel, SendChannel, SendChannels } from '@shared/ipc-contract';

const MAX_DOCUMENT_BYTES = 512 * 1024 * 1024;

const Bytes = z
  .instanceof(Uint8Array)
  .refine((b) => b.byteLength <= MAX_DOCUMENT_BYTES, 'documento demasiado grande');
const NoNul = (s: string) => !s.includes('\0');
const FilePath = z.string().min(1).max(4096).refine(NoNul, 'ruta inválida');
/**
 * Rutas soltadas sobre la ventana: solo absolutas (las da `webUtils.getPathForFile`). La
 * extensión no se exige: el formato se decide por el contenido y así se abren también
 * .html, .xml o .mht, que LibreOffice convierte.
 */
const DroppedPath = FilePath.refine(isAbsolute, 'ruta no absoluta');
const JobId = z.uuid();
const RequestId = z.string().min(1).max(128);
const Word = z.string().min(1).max(64);
const FamilyList = z.array(z.string().min(1).max(256)).max(64);

const SettingsPatch = z.object({
  uiLanguage: z.enum(['auto', 'es', 'en']).optional(),
  spellcheck: z
    .object({
      enabled: z.boolean(),
      languages: z.array(z.string().max(16)).max(8),
      ignoreUppercase: z.boolean(),
      ignoreWithNumbers: z.boolean(),
    })
    .partial()
    .optional(),
  autoRecoverMinutes: z.number().optional(),
});

export const PrintRenderResult = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    pages: z.number().int().min(0).max(100_000),
    sizes: z.array(z.string().max(32)).max(500),
    measurer: z.string().max(64),
  }),
  z.object({ ok: z.literal(false), error: z.string().max(2000) }),
]);

const none = z.tuple([]);

export const invokeArgs: { readonly [C in InvokeChannel]: z.ZodType<InvokeArgs<C>> } = {
  'app:info': none,
  'doc:current': none,
  'doc:save': z.tuple([Bytes]),
  'doc:save-as': z.tuple([Bytes]),
  'file:open-dialog': none,
  'file:open-recent': z.tuple([FilePath]),
  'file:open-paths': z.tuple([z.array(DroppedPath).max(100)]),
  'file:recent': none,
  'file:pick-image': none,
  'clipboard:read': none,
  'print:prepare': z.tuple([Bytes]),
  'print:print': z.tuple([JobId]),
  'print:save-pdf': z.tuple([JobId]),
  'print:source-bytes': none,
  'settings:get': none,
  'settings:update': z.tuple([SettingsPatch]),
  'spell:languages': none,
  'recovery:snapshot': z.tuple([Bytes]),
  'fonts:families': none,
  'fonts:resolve': z.tuple([FamilyList]),
};

export const sendArgs: { readonly [C in SendChannel]: z.ZodType<SendChannels[C]> } = {
  'window:title-bar-theme': z.tuple([z.boolean()]),
  'doc:set-state': z.tuple([z.object({ dirty: z.boolean(), untouched: z.boolean() })]),
  'doc:save-answer': z.tuple([RequestId, z.boolean()]),
  'file:new': none,
  'file:close': none,
  'print:dispose': z.tuple([JobId]),
  'print:rendered': z.tuple([PrintRenderResult]),
  'spell:add-word': z.tuple([Word]),
};
