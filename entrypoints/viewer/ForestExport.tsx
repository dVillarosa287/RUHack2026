import { useEffect, useRef, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph } from 'docx';
import { jsPDF } from 'jspdf';
import { geminiForestSummary } from '@/lib/ai';
import type { Forest, Seed } from '@/lib/storage';

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

function markdownLines(summary: string): string[] {
  return summary.split(/\r?\n/).map((line) => line.replace(/^\s*[-*]\s+/, '• ').replace(/^#+\s*/, '')).filter(Boolean);
}

function exportPdf(forest: Forest, summary: string) {
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(`${forest.name}\n\n${summary}`, 175) as string[];
  let y = 18;
  for (const line of lines) {
    if (y > 280) {
      pdf.addPage();
      y = 18;
    }
    pdf.text(line, 18, y);
    y += 7;
  }
  pdf.save(`${forest.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'forest'}-summary.pdf`);
}

async function exportDocx(forest: Forest, summary: string) {
  const children = [
    new Paragraph({ text: forest.name, heading: HeadingLevel.TITLE }),
    ...markdownLines(summary).map((line) => new Paragraph({ text: line.startsWith('• ') ? line.slice(2) : line })),
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
  const usableSeeds = seeds.filter((seed) => !isGarbageSeed(seed) && seed.text.trim());

  useEffect(() => {
    if (open) exportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [open, summary]);

  async function summarize() {
    setBusy(true);
    setError('');
    try {
      setSummary(await geminiForestSummary(forest.name, usableSeeds));
    } catch (reason) {
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
          <button className="w-full rounded-lg bg-primary px-2 py-1.5 text-sm font-semibold text-primary-ink hover:bg-primary-strong disabled:opacity-60" disabled={busy || usableSeeds.length === 0} onClick={() => void summarize()}>
            {busy ? 'Asking Gemini…' : summary ? 'Regenerate summary' : 'Summarize with Gemini'}
          </button>
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