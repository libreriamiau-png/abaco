-- ============================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema.sql

-- IMPORTANTE: Estas políticas asumen que tienes 1 usuario administrador
-- Si necesitas autenticación más compleja, ajusta según tu caso

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE desideratas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- OPCIÓN A: SOLO PARA TI (UN USUARIO)
-- ============================================
-- Usa esto si eres el único que usa el sistema
-- Permite todo para usuarios autenticados

-- INVENTARIO
DROP POLICY IF EXISTS "Permitir todo en inventario" ON inventario;
CREATE POLICY "Permitir todo en inventario"
  ON inventario
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- CLIENTES
DROP POLICY IF EXISTS "Permitir todo en clientes" ON clientes;
CREATE POLICY "Permitir todo en clientes"
  ON clientes
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- COMPRAS
DROP POLICY IF EXISTS "Permitir todo en compras" ON compras;
CREATE POLICY "Permitir todo en compras"
  ON compras
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- DESIDERATAS
DROP POLICY IF EXISTS "Permitir todo en desideratas" ON desideratas;
CREATE POLICY "Permitir todo en desideratas"
  ON desideratas
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- OPCIÓN B: ACCESO PÚBLICO PARA CATÁLOGO
-- ============================================
-- Descomenta esto si quieres que el catálogo sea público
-- (para web pública, solo lectura en inventario)

/*
-- Lectura pública del inventario (solo publicados)
DROP POLICY IF EXISTS "Lectura pública inventario" ON inventario;
CREATE POLICY "Lectura pública inventario"
  ON inventario
  FOR SELECT
  USING (publicar_online = true);

-- Modificación solo para autenticados
DROP POLICY IF EXISTS "Escritura autenticada inventario" ON inventario;
CREATE POLICY "Escritura autenticada inventario"
  ON inventario
  FOR ALL
  USING (auth.uid() IS NOT NULL);
*/

-- ============================================
-- OPCIÓN C: MULTI-USUARIO CON ROLES
-- ============================================
-- Descomenta esto si tienes varios usuarios con diferentes permisos
-- Requiere tabla 'usuarios' con campo 'rol'

/*
-- Crear tabla de usuarios si no existe
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255),
  rol VARCHAR(50) DEFAULT 'empleado', -- admin, empleado, lectura
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política: ver tu propio usuario
DROP POLICY IF EXISTS "Ver propio usuario" ON usuarios;
CREATE POLICY "Ver propio usuario"
  ON usuarios
  FOR SELECT
  USING (auth.uid() = id);

-- Función helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS VARCHAR AS $$
  SELECT rol FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- INVENTARIO con roles
DROP POLICY IF EXISTS "Admin full access inventario" ON inventario;
CREATE POLICY "Admin full access inventario"
  ON inventario
  FOR ALL
  USING (get_user_rol() = 'admin');

DROP POLICY IF EXISTS "Empleado puede ver y editar inventario" ON inventario;
CREATE POLICY "Empleado puede ver y editar inventario"
  ON inventario
  FOR ALL
  USING (get_user_rol() IN ('admin', 'empleado'));

DROP POLICY IF EXISTS "Lectura puede ver inventario" ON inventario;
CREATE POLICY "Lectura puede ver inventario"
  ON inventario
  FOR SELECT
  USING (get_user_rol() IN ('admin', 'empleado', 'lectura'));

-- CLIENTES con roles
DROP POLICY IF EXISTS "Admin full access clientes" ON clientes;
CREATE POLICY "Admin full access clientes"
  ON clientes
  FOR ALL
  USING (get_user_rol() = 'admin');

DROP POLICY IF EXISTS "Empleado puede ver y editar clientes" ON clientes;
CREATE POLICY "Empleado puede ver y editar clientes"
  ON clientes
  FOR ALL
  USING (get_user_rol() IN ('admin', 'empleado'));

-- COMPRAS con roles
DROP POLICY IF EXISTS "Admin full access compras" ON compras;
CREATE POLICY "Admin full access compras"
  ON compras
  FOR ALL
  USING (get_user_rol() = 'admin');

DROP POLICY IF EXISTS "Empleado puede ver compras" ON compras;
CREATE POLICY "Empleado puede ver compras"
  ON compras
  FOR SELECT
  USING (get_user_rol() IN ('admin', 'empleado'));

-- DESIDERATAS con roles
DROP POLICY IF EXISTS "Admin full access desideratas" ON desideratas;
CREATE POLICY "Admin full access desideratas"
  ON desideratas
  FOR ALL
  USING (get_user_rol() = 'admin');

DROP POLICY IF EXISTS "Empleado puede ver y editar desideratas" ON desideratas;
CREATE POLICY "Empleado puede ver y editar desideratas"
  ON desideratas
  FOR ALL
  USING (get_user_rol() IN ('admin', 'empleado'));
*/

-- ============================================
-- PERMISOS PARA FUNCIONES
-- ============================================
-- Permitir ejecutar la función de matching
GRANT EXECUTE ON FUNCTION buscar_matches_desideratas TO authenticated;
GRANT EXECUTE ON FUNCTION actualizar_updated_at TO authenticated;

-- ============================================
-- VERIFICAR POLÍTICAS ACTIVAS
-- ============================================
-- Ejecuta esto para ver qué políticas están activas:
-- SELECT schemaname, tablename, policyname, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
/*
1. OPCIÓN A (actual): Uso personal, un solo usuario
   - Simple y seguro
   - Solo usuarios autenticados pueden hacer cambios
   - Recomendado para empezar

2. OPCIÓN B: Catálogo público
   - Permite que visitantes vean el catálogo sin login
   - Solo tú puedes modificar
   - Útil si tienes web pública

3. OPCIÓN C: Multi-usuario
   - Diferentes niveles de acceso
   - Requiere gestión de usuarios
   - Para equipos grandes

RECOMENDACIÓN: Empieza con OPCIÓN A (ya activa arriba)
Si necesitas más adelante, cambia a B o C.

Para cambiar entre opciones:
1. Comenta las políticas actuales
2. Descomenta las que necesites
3. Ejecuta el SQL
*/
