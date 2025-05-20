-- Añadir columnas faltantes a la tabla users sin restricción NOT NULL inicialmente
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS position TEXT;

-- Actualizar registros existentes con valores predeterminados
UPDATE users 
SET username = 'user_' || id,
    password = 'clerk-managed',
    name = COALESCE(email, 'Usuario ' || id)
WHERE username IS NULL;

-- Ahora que todos los registros tienen valores, añadir restricciones NOT NULL
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN password SET NOT NULL;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

-- Crear índice y añadir restricción UNIQUE (si no existe ya)
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username);