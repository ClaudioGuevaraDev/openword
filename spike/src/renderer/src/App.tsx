import { useEffect, useState } from 'react';
import {
  DocxEditor,
  LocaleProvider,
  useDocxEditor,
  useEditorCommand,
  useEditorState,
  useEditorValueCommand,
  useFontFamily,
  useFonts,
  useParagraphStyle,
} from '@docx-editor.dev/react';
import { packagedFonts } from '@docx-editor.dev/fonts';
import { es } from '@docx-editor.dev/i18n/es';
import '@docx-editor.dev/core/styles/editor.css';
import { systemFonts } from './fonts';
import { runSelftest } from './selftest';

type Doc = { name: string; bytes: Uint8Array };

const keep = (e: React.MouseEvent) => e.preventDefault(); // no robar el cursor del documento

function SlotButton({ slot, label }: { slot: Parameters<typeof useEditorCommand>[0]; label: string }) {
  const cmd = useEditorCommand(slot);
  return (
    <button onMouseDown={keep} onClick={() => cmd.execute()} disabled={!cmd.isEnabled} aria-pressed={cmd.isActive}
      style={{ fontWeight: cmd.isActive ? 700 : 400 }} title={cmd.disabledReason ?? label}>
      {label}
    </button>
  );
}

function Ribbon({ doc, onOpen }: { doc: Doc | null; onOpen: () => void }) {
  const editor = useDocxEditor();
  const font = useFontFamily();
  const size = useEditorValueCommand('font.size');
  const style = useParagraphStyle();
  const pages = useEditorState((s) => s.page);
  const [measurer, setMeasurer] = useState('?');

  useEffect(() => {
    if (!editor) return;
    const id = setInterval(() => {
      const m = (editor as unknown as { fontMeasurement?: () => { measurer: string; resolving: boolean } }).fontMeasurement?.();
      if (m) setMeasurer(`${m.measurer}${m.resolving ? '…' : ''}`);
    }, 500);
    return () => clearInterval(id);
  }, [editor]);

  const save = async () => {
    if (!editor) return;
    const bytes = new Uint8Array(await editor.save());
    await window.openword.saveAs(bytes, doc?.name ?? 'Documento1.docx');
  };
  const pdf = async () => {
    if (!editor) return;
    const r = await window.openword.exportPdf(new Uint8Array(await editor.save()));
    if (r) alert(`PDF: ${r.path}\nPáginas: ${r.pages} (DOM ${r.domPages}) en ${r.ms} ms`);
  };

  return (
    <div style={{ display: 'flex', gap: 6, padding: 6, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #ccc', background: '#f3f3f3' }}>
      <button onClick={onOpen}>Abrir</button>
      <button onClick={save}>Guardar como</button>
      <button onClick={pdf}>Exportar PDF</button>
      <span style={{ width: 12 }} />
      <select value={font.value ?? ''} disabled={!font.isEnabled} onChange={(e) => font.setValue(e.target.value)} style={{ width: 160 }}>
        <option value="">{font.value === null ? '(mixto)' : ''}</option>
        {font.options.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <select value={size.value ?? ''} disabled={!size.isEnabled} onChange={(e) => size.execute(Number(e.target.value))}>
        <option value="">—</option>
        {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72].map((pt) => <option key={pt} value={pt * 2}>{pt}</option>)}
      </select>
      <SlotButton slot="text.bold" label="N" />
      <SlotButton slot="text.italic" label="K" />
      <SlotButton slot="text.underline" label="S" />
      <SlotButton slot="alignment.center" label="Centrar" />
      <SlotButton slot="list.bullet" label="Viñetas" />
      <SlotButton slot="list.numbered" label="Numeración" />
      <select value={style.value ?? ''} disabled={!style.isEnabled} onChange={(e) => style.setValue(e.target.value)} style={{ width: 160 }}>
        <option value="">{style.value === null ? '(mixto)' : ''}</option>
        {style.options.map((s) => <option key={s.styleId} value={s.styleId}>{s.name}</option>)}
      </select>
      <SlotButton slot="insert.pageBreak" label="Salto pág." />
      <button onMouseDown={keep} onClick={() => editor?.exec({ type: 'setPageSetup', orientation: 'landscape', scope: 'section' } as never)}>Horizontal</button>
      <SlotButton slot="history.undo" label="↶" />
      <SlotButton slot="history.redo" label="↷" />
      <span style={{ marginLeft: 'auto', fontSize: 12 }}>
        Página {pages?.current ?? '?'} de {pages?.total ?? '?'} · medición: {measurer}
      </span>
    </div>
  );
}

function SelftestDriver({ name }: { name: string }) {
  const editor = useDocxEditor();
  useEffect(() => {
    if (editor && window.openword.selftest && import.meta.env.VITE_SELFTEST !== 'off') void runSelftest(editor, name);
  }, [editor, name]);
  return null;
}

export function App() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [ready, setReady] = useState(false);
  const [selftest, setSelftest] = useState(false);
  const fonts = useFonts(systemFonts, packagedFonts());

  useEffect(() => {
    void window.openword.initialDocument().then((d: Doc | null) => {
      if (d) { setDoc(d); setSelftest(Boolean((d as { selftest?: boolean }).selftest)); }
      setReady(true);
    });
  }, []);

  const open = async () => {
    const d = await window.openword.open();
    if (d) setDoc(d);
  };

  return (
    <div className="docx-editor" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {ready && <LocaleProvider i18n={es}>
        <DocxEditor.Root document={doc?.bytes ?? 'blank'} mode="edit" fonts={fonts} locale="es-ES"
          onFontError={(e) => console.warn(`[fonts] ${e.code}: ${e.message}`)}>
          <Ribbon doc={doc} onOpen={open} />
          <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
            <DocxEditor.Viewport style={{ flex: 1 }}>
              <DocxEditor.HeaderFooterChrome />
              <DocxEditor.NotesChrome />
              <DocxEditor.Content />
              <DocxEditor.ContextMenu />
              <DocxEditor.HyperLink />
            </DocxEditor.Viewport>
            <DocxEditor.Loading overlay />
          </div>
          {selftest && doc && <SelftestDriver name={doc.name} />}
        </DocxEditor.Root>
      </LocaleProvider>}
    </div>
  );
}
