-- Script voor Windows Server PostgreSQL database setup
-- Eerst controleren of stations bestaan
INSERT INTO stations (name, code, display_name, created_at, updated_at) 
VALUES 
('westerlo', 'westerlo', 'ZW Westerlo', NOW(), NOW()),
('mol', 'mol', 'PIT Mol', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Beheerdersaccounts toevoegen
-- Wachtwoord voor alle accounts: "admin123"
-- Hash: 24a7fe71cc9c1d4301e52ad7bee1da88.ff96dfad3fdf7d8161f9aa2e9618459f

INSERT INTO users (username, password, first_name, last_name, role, is_admin, hours, station_id) 
VALUES 
('admin_westerlo', '24a7fe71cc9c1d4301e52ad7bee1da88.ff96dfad3fdf7d8161f9aa2e9618459f', 'Admin', 'Westerlo', 'admin', true, 40, 1),
('admin_mol', '24a7fe71cc9c1d4301e52ad7bee1da88.ff96dfad3fdf7d8161f9aa2e9618459f', 'Admin', 'Mol', 'admin', true, 40, 2),
('jan_westerlo', '24a7fe71cc9c1d4301e52ad7bee1da88.ff96dfad3fdf7d8161f9aa2e9618459f', 'Jan', 'Janssen', 'ambulancier', false, 36, 1),
('piet_mol', '24a7fe71cc9c1d4301e52ad7bee1da88.ff96dfad3fdf7d8161f9aa2e9618459f', 'Piet', 'Peters', 'ambulancier', false, 24, 2)
ON CONFLICT (username) DO NOTHING;

-- Controleer resultaat
SELECT u.username, u.first_name, u.last_name, u.role, u.is_admin, s.display_name as station
FROM users u 
JOIN stations s ON u.station_id = s.id 
ORDER BY s.id, u.role DESC, u.username;