CREATE POLICY "dish photos are viewable by everyone" ON storage.objects FOR SELECT USING (bucket_id = 'dish-photos');
CREATE POLICY "stall owners can upload dish photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dish-photos');
CREATE POLICY "stall owners can update dish photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dish-photos' AND owner = auth.uid());
CREATE POLICY "stall owners can delete dish photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dish-photos' AND owner = auth.uid());