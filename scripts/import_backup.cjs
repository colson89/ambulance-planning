#!/usr/bin/env node
/**
 * Import PostgreSQL backup data into Neon database.
 * Parses COPY statements from pg_dump and converts to INSERT statements.
 */

const fs = require('fs');
const path = require('path');

function parseBackup(backupPath) {
  const tablesData = {};
  let currentTable = null;
  let currentColumns = null;
  let currentRows = [];
  let inCopyBlock = false;

  const content = fs.readFileSync(backupPath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const copyMatch = line.match(/^COPY public\.(\w+) \((.+?)\) FROM stdin;/);
    if (copyMatch) {
      currentTable = copyMatch[1];
      currentColumns = copyMatch[2].split(',').map(col => col.trim());
      currentRows = [];
      inCopyBlock = true;
      continue;
    }

    if (inCopyBlock && line.trim() === '\\.') {
      if (currentTable && currentRows.length > 0) {
        tablesData[currentTable] = {
          columns: currentColumns,
          rows: currentRows
        };
      }
      inCopyBlock = false;
      currentTable = null;
      currentColumns = null;
      currentRows = [];
      continue;
    }

    if (inCopyBlock && currentTable) {
      const row = line.split('\t');
      if (row.length > 0 && row[0] !== '') {
        currentRows.push(row);
      }
    }
  }

  return tablesData;
}

function escapeValue(val) {
  if (val === '\\N') return 'NULL';
  if (val === 't') return 'TRUE';
  if (val === 'f') return 'FALSE';
  
  let escaped = val.replace(/'/g, "''");
  escaped = escaped.replace(/\\n/g, '\n');
  escaped = escaped.replace(/\\r/g, '\r');
  escaped = escaped.replace(/\\t/g, '\t');
  
  return `'${escaped}'`;
}

function generateTruncateSql(tables) {
  const orderedTables = [
    'verdi_sync_log',
    'verdi_user_mappings',
    'verdi_shift_registry',
    'verdi_position_mappings',
    'verdi_station_config',
    'undo_history',
    'user_comments',
    'user_station_notification_preferences',
    'user_stations',
    'shift_swap_offers',
    'shift_swap_requests',
    'shift_bids',
    'shift_preferences',
    'overtime',
    'shifts',
    'push_subscriptions',
    'planning_periods',
    'password_reset_tokens',
    'calendar_tokens',
    'custom_notification_recipients',
    'custom_notifications',
    'activity_logs',
    'reportage_logs',
    'reportage_recipients',
    'reportage_config',
    'weekday_configs',
    'welcome_email_config',
    'station_settings',
    'holidays',
    'system_settings',
    'users',
    'stations',
  ];

  const sqlParts = [];
  for (const table of orderedTables) {
    if (tables[table]) {
      sqlParts.push(`TRUNCATE TABLE ${table} CASCADE;`);
    }
  }

  for (const table of Object.keys(tables)) {
    if (!orderedTables.includes(table)) {
      sqlParts.unshift(`TRUNCATE TABLE ${table} CASCADE;`);
    }
  }

  return sqlParts.join('\n');
}

function generateInsertSql(table, columns, rows, batchSize = 50) {
  if (!rows || rows.length === 0) return '';

  const sqlParts = [];
  const colList = columns.join(', ');

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuesList = batch.map(row => {
      const values = row.map(val => escapeValue(val)).join(', ');
      return `(${values})`;
    });

    sqlParts.push(`INSERT INTO ${table} (${colList}) VALUES\n${valuesList.join(',\n')};`);
  }

  return sqlParts.join('\n');
}

function main() {
  const backupPath = 'attached_assets/backup281225_1766942582352';
  const outputPath = '/tmp/import_data.sql';

  console.log(`Parsing backup: ${backupPath}`);
  const tablesData = parseBackup(backupPath);

  console.log(`Found ${Object.keys(tablesData).length} tables with data:`);
  for (const [table, data] of Object.entries(tablesData)) {
    console.log(`  ${table}: ${data.rows.length} rows`);
  }

  const insertOrder = [
    'stations',
    'users',
    'system_settings',
    'holidays',
    'station_settings',
    'weekday_configs',
    'welcome_email_config',
    'reportage_config',
    'reportage_recipients',
    'reportage_logs',
    'calendar_tokens',
    'custom_notifications',
    'custom_notification_recipients',
    'password_reset_tokens',
    'planning_periods',
    'push_subscriptions',
    'shifts',
    'overtime',
    'shift_preferences',
    'shift_bids',
    'shift_swap_requests',
    'shift_swap_offers',
    'user_stations',
    'user_station_notification_preferences',
    'user_comments',
    'undo_history',
    'verdi_station_config',
    'verdi_position_mappings',
    'verdi_shift_registry',
    'verdi_user_mappings',
    'verdi_sync_log',
    'activity_logs',
  ];

  for (const table of Object.keys(tablesData)) {
    if (!insertOrder.includes(table)) {
      insertOrder.push(table);
    }
  }

  let output = "-- Auto-generated import script\n";
  output += "SET session_replication_role = 'replica';\n\n";
  output += "-- Truncate all tables\n";
  output += generateTruncateSql(tablesData) + "\n\n";

  console.log("\nGenerating INSERT statements...");
  for (const table of insertOrder) {
    if (tablesData[table]) {
      const data = tablesData[table];
      console.log(`  ${table}: ${data.rows.length} rows`);
      output += `-- Table: ${table}\n`;
      output += generateInsertSql(table, data.columns, data.rows) + "\n\n";
    }
  }

  output += "-- Reset sequences\n";
  for (const table of Object.keys(tablesData)) {
    output += `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true);\n`;
  }

  output += "\nSET session_replication_role = 'origin';\n";

  fs.writeFileSync(outputPath, output, 'utf-8');
  const stats = fs.statSync(outputPath);
  console.log(`\nGenerated: ${outputPath}`);
  console.log(`File size: ${stats.size} bytes`);
}

main();
