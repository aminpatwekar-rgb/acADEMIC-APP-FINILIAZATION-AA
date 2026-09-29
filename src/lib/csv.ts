/**
 * CSV parsing and export utilities for Onyx LMS
 */

export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  headers?: { key: keyof T; label: string }[]
) {
  if (!rows || rows.length === 0) return;

  const actualHeaders = headers || Object.keys(rows[0]).map(k => ({ key: k as keyof T, label: k }));
  const headerLine = actualHeaders.map(h => `"${String(h.label).replace(/"/g, '""')}"`).join(',');

  const lines = rows.map(row => {
    return actualHeaders.map(h => {
      const val = row[h.key];
      if (val === undefined || val === null) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headerLine, ...lines].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split(/\r\n|\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(val => val.trim().replace(/^"|"$/g, ''));
    if (row.length === headers.length) {
      const entry: Record<string, string> = {};
      headers.forEach((h, idx) => {
        entry[h] = row[idx];
      });
      results.push(entry);
    }
  }

  return results;
}
