import { sqlite } from '../src/server/sqlite';

console.log('====================================================');
console.log('RESETTING CLOUDMEND TRANSIENT DATABASE TABLES');
console.log('====================================================');

sqlite.resetDatabase();
console.log('Transient tables cleared (telemetry, security_events, findings, snapshots, verification_results).');
console.log('Synthetic resources, records, and runs preserved.');
console.log('====================================================');
process.exit(0);
