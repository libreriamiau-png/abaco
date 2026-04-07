-- ============================================
-- ESQUEMA COMPLETO - LIBROS BOSCH
-- ============================================
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- TABLA: inventario
-- ============================================
-- Nota: Si ya existe, solo agregar columnas faltantes
CREATE TABLE IF NOT EXISTS inventario (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Identificación
  isbn VARCHAR(20),
  stock_no INTEGER UNIQUE NOT NULL,
  
  -- Bibliográficos
  autor VARCHAR(300),
  tipo VARCHAR(50) DEFAULT 'Libro',
  titulo VARCHAR(500) NOT NULL,
  lugar VARCHAR(200),
  editorial VARCHAR(200),
  fecha VARCHAR(50),
  
  -- Físicos
  encuadernacion VARCHAR(100),
  estado VARCHAR(100) DEFAULT 'Muy bien',
  tamano_cm VARCHAR(50),
  paginas INTEGER,
  sobrecubierta VARCHAR(100) DEFAULT 'Sin sobrecubierta',
  estado_sobrecubierta VARCHAR(100),
  
  -- Características especiales
  primera_edicion BOOLEAN DEFAULT false,
  dedicatoria BOOLEAN DEFAULT false,
  firma_autor BOOLEAN DEFAULT false,
  ex_libris BOOLEAN DEFAULT false,
  
  -- Clasificación
  materia VARCHAR(200),
  materia2 VARCHAR(200),
  idioma VARCHAR(50) DEFAULT 'Español',
  localiz VARCHAR(100),
  
  -- Inventario
  cantidad INTEGER DEFAULT 1,
  descripcion TEXT,
  
  -- Económicos
  precio DECIMAL(10,2),
  precio_compra DECIMAL(10,2),
  
  -- AbeBooks
  encuadernacion_abebooks VARCHAR(100),
  
  -- Catalogación
  catalogo VARCHAR(100),
  publicar_online BOOLEAN DEFAULT true,
  
  -- Procedencia
  compra_codigo VARCHAR(100),
  compra_id INTEGER REFERENCES compras(id),
  procedencia TEXT,
  
  -- Notas
  notas TEXT
);

-- Índices para inventario
CREATE INDEX IF NOT EXISTS idx_inventario_isbn ON inventario(isbn);
CREATE INDEX IF NOT EXISTS idx_inventario_stock ON inventario(stock_no);
CREATE INDEX IF NOT EXISTS idx_inventario_autor ON inventario(autor);
CREATE INDEX IF NOT EXISTS idx_inventario_titulo ON inventario(titulo);
CREATE INDEX IF NOT EXISTS idx_inventario_materia ON inventario(materia);
CREATE INDEX IF NOT EXISTS idx_inventario_compra ON inventario(compra_id);

-- ============================================
-- TABLA: clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Datos personales
  nombre VARCHAR(300) NOT NULL,
  email VARCHAR(200),
  telefono VARCHAR(50),
  
  -- Dirección
  direccion TEXT,
  cp VARCHAR(10),
  ciudad VARCHAR(100),
  provincia VARCHAR(100),
  pais VARCHAR(100) DEFAULT 'España',
  
  -- Clasificación
  tipo VARCHAR(50) DEFAULT 'Particular',
  
  -- Notas
  notas TEXT
);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_ciudad ON clientes(ciudad);

-- ============================================
-- TABLA: compras
-- ============================================
CREATE TABLE IF NOT EXISTS compras (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Identificación
  codigo VARCHAR(100) UNIQUE,
  
  -- Procedencia
  proveedor VARCHAR(300),
  tipo VARCHAR(100),
  
  -- Fechas
  fecha_compra DATE,
  fecha_recepcion DATE,
  
  -- Económico
  coste_total DECIMAL(10,2),
  gastos_envio DECIMAL(10,2),
  
  -- Cantidades
  num_libros INTEGER DEFAULT 0,
  
  -- Estado
  estado VARCHAR(50) DEFAULT 'Pendiente',
  
  -- Notas
  notas TEXT
);

-- Índices para compras
CREATE INDEX IF NOT EXISTS idx_compras_codigo ON compras(codigo);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha_compra);

-- ============================================
-- TABLA: desideratas (NUEVA)
-- ============================================
CREATE TABLE IF NOT EXISTS desideratas (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Cliente
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre VARCHAR(300),
  cliente_email VARCHAR(200),
  cliente_telefono VARCHAR(50),
  
  -- Búsqueda (lo que el cliente busca)
  autor_buscado VARCHAR(300),
  titulo_buscado VARCHAR(500),
  tema_buscado VARCHAR(200),
  keywords TEXT,
  
  -- Restricciones
  precio_max DECIMAL(10,2),
  estado_min VARCHAR(50),
  
  -- Prioridad y estado
  prioridad VARCHAR(20) DEFAULT 'Media', -- Baja, Media, Alta, Muy alta
  estado VARCHAR(50) DEFAULT 'Activa', -- Activa, Encontrada, Notificada, Cerrada
  
  -- Matching
  libro_encontrado_id INTEGER REFERENCES inventario(id) ON DELETE SET NULL,
  fecha_encontrado TIMESTAMPTZ,
  fecha_notificado TIMESTAMPTZ,
  
  -- Notificaciones
  notificar_email BOOLEAN DEFAULT true,
  notificar_whatsapp BOOLEAN DEFAULT false,
  
  -- Notas
  notas_privadas TEXT,
  notas_cliente TEXT
);

-- Índices para desideratas
CREATE INDEX IF NOT EXISTS idx_desideratas_cliente ON desideratas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_desideratas_estado ON desideratas(estado);
CREATE INDEX IF NOT EXISTS idx_desideratas_prioridad ON desideratas(prioridad);
CREATE INDEX IF NOT EXISTS idx_desideratas_autor ON desideratas(autor_buscado);
CREATE INDEX IF NOT EXISTS idx_desideratas_titulo ON desideratas(titulo_buscado);
CREATE INDEX IF NOT EXISTS idx_desideratas_libro ON desideratas(libro_encontrado_id);

-- ============================================
-- TABLA: compras_stats (vista materializada opcional)
-- ============================================
-- Si no existe, crear vista simple
CREATE OR REPLACE VIEW compras_stats AS
SELECT 
  DATE_TRUNC('month', fecha_compra) AS mes,
  COUNT(*) AS num_compras,
  SUM(coste_total) AS total_gastado,
  SUM(num_libros) AS total_libros
FROM compras
WHERE fecha_compra IS NOT NULL
GROUP BY DATE_TRUNC('month', fecha_compra)
ORDER BY mes DESC;

-- ============================================
-- TABLA: productividad_stats (vista simple)
-- ============================================
CREATE OR REPLACE VIEW productividad_stats AS
SELECT 
  DATE_TRUNC('day', created_at) AS dia,
  COUNT(*) AS libros_catalogados
FROM inventario
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY dia DESC;

-- ============================================
-- TRIGGER: Actualizar updated_at en desideratas
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_desideratas_updated_at ON desideratas;
CREATE TRIGGER trigger_desideratas_updated_at
  BEFORE UPDATE ON desideratas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at();

-- ============================================
-- FUNCIÓN: Buscar matches de desideratas
-- ============================================
CREATE OR REPLACE FUNCTION buscar_matches_desideratas()
RETURNS TABLE (
  desiderata_id BIGINT,
  libro_id BIGINT,
  score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS desiderata_id,
    i.id AS libro_id,
    (
      CASE WHEN LOWER(i.autor) ILIKE '%' || LOWER(d.autor_buscado) || '%' THEN 10 ELSE 0 END +
      CASE WHEN LOWER(i.titulo) ILIKE '%' || LOWER(d.titulo_buscado) || '%' THEN 10 ELSE 0 END +
      CASE WHEN LOWER(i.materia) ILIKE '%' || LOWER(d.tema_buscado) || '%' THEN 5 ELSE 0 END
    )::INTEGER AS score
  FROM desideratas d
  CROSS JOIN inventario i
  WHERE d.estado = 'Activa'
    AND (
      (d.autor_buscado IS NOT NULL AND LOWER(i.autor) ILIKE '%' || LOWER(d.autor_buscado) || '%')
      OR (d.titulo_buscado IS NOT NULL AND LOWER(i.titulo) ILIKE '%' || LOWER(d.titulo_buscado) || '%')
      OR (d.tema_buscado IS NOT NULL AND LOWER(i.materia) ILIKE '%' || LOWER(d.tema_buscado) || '%')
    )
    AND (d.precio_max IS NULL OR i.precio IS NULL OR i.precio <= d.precio_max)
  ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE inventario IS 'Catálogo completo de libros de la librería';
COMMENT ON TABLE clientes IS 'Base de datos de clientes';
COMMENT ON TABLE compras IS 'Registro de compras a proveedores';
COMMENT ON TABLE desideratas IS 'Libros que buscan los clientes (desideratas)';
COMMENT ON FUNCTION buscar_matches_desideratas IS 'Encuentra libros del inventario que coinciden con desideratas activas';
