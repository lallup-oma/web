/*
  # ArteVista E-Commerce Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique)
      - `created_at` (timestamp)

    - `paintings`
      - `id` (uuid, primary key)
      - `title` (text)
      - `artist` (text)
      - `description` (text)
      - `price` (numeric)
      - `dimensions` (text) - e.g. "60x80 cm"
      - `medium` (text) - e.g. "Oil on canvas"
      - `year` (integer)
      - `category_id` (uuid, FK -> categories)
      - `image_url` (text)
      - `is_sold` (boolean, default false)
      - `is_featured` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `admin_users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `created_at` (timestamp)

  2. Storage
    - `paintings` bucket for painting images

  3. Security
    - RLS enabled on all tables
    - Public read access for paintings and categories
    - Admin-only write access (via service role from server)
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- Paintings table
CREATE TABLE IF NOT EXISTS paintings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL DEFAULT 'ArteVista',
  description text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  dimensions text DEFAULT '',
  medium text DEFAULT '',
  year integer,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text DEFAULT '',
  is_sold boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE paintings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read paintings"
  ON paintings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin sessions table (JWT-based simple session)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- No public access to admin_sessions; only server (service role) accesses it

-- Seed default categories
INSERT INTO categories (name, slug) VALUES
  ('Oil Paintings', 'oil-paintings'),
  ('Watercolor', 'watercolor'),
  ('Acrylic', 'acrylic'),
  ('Mixed Media', 'mixed-media'),
  ('Portraits', 'portraits'),
  ('Landscapes', 'landscapes'),
  ('Abstract', 'abstract')
ON CONFLICT (slug) DO NOTHING;
