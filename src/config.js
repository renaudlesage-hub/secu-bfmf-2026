// ============================================================
// CONFIGURATION SUPABASE — UNIQUE POINT A REMPLIR
// Supabase > votre projet > Settings > API
// (executer d'abord supabase-setup.sql dans SQL Editor)
// ============================================================
export const SUPABASE_URL = "https://iisovgzwewwxwrwqtkhy.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpc292Z3p3ZXd3eHdyd3F0a2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjM0OTcsImV4cCI6MjA5ODkzOTQ5N30.e9StbvQShcT3L9P4f5wXY_po7jjC2doFXCKMuB-XQJ8";

// Carte operationnelle My Maps "Buco 2026" (partage : lien -> consulter)
export const MYMAPS_MID = "1SPS5bUb4JRuvcGlIvpen8Jk-tU2c2Eg";

export function myMapsUrl(lat, lon) {
  return `https://www.google.com/maps/d/viewer?mid=${MYMAPS_MID}&ll=${lat},${lon}&z=17`;
}