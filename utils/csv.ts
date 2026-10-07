import * as fs from 'fs';

// Writes rows to a CSV file; used by tests/05-resetAgentPassword.spec.ts for the self statement
export function saveCsv(filePath: string, rows: string[][]) {
  // Wrap every cell in quotes (doubling inner quotes) because values like "08/10/2026, 11:48:23" contain commas
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(filePath, csv);
}
