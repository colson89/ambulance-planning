-- Script om 14 ambulanciers toe te voegen

-- Peter Verhulst
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'pverhulst', 'Ambulance123', 'Peter', 'Verhulst', 'ambulancier', false, 24
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'pverhulst');

-- Jonas Vermeulen
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'jvermeulen', 'Ambulance123', 'Jonas', 'Vermeulen', 'ambulancier', false, 24
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'jvermeulen');

-- Mieke Maes
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'mmaes', 'Ambulance123', 'Mieke', 'Maes', 'ambulancier', false, 24
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'mmaes');

-- Tom Van den Berg
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'tvandenberg', 'Ambulance123', 'Tom', 'Van den Berg', 'ambulancier', false, 12
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'tvandenberg');

-- Sofia Van Damme
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'svandamme', 'Ambulance123', 'Sofia', 'Van Damme', 'ambulancier', false, 36
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'svandamme');

-- Koen Van den Heuvel
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'kvandenheuvel', 'Ambulance123', 'Koen', 'Van den Heuvel', 'ambulancier', false, 24
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'kvandenheuvel');

-- Rik Van Campenhout
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'rvancampenhout', 'Ambulance123', 'Rik', 'Van Campenhout', 'ambulancier', false, 24
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'rvancampenhout');

-- Jasper De Koning
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'jdekoning', 'Ambulance123', 'Jasper', 'De Koning', 'ambulancier', false, 12
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'jdekoning');

-- Emma Willems
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'ewillems', 'Ambulance123', 'Emma', 'Willems', 'ambulancier', false, 24
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'ewillems');

-- Bram Van Daele
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'bvdaele', 'Ambulance123', 'Bram', 'Van Daele', 'ambulancier', false, 36
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'bvdaele');

-- Sophie Martens
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'smartens', 'Ambulance123', 'Sophie', 'Martens', 'ambulancier', false, 24
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'smartens');

-- An De Bruyn
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'adebruyn', 'Ambulance123', 'An', 'De Bruyn', 'ambulancier', false, 24
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'adebruyn');

-- Marc Segers
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'msegers', 'Ambulance123', 'Marc', 'Segers', 'ambulancier', false, 12
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'msegers');

-- Niels De Vos
INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours)
SELECT 'ndevos', 'Ambulance123', 'Niels', 'De Vos', 'ambulancier', false, 36
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'ndevos');