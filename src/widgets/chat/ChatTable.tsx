import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

// ── HTML-таблица (приходит с бэкенда) ─────────────────────────────────────────
function parseHtmlTable(html: string): ParsedTable | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;

    const headers = Array.from(
      table.querySelectorAll('thead th, thead td'),
    ).map(el => el.textContent?.trim() ?? '');

    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
      Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent?.trim() ?? ''),
    );

    if (headers.length === 0) {
      const allRows = Array.from(table.querySelectorAll('tr')).map(tr =>
        Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent?.trim() ?? ''),
      );
      if (allRows.length === 0) return null;
      return { headers: allRows[0], rows: allRows.slice(1) };
    }

    return { headers, rows };
  } catch {
    return null;
  }
}

// ── Markdown-таблица (приходит от нейросети в тексте) ─────────────────────────
function parseMarkdownTable(text: string): ParsedTable | null {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // Строка-разделитель: |---|---|---|
  const isSep = (l: string) => /^\|?[\s\-:|]+(\|[\s\-:|]+)*\|?$/.test(l);
  const sepIdx = lines.findIndex(isSep);
  if (sepIdx < 1) return null;

  const parseRow = (line: string) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(c => c.trim());

  const headers = parseRow(lines[sepIdx - 1]);
  const rows    = lines.slice(sepIdx + 1).map(parseRow).filter(r => r.length > 0 && r.some(c => c));

  if (headers.length === 0 || rows.length === 0) return null;
  return { headers, rows };
}

// ── Определяем тип ячейки для подсветки ───────────────────────────────────────
type CellType = 'positive' | 'negative' | 'neutral';

const POSITIVE_RE = /^[+✓✅✔]|вырос|выгод|экономи|ниже|меньш/i;
const NEGATIVE_RE = /^[-−✗❌✘]|убыток|риск|выше|больш|перерасход|опасно/i;
const CURRENCY_RE = /^[-−+]?\s*\d[\d\s.,]*\s*[₽$€]$|^[₽$€]\s*\d/;
const PERCENT_RE  = /^[-−+]?\s*\d+(\.\d+)?\s*%$/;

function detectType(value: string): CellType {
  if (POSITIVE_RE.test(value)) return 'positive';
  if (NEGATIVE_RE.test(value)) return 'negative';
  if (CURRENCY_RE.test(value) || PERCENT_RE.test(value)) {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) return num < 0 ? 'negative' : num > 0 ? 'positive' : 'neutral';
  }
  return 'neutral';
}

const CELL_STYLES: Record<CellType, string> = {
  positive: 'text-success font-semibold',
  negative: 'text-danger font-semibold',
  neutral:  'text-text-primary',
};

const TypeIcon = ({ type }: { type: CellType }) => {
  if (type === 'positive') return <TrendingUp size={11} className="text-success inline ml-1" />;
  if (type === 'negative') return <TrendingDown size={11} className="text-danger inline ml-1" />;
  return null;
};

// ── Рендер самой таблицы ──────────────────────────────────────────────────────
interface TableViewProps { table: ParsedTable; compact?: boolean }

export const TableView = ({ table, compact = false }: TableViewProps) => {
  const colCount = table.headers.length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-x-auto rounded-2xl border border-border-light shadow-card bg-white my-2"
    >
      <table className="w-full text-sm border-collapse" style={{ minWidth: colCount > 3 ? 400 : undefined }}>
        {table.headers.length > 0 && (
          <thead>
            <tr className="bg-gradient-to-r from-primary-light to-purple/10">
              {table.headers.map((h, i) => (
                <th key={i}
                  className={`px-3 ${compact ? 'py-1.5' : 'py-2.5'} text-left text-xs font-bold text-primary uppercase tracking-wide whitespace-nowrap border-b border-primary/15 first:rounded-tl-2xl last:rounded-tr-2xl`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}
              className={`transition-colors ${ri % 2 === 0 ? 'bg-white' : 'bg-bg-muted/50'} hover:bg-primary-light/30`}>
              {row.map((cell, ci) => {
                const type = ci > 0 ? detectType(cell) : 'neutral';
                return (
                  <td key={ci}
                    className={`px-3 ${compact ? 'py-1.5' : 'py-2'} border-b border-border-light last-row:border-b-0 ${ci === 0 ? 'font-medium text-text-secondary' : CELL_STYLES[type]}`}>
                    {cell}
                    {ci > 0 && <TypeIcon type={type} />}
                  </td>
                );
              })}
            </tr>
          ))}
          {table.rows.length === 0 && (
            <tr>
              <td colSpan={table.headers.length || 1}
                className="px-3 py-4 text-center text-xs text-text-tertiary">
                Нет данных
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </motion.div>
  );
};

// ── Публичные компоненты ──────────────────────────────────────────────────────

/** Для HTML-таблицы с бэкенда */
export const ChatTable = ({ html }: { html: string }) => {
  const table = useMemo(() => parseHtmlTable(html), [html]);
  if (!table) return null;
  return <div className="ml-10"><TableView table={table} /></div>;
};

/** Для Markdown-таблицы из текста нейросети — используется в ReactMarkdown */
export const MarkdownTable = ({ children }: { children: React.ReactNode }) => {
  // ReactMarkdown рендерит <table> с children — просто красиво оформим
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-light shadow-card bg-white my-3">
      <table className="w-full text-sm border-collapse [&_thead]:bg-gradient-to-r [&_thead]:from-primary-light [&_thead]:to-purple/10 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-bold [&_th]:text-primary [&_th]:uppercase [&_th]:tracking-wide [&_th]:border-b [&_th]:border-primary/15 [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border-light [&_tr:nth-child(even)]:bg-bg-muted/50 [&_tr:hover]:bg-primary-light/30">
        {children}
      </table>
    </div>
  );
};

export { parseMarkdownTable };
