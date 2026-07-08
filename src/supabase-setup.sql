-- ============================================================================
-- BFMF 2026 -- Schema Supabase pour les 3 apps (dashboard, logistique, balade)
-- A executer dans : Supabase > votre projet > SQL Editor > New query > Run
-- ============================================================================

-- Table cle/valeur : chaque app stocke son etat sous une cle dediee.
-- Meme logique que le stockage partage actuel -> migration sans douleur.
-- (Amelioration possible plus tard : une table par entite -- missions,
--  groupes, alertes -- pour eviter les ecrasements croises si deux
--  personnes modifient exactement au meme moment.)

create table if not exists app_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Active la securite par ligne (obligatoire avant d'exposer la table)
alter table app_store enable row level security;

-- Politique : le role "anon" (la cle publique utilisee par les apps)
-- peut lire et ecrire UNIQUEMENT les cles du festival (prefixe bfmf2026-).
-- Toute autre cle ou table reste inaccessible.

create policy "bfmf lecture"
  on app_store for select
  to anon
  using (key like 'bfmf2026-%');

create policy "bfmf insertion"
  on app_store for insert
  to anon
  with check (key like 'bfmf2026-%');

create policy "bfmf mise a jour"
  on app_store for update
  to anon
  using (key like 'bfmf2026-%')
  with check (key like 'bfmf2026-%');

-- Pas de politique DELETE : personne ne peut supprimer via les apps.
-- (Suppression possible uniquement depuis le dashboard Supabase.)

-- Index sur la date de maj (utile pour audit / debug)
create index if not exists app_store_updated_idx on app_store (updated_at desc);

-- ============================================================================
-- APRES EXECUTION :
-- 1. Allez dans Settings > API
-- 2. Copiez "Project URL"  (ex: https://abcdefgh.supabase.co)
-- 3. Copiez la cle "anon / public"
-- 4. Collez ces deux valeurs en haut de chacun des 3 fichiers .jsx
--    (constantes SUPABASE_URL et SUPABASE_ANON_KEY)
--
-- SECURITE :
-- - La cle anon est faite pour etre visible dans le code navigateur.
-- - La protection vient des politiques RLS ci-dessus : acces limite aux
--   cles bfmf2026-% de cette seule table, pas de suppression possible.
-- - Le niveau de securite equivaut a un "lien secret" : ne diffusez les
--   apps qu'a l'equipe. Pour de vrais comptes avec droits differencies,
--   il faudra ajouter Supabase Auth (etape ulterieure possible).
-- ============================================================================
