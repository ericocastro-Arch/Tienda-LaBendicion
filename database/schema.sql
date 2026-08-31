-- ============================================================
-- Sistema de Gestión Interno y Punto de Venta (POS)
-- Tienda de Barrio "La Bendición"
-- Base de datos: PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums (alineados con Prisma schema.prisma)
DO $$ BEGIN
  CREATE TYPE "MovementType" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- Configuración de la tienda (registro único)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL DEFAULT 'La Bendición',
  direccion     VARCHAR(255) NOT NULL DEFAULT '',
  telefono      VARCHAR(30)  NOT NULL DEFAULT '',
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Roles (RBAC): Administrador / Cajero
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(50)  NOT NULL UNIQUE,
  descripcion VARCHAR(150) NOT NULL DEFAULT ''
);

-- ------------------------------------------------------------
-- Empleados / Usuarios del sistema (Soft Delete: is_active)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  rol_id        INTEGER NOT NULL REFERENCES roles(id),
  nombre        VARCHAR(80)  NOT NULL,
  apellido      VARCHAR(80)  NOT NULL,
  cedula        VARCHAR(20)  UNIQUE,
  telefono      VARCHAR(30),
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Categorías de productos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(80)  NOT NULL UNIQUE,
  descripcion VARCHAR(150) NOT NULL DEFAULT ''
);

-- ------------------------------------------------------------
-- Productos
-- estándares: EAN-13, UPC-A, Code-128 (escáner Keyboard Wedge)
-- margen = precio_venta - precio_costo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  categoria_id   INTEGER REFERENCES categories(id),
  codigo_barras  VARCHAR(48) UNIQUE,
  nombre         VARCHAR(120) NOT NULL,
  descripcion    TEXT,
  precio_costo   NUMERIC(12,2) NOT NULL CHECK (precio_costo >= 0),
  precio_venta   NUMERIC(12,2) NOT NULL CHECK (precio_venta >= 0),
  stock_minimo   INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  stock_actual   INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_products_nombre ON products(nombre);

-- ------------------------------------------------------------
-- Movimientos de inventario (entradas, salidas, ajustes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  tipo        "MovementType" NOT NULL,
  cantidad    INTEGER NOT NULL CHECK (cantidad <> 0),
  motivo      VARCHAR(255) NOT NULL DEFAULT '',
  user_id     INTEGER REFERENCES employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id, created_at);

-- ------------------------------------------------------------
-- Ventas (cabecera)
-- formas de pago: EFECTIVO, TARJETA, TRANSFERENCIA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES employees(id),
  subtotal       NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
  total          NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  metodo_pago    "PaymentMethod" NOT NULL DEFAULT 'EFECTIVO',
  monto_recibido NUMERIC(12,2) NOT NULL DEFAULT 0,
  cambio         NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Detalle de ventas (productos vendidos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_items (
  id                 SERIAL PRIMARY KEY,
  sale_id            INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id         INTEGER NOT NULL REFERENCES products(id),
  cantidad           INTEGER NOT NULL CHECK (cantidad > 0),
  precio_venta_unit  NUMERIC(12,2) NOT NULL,
  subtotal           NUMERIC(12,2) NOT NULL,
  margen_unitario    NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- ------------------------------------------------------------
-- Comprobantes de venta (número correlativo por tienda)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receipts (
  id         SERIAL PRIMARY KEY,
  sale_id    INTEGER NOT NULL UNIQUE REFERENCES sales(id),
  numero     VARCHAR(24) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Datos base: roles
-- ------------------------------------------------------------
INSERT INTO roles (nombre, descripcion) VALUES
  ('ADMIN', 'Administración general, control financiero y proveedores'),
  ('CAJERO', 'Atención al cliente, registro de ventas y comprobantes')
ON CONFLICT (nombre) DO NOTHING;