// =========================================================
// ТЕТ-А-ТЕТ — общая конфигурация клиента.
// Anon key и URL Supabase публичны по дизайну (защищает RLS).
// Если STORE_MODE = 'local' — все методы store работают на localStorage.
// Если 'supabase' — подключается lib-store-supabase.js (см. supabase-migration.sql).
// =========================================================

window.TAT_CONFIG = {
    // 'local' (мгновенно работает) | 'supabase' (требует миграции)
    STORE_MODE: 'supabase',

    // Подложите свои значения (или оставьте от olymp-co — это публичные ключи).
    SUPABASE_URL: 'https://dnjeulpuyujyttmcenhq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuamV1bHB1eXVqeXR0bWNlbmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDUxODYsImV4cCI6MjA5MzU4MTE4Nn0.E6_NR_1j89h2G61SkQ3-QQRGfxv8kVGaA5dJZinO0bA',
};
