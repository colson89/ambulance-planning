#!/usr/bin/env python3
"""
Import PostgreSQL backup data into Neon database.
Parses COPY statements from pg_dump and converts to INSERT statements.
"""

import os
import re
import sys

def parse_backup(backup_path):
    """Parse pg_dump backup file and extract table data."""
    tables_data = {}
    current_table = None
    current_columns = None
    current_rows = []
    in_copy_block = False
    
    with open(backup_path, 'r', encoding='utf-8') as f:
        for line in f:
            # Detect COPY statement start
            copy_match = re.match(r'^COPY public\.(\w+) \((.+?)\) FROM stdin;', line)
            if copy_match:
                current_table = copy_match.group(1)
                current_columns = [col.strip() for col in copy_match.group(2).split(',')]
                current_rows = []
                in_copy_block = True
                continue
            
            # Detect end of COPY block
            if in_copy_block and line.strip() == '\\.':
                if current_table and current_rows:
                    tables_data[current_table] = {
                        'columns': current_columns,
                        'rows': current_rows
                    }
                in_copy_block = False
                current_table = None
                current_columns = None
                current_rows = []
                continue
            
            # Collect data rows
            if in_copy_block and current_table:
                # Parse tab-separated values
                row = line.rstrip('\n').split('\t')
                current_rows.append(row)
    
    return tables_data

def escape_value(val):
    """Escape value for SQL INSERT."""
    if val == '\\N':
        return 'NULL'
    if val == 't':
        return 'TRUE'
    if val == 'f':
        return 'FALSE'
    # Escape single quotes
    escaped = val.replace("'", "''")
    # Handle backslash escapes from pg_dump
    escaped = escaped.replace('\\n', '\n')
    escaped = escaped.replace('\\r', '\r')
    escaped = escaped.replace('\\t', '\t')
    return f"'{escaped}'"

def generate_truncate_sql(tables):
    """Generate TRUNCATE statements in correct order (reverse dependency order)."""
    # Order tables to handle foreign key dependencies
    # Tables with foreign keys should be truncated first
    ordered_tables = [
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
    ]
    
    sql_parts = []
    for table in ordered_tables:
        if table in tables:
            sql_parts.append(f'TRUNCATE TABLE {table} CASCADE;')
    
    # Add any remaining tables not in our ordered list
    for table in tables:
        if table not in ordered_tables:
            sql_parts.insert(0, f'TRUNCATE TABLE {table} CASCADE;')
    
    return '\n'.join(sql_parts)

def generate_insert_sql(table, columns, rows, batch_size=100):
    """Generate INSERT statements for a table."""
    if not rows:
        return ''
    
    sql_parts = []
    col_list = ', '.join(columns)
    
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        values_list = []
        for row in batch:
            values = ', '.join(escape_value(val) for val in row)
            values_list.append(f'({values})')
        
        sql_parts.append(f"INSERT INTO {table} ({col_list}) VALUES\n" + ',\n'.join(values_list) + ';')
    
    return '\n'.join(sql_parts)

def main():
    backup_path = 'attached_assets/backup281225_1766942582352'
    output_path = '/tmp/import_data.sql'
    
    print(f"Parsing backup: {backup_path}")
    tables_data = parse_backup(backup_path)
    
    print(f"Found {len(tables_data)} tables with data:")
    for table, data in tables_data.items():
        print(f"  {table}: {len(data['rows'])} rows")
    
    # Generate SQL
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("-- Auto-generated import script\n")
        f.write("SET session_replication_role = 'replica';\n\n")  # Disable FK checks
        
        # Truncate all tables
        print("\nGenerating TRUNCATE statements...")
        f.write("-- Truncate all tables\n")
        f.write(generate_truncate_sql(tables_data) + "\n\n")
        
        # Insert order (respecting foreign keys)
        insert_order = [
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
        ]
        
        # Add any remaining tables
        for table in tables_data:
            if table not in insert_order:
                insert_order.append(table)
        
        # Generate INSERT statements
        print("Generating INSERT statements...")
        for table in insert_order:
            if table in tables_data:
                data = tables_data[table]
                print(f"  {table}: {len(data['rows'])} rows")
                f.write(f"-- Table: {table}\n")
                f.write(generate_insert_sql(table, data['columns'], data['rows']) + "\n\n")
        
        # Reset sequences
        f.write("-- Reset sequences\n")
        for table in tables_data:
            f.write(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1), true);\n")
        
        f.write("\nSET session_replication_role = 'origin';\n")  # Re-enable FK checks
    
    print(f"\nGenerated: {output_path}")
    print(f"File size: {os.path.getsize(output_path)} bytes")

if __name__ == '__main__':
    main()
