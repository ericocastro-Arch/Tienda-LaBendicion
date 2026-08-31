-- Datos base de ejemplo
-- El hash del usuario admin se genera con bcrypt (password: admin123)

INSERT INTO store_settings (nombre, direccion, telefono)
VALUES ('Tienda La Bendición', 'Barrio El Centro, calle principal #12', '+503 7000-0000')
ON CONFLICT DO NOTHING;

-- Usuario administrador inicial (password: admin123)
INSERT INTO employees (rol_id, nombre, apellido, cedula, username, password_hash)
SELECT r.id, 'Administrador', 'General', '00000000-0', 'admin', '$2b$12$TaWkzEykEYAGAp4Gp3AJY.sSbeXmTEILPH4mLzEslm6pq4jjBQTMC'
FROM roles r
WHERE r.nombre = 'ADMIN'
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash, is_active = TRUE;

INSERT INTO categories (nombre, descripcion) VALUES
  ('Abarrotes', 'Productos básicos de despensa'),
  ('Bebidas', 'Refrescos, aguas y jugos'),
  ('Limpieza', 'Artículos de limpieza del hogar')
ON CONFLICT (nombre) DO NOTHING;