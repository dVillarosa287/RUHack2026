import { useEffect, useRef, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph } from 'docx';
import { jsPDF } from 'jspdf';
import { aiForestSummary, type AiProvider } from '@/lib/ai';
import { getSettings, type Forest, type Seed } from '@/lib/storage';

/** Raw HTML fragments were accidentally saved by a few page integrations; keep them out of AI and exports. */
export function isGarbageSeed(seed: Seed): boolean {
  return /<\/?[a-z][^>]*>/i.test(seed.text.trim());
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type ExportBlock = { kind: 'heading' | 'bullet' | 'paragraph'; text: string; level?: number };

function markdownBlocks(summary: string): ExportBlock[] {
  return summary.split(/\r?\n/).flatMap((line): ExportBlock[] => {
    const value = line.trim();
    if (!value) return [];
    const heading = value.match(/^(#{1,6})\s+(.+)$/);
    const headingMarks = heading?.[1];
    const headingText = heading?.[2];
    if (headingMarks && headingText) return [{ kind: 'heading', text: headingText.trim(), level: headingMarks.length }];
    const bullet = value.match(/^[-*]\s+(.+)$/);
    if (bullet?.[1]) return [{ kind: 'bullet', text: bullet[1].trim() }];
    return [{ kind: 'paragraph', text: value }];
  });
}

function exportPdf(forest: Forest, summary: string) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = 20;
  const right = 20;
  let y = 24;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 18) return;
      pdf.addPage();
      y = 24;
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(forest.name, left, y);
  y += 9;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Forest study guide', left, y);
  y += 7;
  pdf.setDrawColor(150);
  pdf.line(left, y, pageWidth - right, y);
  y += 12;

  for (const block of markdownBlocks(summary)) {
    const isHeading = block.kind === 'heading';
    const fontSize = isHeading ? (block.level === 1 ? 16 : 12) : 10.5;
    const lineHeight = isHeading ? 7 : 5.5;
    const indent = block.kind === 'bullet' ? 7 : 0;
    const prefix = block.kind === 'bullet' ? '- ' : '';
    const lines = pdf.splitTextToSize(prefix + block.text, pageWidth - left - right - indent) as string[];
    ensureSpace(lineHeight * lines.length + (isHeading ? 5 : 3));
    pdf.setFont('helvetica', isHeading ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    for (const line of lines) {
      pdf.text(line, left + indent, y);
      y += lineHeight;
    }
    y += isHeading ? 5 : 3;
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(110);
    pdf.text(`Forest study guide  |  ${page} / ${pages}`, left, pageHeight - 9);
    pdf.setTextColor(0);
  }
  pdf.save(`${forest.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'forest'}-summary.pdf`);
}

async function exportDocx(forest: Forest, summary: string) {
  const blocks = markdownBlocks(summary);
  const children = [
    new Paragraph({ text: forest.name, heading: HeadingLevel.TITLE, spacing: { after: 120 } }),
    new Paragraph({ text: 'Forest study guide', style: 'Subtitle', spacing: { after: 320 } }),
    ...blocks.map((block) => {
      if (block.kind === 'heading') {
        return new Paragraph({ text: block.text, heading: block.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 } });
      }
      if (block.kind === 'bullet') {
        return new Paragraph({ text: block.text, bullet: { level: 0 }, spacing: { after: 80 } });
      }
      return new Paragraph({ text: block.text, spacing: { after: 140 } });
    }),
  ];
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  download(blob, `${forest.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'forest'}-summary.docx`);
}

export function ForestExport({ forest, seeds }: { forest: Forest; seeds: Seed[] }) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [keys, setKeys] = useState({ gemini: false, cerebras: false });
  const usableSeeds = seeds.filter((seed) => !isGarbageSeed(seed) && seed.text.trim());

  useEffect(() => {
    if (open) exportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [open, summary]);

  useEffect(() => {
    if (open) void getSettings().then((settings) => setKeys({ gemini: Boolean(settings.geminiKey), cerebras: Boolean(settings.cerebrasKey) }));
  }, [open]);

  async function summarize() {
    setBusy(true);
    setError('');
    try {
      setSummary(await aiForestSummary(forest.name, usableSeeds, provider));
    } catch (reason) {
      console.error(`[${provider}] study-guide generation failed`, reason);
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={exportRef} className="w-full max-w-md border-t border-edge pt-3">
      <button className="w-full rounded-lg bg-primary px-4 py-2 text-left text-base font-semibold text-primary-ink shadow-md shadow-drop hover:bg-primary-strong" onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide summary tools' : 'Summarize & export'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 px-1">
          <p className="text-xs text-ink-muted">{usableSeeds.length} usable {usableSeeds.length === 1 ? 'node' : 'nodes'}; raw HTML nodes are skipped.</p>
          <div className="flex gap-2">
            <select className="rounded-lg border border-edge bg-surface-alt px-2 py-1.5 text-xs" value={provider} disabled={busy} onChange={(event) => setProvider(event.target.value as AiProvider)}>
              <option value="gemini" disabled={!keys.gemini}>Gemini</option>
              <option value="cerebras" disabled={!keys.cerebras}>Cerebras</option>
            </select>
            <button className="min-w-0 flex-1 rounded-lg bg-primary px-2 py-1.5 text-sm font-semibold text-primary-ink hover:bg-primary-strong disabled:opacity-60" disabled={busy || usableSeeds.length === 0 || !keys[provider]} onClick={() => void summarize()}>
              {busy ? `Asking ${provider === 'cerebras' ? 'Cerebras' : 'Gemini'}…` : summary ? 'Regenerate summary' : `Summarize with ${provider === 'cerebras' ? 'Cerebras' : 'Gemini'}`}
            </button>
          </div>
          {error && <p className="text-xs text-danger-soft" role="alert">{error}</p>}
          {summary && (
            <>
              <p className="text-xs text-ink-muted">Summary ready. Choose an export format:</p>
              <div className="grid grid-cols-2 gap-1">
                <button className="rounded-lg border border-edge px-2 py-1.5 text-xs hover:bg-primary-soft" onClick={() => exportPdf(forest, summary)}>PDF</button>
                <button className="rounded-lg border border-edge px-2 py-1.5 text-xs hover:bg-primary-soft" onClick={() => void exportDocx(forest, summary)}>DOCX</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}