-- =============================================
-- SCRIPT: Associar closers existentes ao evento Janeiro/26
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- 1. Verificar closers existentes
SELECT id, name, email, role FROM users WHERE role = 'closer';

-- 2. Verificar evento Janeiro/26
SELECT id, name, slug FROM events WHERE slug = 'intensivo-alta-performance-jan-26';

-- 3. Verificar associações existentes em user_events
SELECT
    ue.id,
    u.name as user_name,
    u.role as user_role,
    e.name as event_name
FROM user_events ue
JOIN users u ON ue.user_id = u.id
JOIN events e ON ue.event_id = e.id;

-- 4. Associar TODOS os usuários existentes ao evento Janeiro/26
-- (isso não duplicará se já existir por causa do ON CONFLICT)
INSERT INTO user_events (user_id, event_id, role)
SELECT
    u.id,
    e.id,
    u.role
FROM users u
CROSS JOIN events e
WHERE e.slug = 'intensivo-alta-performance-jan-26'
ON CONFLICT (user_id, event_id) DO NOTHING;

-- 5. Verificar resultado
SELECT
    u.name as user_name,
    u.role,
    e.name as event_name
FROM user_events ue
JOIN users u ON ue.user_id = u.id
JOIN events e ON ue.event_id = e.id
ORDER BY u.role, u.name;
