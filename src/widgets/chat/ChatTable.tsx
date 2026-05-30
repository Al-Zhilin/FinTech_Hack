import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

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

    // Если thead нет — первая строка становится заголовком
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

interface Props {
  html: string;
}

export const ChatTable = ({ html }: Props) => {
  const table = useMemo(() => parseHtmlTable(html), [html]);

  if (!table) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="ml-10 mt-1 overflow-x-auto rounded-xl border border-border-light shadow-card bg-white"
    >
      <table className="w-full text-sm border-collapse">
        {table.headers.length > 0 && (
          <thead>
            <tr className="bg-bg-muted">
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap border-b border-border-light"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, ri) => (
            <tr
              key={ri}
              className={ri % 2 === 0 ? 'bg-white' : 'bg-bg-muted/40'}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-text-primary border-b border-border-light last:border-b-0 whitespace-nowrap"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {table.rows.length === 0 && (
            <tr>
              <td
                colSpan={table.headers.length || 1}
                className="px-3 py-4 text-center text-xs text-text-tertiary"
              >
                Нет данных
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </motion.div>
  );
};
