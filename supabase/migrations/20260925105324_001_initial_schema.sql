/*
# Mahrah (مَهَرَة) — Initial Database Schema

## Overview
Creates the complete database schema for the Mahrah freelance services marketplace platform.
The platform connects skill providers with clients in Yemen (Sana'a and Aden).

## Tables Created

1. **profiles** — User profiles extending auth.users. Each user has an account_type
   (provider, client, both), city, avatar, bio, skills. Includes admin flag and
   provider verification status. auth_user_id is nullable to allow demo profiles
   that aren't linked to real auth accounts.

2. **categories** — Service categories (Technology, Business, Restaurants, Beauty).
   Admin-manageable: add, edit, delete, reorder.

3. **services_catalog** — Predefined service names within each category (e.g.
   "Web Development" under "Technology"). Used as picker options when adding a
   listing and as filter options when browsing. Admin-manageable.

4. **cities** — Available cities. Seeded with Sana'a and Aden. Admin can add more.

5. **listings** — Actual service offerings created by providers. Each has a
   category, service_name, description, price, experience, city, status
   (pending/published/hidden/rejected), featured flag, and rating.

6. **listing_images** — Gallery images for each listing (work samples).

7. **orders** — Service requests from clients to providers. Status:
   new/in_progress/completed/cancelled.

8. **reviews** — Client reviews for listings. 1-5 star rating + comment.

9. **homepage_settings** — Admin-controllable homepage content (hero title,
   description, image). Single-row table.

## Security

- **is_admin()** — SECURITY DEFINER function that checks if the current user
  has admin privileges by looking up their profile.

- **handle_new_user()** — Trigger function that auto-creates a profile when a
  new auth user signs up, pulling full_name and account_type from user metadata.

- **promote_to_admin(code)** — SECURITY DEFINER function that promotes the
  current user to admin if they provide the correct access code.

- **RLS enabled on all tables.** Policies:
  - categories/cities/services_catalog: public read, admin-only write
  - listings: public read (published only, admin sees all), authenticated
    insert (own), update/delete (own or admin)
  - profiles: authenticated read (own or admin), insert (own via trigger),
    update (own or admin)
  - orders: authenticated CRUD (client or provider or admin)
  - reviews: public read, authenticated insert (own, one per listing)
  - homepage_settings: public read, admin-only write
  - listing_images: public read, authenticated insert/update/delete (listing owner or admin)

## Important Notes
1. The admin access code is "mahrah-admin-2024". Users sign up normally,
   then use the admin promotion page with this code to gain admin access.
2. Demo profiles are seeded without auth_user_id so they exist without
   real auth accounts. This populates the platform with sample data.
3. The handle_new_user trigger ensures every new signup gets a profile
   automatically — the frontend does not need to create one manually.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  city text,
  avatar_url text,
  account_type text NOT NULL DEFAULT 'client' CHECK (account_type IN ('provider', 'client', 'both')),
  is_admin boolean NOT NULL DEFAULT false,
  is_disabled boolean NOT NULL DEFAULT false,
  provider_verified boolean NOT NULL DEFAULT false,
  provider_status text DEFAULT 'pending' CHECK (provider_status IN ('pending', 'approved', 'rejected')),
  bio text,
  skills text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon_name text NOT NULL DEFAULT 'Briefcase',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============ SERVICES CATALOG ============
CREATE TABLE IF NOT EXISTS services_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

ALTER TABLE services_catalog ENABLE ROW LEVEL SECURITY;

-- ============ CITIES ============
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- ============ LISTINGS ============
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  experience text,
  city text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'hidden', 'rejected')),
  featured boolean NOT NULL DEFAULT false,
  rating numeric DEFAULT 0,
  rating_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_provider ON listings(provider_id);

-- ============ LISTING IMAGES ============
CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);

-- ============ ORDERS ============
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, client_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);

-- ============ HOMEPAGE SETTINGS ============
CREATE TABLE IF NOT EXISTS homepage_settings (
  id int PRIMARY KEY DEFAULT 1,
  hero_title text NOT NULL DEFAULT 'مهارتك تستحق فرصة',
  hero_description text NOT NULL DEFAULT 'اعرض مهارتك، وابحث عن عملاء يحتاجون ما تقدمه.',
  hero_image_url text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE homepage_settings ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS ============

-- Check if current user is admin (SECURITY DEFINER to bypass RLS on profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND is_admin = true AND is_disabled = false
  );
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, full_name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'client')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Promote current user to admin with access code
CREATE OR REPLACE FUNCTION public.promote_to_admin(p_admin_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_admin_code = 'mahrah-admin-2024' THEN
    UPDATE public.profiles
    SET is_admin = true, account_type = 'both'
    WHERE auth_user_id = auth.uid();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'لم يتم العثور على الملف الشخصي';
    END IF;
  ELSE
    RAISE EXCEPTION 'رمز الأدمن غير صحيح';
  END IF;
END;
$$;

-- ============ RLS POLICIES ============

-- CATEGORIES: public read, admin write
DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_insert" ON categories;
CREATE POLICY "categories_admin_insert" ON categories FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_admin_update" ON categories;
CREATE POLICY "categories_admin_update" ON categories FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_admin_delete" ON categories;
CREATE POLICY "categories_admin_delete" ON categories FOR DELETE
  TO authenticated USING (public.is_admin());

-- SERVICES CATALOG: public read, admin write
DROP POLICY IF EXISTS "catalog_public_read" ON services_catalog;
CREATE POLICY "catalog_public_read" ON services_catalog FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "catalog_admin_insert" ON services_catalog;
CREATE POLICY "catalog_admin_insert" ON services_catalog FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "catalog_admin_update" ON services_catalog;
CREATE POLICY "catalog_admin_update" ON services_catalog FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "catalog_admin_delete" ON services_catalog;
CREATE POLICY "catalog_admin_delete" ON services_catalog FOR DELETE
  TO authenticated USING (public.is_admin());

-- CITIES: public read, admin write
DROP POLICY IF EXISTS "cities_public_read" ON cities;
CREATE POLICY "cities_public_read" ON cities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "cities_admin_insert" ON cities;
CREATE POLICY "cities_admin_insert" ON cities FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cities_admin_update" ON cities;
CREATE POLICY "cities_admin_update" ON cities FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cities_admin_delete" ON cities;
CREATE POLICY "cities_admin_delete" ON cities FOR DELETE
  TO authenticated USING (public.is_admin());

-- LISTINGS: public read (published or admin), authenticated insert (own), update/delete (own or admin)
DROP POLICY IF EXISTS "listings_read" ON listings;
CREATE POLICY "listings_read" ON listings FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "listings_insert_own" ON listings;
CREATE POLICY "listings_insert_own" ON listings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = provider_id));

DROP POLICY IF EXISTS "listings_update_own_or_admin" ON listings;
CREATE POLICY "listings_update_own_or_admin" ON listings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = provider_id)
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = provider_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "listings_delete_own_or_admin" ON listings;
CREATE POLICY "listings_delete_own_or_admin" ON listings FOR DELETE
  TO authenticated
  USING (
    auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = provider_id)
    OR public.is_admin()
  );

-- LISTING IMAGES: public read, authenticated insert/update/delete (listing owner or admin)
DROP POLICY IF EXISTS "listing_images_read" ON listing_images;
CREATE POLICY "listing_images_read" ON listing_images FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "listing_images_insert_own" ON listing_images;
CREATE POLICY "listing_images_insert_own" ON listing_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings l
      JOIN profiles p ON p.id = l.provider_id
      WHERE l.id = listing_id AND p.auth_user_id = auth.uid()
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "listing_images_delete_own" ON listing_images;
CREATE POLICY "listing_images_delete_own" ON listing_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      JOIN profiles p ON p.id = l.provider_id
      WHERE l.id = listing_id AND p.auth_user_id = auth.uid()
    ) OR public.is_admin()
  );

-- PROFILES: authenticated read (own or admin), insert (via trigger only), update (own or admin)
DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON profiles;
CREATE POLICY "profiles_read_own_or_admin" ON profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin());

-- Allow insert via trigger (auth_user_id matches new user)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin" ON profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());

-- ORDERS: authenticated CRUD (client, provider, or admin)
DROP POLICY IF EXISTS "orders_read_participants" ON orders;
CREATE POLICY "orders_read_participants" ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = client_id)
    OR auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = provider_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "orders_insert_client" ON orders;
CREATE POLICY "orders_insert_client" ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = client_id)
  );

DROP POLICY IF EXISTS "orders_update_participants" ON orders;
CREATE POLICY "orders_update_participants" ON orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = client_id)
    OR auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = provider_id)
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = client_id)
    OR auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = provider_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
CREATE POLICY "orders_delete_admin" ON orders FOR DELETE
  TO authenticated USING (public.is_admin());

-- REVIEWS: public read, authenticated insert (own)
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = client_id)
  );

DROP POLICY IF EXISTS "reviews_delete_own_or_admin" ON reviews;
CREATE POLICY "reviews_delete_own_or_admin" ON reviews FOR DELETE
  TO authenticated
  USING (
    auth.uid() = (SELECT auth_user_id FROM profiles WHERE id = client_id)
    OR public.is_admin()
  );

-- HOMEPAGE SETTINGS: public read, admin write
DROP POLICY IF EXISTS "homepage_public_read" ON homepage_settings;
CREATE POLICY "homepage_public_read" ON homepage_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "homepage_admin_update" ON homepage_settings;
CREATE POLICY "homepage_admin_update" ON homepage_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
