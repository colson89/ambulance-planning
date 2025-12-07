const fs = require('fs');

const inputFile = process.argv[2] || 'attached_assets/backup11225-2_1765126966889';
const outputFile = process.argv[3] || 'scripts/import-data-v2.sql';

const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

let inCopyBlock = false;
let currentTable = null;
let currentColumns = null;
let skipTables = ['activity_logs', 'password_reset_tokens', 'push_subscriptions', 'reportage_logs', 'undo_history', 'verdi_sync_log'];

function escapeValue(val, colName) {
  if (val === '\\N') return 'NULL';
  val = val.replace(/'/g, "''");
  if (val === 't') return 'true';
  if (val === 'f') return 'false';
  return `'${val}'`;
}

let output = [];
output.push('-- Generated import script from Windows Server backup');
output.push('-- Generated at: ' + new Date().toISOString());
output.push('-- Version 2: Without session_replication_role, with proper ordering');
output.push('');

let tableData = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.startsWith('COPY public.')) {
    const match = line.match(/COPY public\.(\w+) \(([^)]+)\) FROM stdin;/);
    if (match) {
      currentTable = match[1];
      currentColumns = match[2].split(', ');
      inCopyBlock = true;
      if (!tableData[currentTable]) {
        tableData[currentTable] = { columns: currentColumns, rows: [] };
      }
    }
  } else if (inCopyBlock) {
    if (line === '\\.') {
      inCopyBlock = false;
      currentTable = null;
      currentColumns = null;
    } else if (line.trim() !== '') {
      const values = line.split('\t');
      if (currentTable && tableData[currentTable] && values.length === tableData[currentTable].columns.length) {
        tableData[currentTable].rows.push(values);
      }
    }
  }
}

const tableOrder = [
  'stations',
  'users',
  'user_stations',
  'user_comments',
  'holidays',
  'weekday_configs',
  'system_settings',
  'reportage_config',
  'reportage_recipients',
  'calendar_tokens',
  'station_settings',
  'shift_preferences',
  'shifts',
  'shift_bids',
  'shift_swap_requests',
  'verdi_station_config',
  'verdi_user_mappings',
  'verdi_position_mappings',
  'verdi_shift_registry',
  'overtime'
];

output.push('BEGIN;');
output.push('');

output.push('-- Step 1: Delete child tables first (reverse dependency order)');
const deleteOrder = [
  'overtime',
  'verdi_shift_registry',
  'verdi_position_mappings',
  'verdi_user_mappings',
  'verdi_station_config',
  'shift_swap_requests',
  'shift_bids',
  'shifts',
  'shift_preferences',
  'station_settings',
  'calendar_tokens',
  'reportage_recipients',
  'reportage_config',
  'system_settings',
  'weekday_configs',
  'holidays',
  'user_comments',
  'user_stations',
  'users',
  'stations'
];

for (const table of deleteOrder) {
  if (!skipTables.includes(table) && tableData[table]) {
    output.push(`DELETE FROM ${table};`);
  }
}
output.push('');

output.push('-- Step 2: Insert data in dependency order');
for (const table of tableOrder) {
  if (skipTables.includes(table)) {
    output.push(`-- Skipping ${table} (transient data)`);
    continue;
  }
  
  const data = tableData[table];
  if (!data || data.rows.length === 0) {
    output.push(`-- No data for ${table}`);
    continue;
  }
  
  output.push(`-- ${table}: ${data.rows.length} rows`);
  
  for (const row of data.rows) {
    const values = row.map((v, idx) => escapeValue(v, data.columns[idx]));
    output.push(`INSERT INTO ${table} (${data.columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`);
  }
  output.push('');
}

output.push('-- Step 3: Reset sequences');
for (const table of tableOrder) {
  if (skipTables.includes(table)) continue;
  const data = tableData[table];
  if (data && data.rows.length > 0 && data.columns[0] === 'id') {
    output.push(`SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 1), true);`);
  }
}
output.push('');

output.push('COMMIT;');
output.push('');
output.push('-- Done!');

fs.writeFileSync(outputFile, output.join('\n'));
console.log(`Generated ${outputFile} with ${output.length} lines`);
console.log('Tables found:', Object.keys(tableData).join(', '));
for (const [table, data] of Object.entries(tableData)) {
  if (!skipTables.includes(table)) {
    console.log(`  ${table}: ${data.rows.length} rows`);
  }
}
