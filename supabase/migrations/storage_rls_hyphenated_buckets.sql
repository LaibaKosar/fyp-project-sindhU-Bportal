-- Fix Storage RLS: use bucket names that match your dashboard (hyphenated)
-- Run this in Supabase SQL Editor if your buckets are named official-photos and appointment-letters

-- 1. Drop old policies (if they used underscores)
DROP POLICY IF EXISTS "Allow Auth Uploads Photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow Auth Update Photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Read Photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow Auth Uploads Letters" ON storage.objects;
DROP POLICY IF EXISTS "Allow Auth Update Letters" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Read Letters" ON storage.objects;

-- 2. official-photos bucket (hyphenated name)
CREATE POLICY "Allow Auth Uploads Photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'official-photos');

CREATE POLICY "Allow Auth Update Photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'official-photos');

CREATE POLICY "Allow Public Read Photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'official-photos');

-- 3. appointment-letters bucket (hyphenated name)
CREATE POLICY "Allow Auth Uploads Letters"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'appointment-letters');

CREATE POLICY "Allow Auth Update Letters"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'appointment-letters');

CREATE POLICY "Allow Public Read Letters"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'appointment-letters');

-- 4. staff-profiles bucket (used for HOD photo uploads on Department page)
DROP POLICY IF EXISTS "Allow Auth Uploads Staff Profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow Auth Update Staff Profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Read Staff Profiles" ON storage.objects;

CREATE POLICY "Allow Auth Uploads Staff Profiles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'staff-profiles');

CREATE POLICY "Allow Auth Update Staff Profiles"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'staff-profiles');

CREATE POLICY "Allow Public Read Staff Profiles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'staff-profiles');
