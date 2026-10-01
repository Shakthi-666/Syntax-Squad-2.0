import { sqlite } from '../src/server/sqlite';

console.log('====================================================');
console.log('CLOUDMEND SQLITE DATABASE INSPECTION');
console.log('====================================================');

const status = sqlite.getStatus();
console.log(`Database Path: ${status.dbPath}`);
console.log(`Connected:     ${status.connected ? 'YES' : 'NO'}`);
console.log(`Size (bytes):   ${status.sizeBytes}`);
console.log('----------------------------------------------------');
console.log('TABLE ROW COUNTS & ACTIVITY:');
console.log('----------------------------------------------------');

for (const t of status.tables) {
  const pad = t.name.padEnd(24, ' ');
  const rows = String(t.rowCount).padStart(6, ' ');
  const updated = t.lastUpdated ? `(last: ${t.lastUpdated})` : '';
  console.log(`- ${pad}: ${rows} rows ${updated}`);
}

console.log('====================================================');
process.exit(0);
