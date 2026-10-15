/*
# Mahrah — Seed Initial Data

Seeds all base data: 4 categories with predefined services, 2 cities,
demo provider profiles, sample listings, reviews, and homepage settings.
*/

-- ============ CITIES ============
INSERT INTO cities (name, sort_order) VALUES ('صنعاء', 1), ('عدن', 2) ON CONFLICT (name) DO NOTHING;

-- ============ CATEGORIES ============
INSERT INTO categories (name, icon_name, sort_order) VALUES
  ('التقنية والرقمية', 'Laptop', 1),
  ('الأعمال والإدارة', 'Briefcase', 2),
  ('المطاعم والضيافة', 'UtensilsCrossed', 3),
  ('الجمال والعناية', 'Sparkles', 4)
ON CONFLICT (name) DO NOTHING;

-- ============ SERVICES CATALOG ============
INSERT INTO services_catalog (category_id, name, sort_order)
SELECT cat.id, svc.name, svc.sort_order
FROM (VALUES
  ('التقنية والرقمية', 'برمجة وتطوير مواقع', 1),
  ('التقنية والرقمية', 'تصميم مواقع', 2),
  ('التقنية والرقمية', 'تصميم جرافيك', 3),
  ('التقنية والرقمية', 'مونتاج فيديو', 4),
  ('التقنية والرقمية', 'تصوير', 5),
  ('التقنية والرقمية', 'كتابة محتوى', 6),
  ('التقنية والرقمية', 'ترجمة', 7),
  ('التقنية والرقمية', 'إدخال بيانات', 8),
  ('التقنية والرقمية', 'إدارة حسابات التواصل الاجتماعي', 9),
  ('التقنية والرقمية', 'تسويق وإعلانات', 10),
  ('التقنية والرقمية', 'خدمة عملاء', 11),
  ('الأعمال والإدارة', 'محاسبة', 1),
  ('الأعمال والإدارة', 'مبيعات', 2),
  ('الأعمال والإدارة', 'إدارة أعمال', 3),
  ('الأعمال والإدارة', 'سكرتارية', 4),
  ('الأعمال والإدارة', 'استشارات', 5),
  ('الأعمال والإدارة', 'موارد بشرية', 6),
  ('المطاعم والضيافة', 'باريستا', 1),
  ('المطاعم والضيافة', 'كاشير', 2),
  ('المطاعم والضيافة', 'طبّاخ', 3),
  ('المطاعم والضيافة', 'شيف', 4),
  ('المطاعم والضيافة', 'نادل', 5),
  ('الجمال والعناية', 'حلاقة وتصفيف الشعر', 1),
  ('الجمال والعناية', 'مكياج', 2),
  ('الجمال والعناية', 'عناية بالبشرة', 3),
  ('الجمال والعناية', 'بديكير ومانيكير', 4),
  ('الجمال والعناية', 'عناية واسترخاء', 5)
) AS svc(cat_name, name, sort_order)
JOIN categories cat ON cat.name = svc.cat_name
WHERE NOT EXISTS (SELECT 1 FROM services_catalog sc WHERE sc.category_id = cat.id AND sc.name = svc.name);

-- ============ HOMEPAGE SETTINGS ============
INSERT INTO homepage_settings (id, hero_title, hero_description)
VALUES (1, 'مهارتك تستحق فرصة', 'اعرض مهارتك، وابحث عن عملاء يحتاجون ما تقدمه.')
ON CONFLICT (id) DO NOTHING;

-- ============ DEMO PROVIDERS ============
INSERT INTO profiles (id, email, full_name, phone, city, avatar_url, account_type, provider_verified, provider_status, bio, skills, created_at)
SELECT * FROM (VALUES
  ('a1000001-0000-0000-0000-000000000001'::uuid, 'ahmed.tech@example.com', 'أحمد المهدي', '777123456', 'صنعاء', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400', 'provider', true, 'approved', 'مطور ويب محترف بخبرة 8 سنوات', ARRAY['برمجة','تصميم مواقع','React'], now() - interval '30 days'),
  ('a1000001-0000-0000-0000-000000000002'::uuid, 'sara.design@example.com', 'سارة الحداد', '777234567', 'عدن', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400', 'provider', true, 'approved', 'مصممة جرافيك ومونتيرة محترفة', ARRAY['تصميم جرافيك','مونتاج فيديو'], now() - interval '25 days'),
  ('a1000001-0000-0000-0000-000000000003'::uuid, 'mohamed.chef@example.com', 'محمد الكبسي', '777345678', 'صنعاء', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400', 'provider', true, 'approved', 'شيف محترف بخبرة 12 سنة', ARRAY['طبخ','شيف'], now() - interval '20 days'),
  ('a1000001-0000-0000-0000-000000000004'::uuid, 'layla.beauty@example.com', 'ليلى عبدالله', '777456789', 'عدن', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400', 'provider', true, 'approved', 'خبيرة تجميل وعناية بالبشرة', ARRAY['مكياج','عناية بالبشرة'], now() - interval '15 days'),
  ('a1000001-0000-0000-0000-000000000005'::uuid, 'khaled.biz@example.com', 'خالد الصبري', '777567890', 'صنعاء', 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400', 'provider', true, 'approved', 'محاسب ومستشار أعمال معتمد', ARRAY['محاسبة','استشارات'], now() - interval '10 days'),
  ('a1000001-0000-0000-0000-000000000006'::uuid, 'fatima.write@example.com', 'فاطمة الأشموري', '777678901', 'صنعاء', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400', 'provider', true, 'approved', 'كاتبة محتوى ومترجمة محترفة', ARRAY['كتابة محتوى','ترجمة'], now() - interval '8 days')
) AS v(id, email, full_name, phone, city, avatar_url, account_type, provider_verified, provider_status, bio, skills, created_at)
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.email = v.email);

-- ============ DEMO LISTINGS ============
INSERT INTO listings (id, provider_id, category_id, service_name, description, price, experience, city, status, featured, rating, rating_count, created_at)
SELECT v.id, v.provider_id, cat.id, v.service_name, v.description, v.price::numeric, v.experience, v.city, v.status, v.featured, v.rating::numeric, v.rating_count, v.created_at
FROM (VALUES
  ('b2000001-0000-0000-0000-000000000001'::uuid, 'a1000001-0000-0000-0000-000000000001'::uuid, 'التقنية والرقمية', 'برمجة وتطوير مواقع', 'أطور مواقع ويب احترافية وعصرية باستخدام أحدث التقنيات. خبرة في React، Node.js، وقواعد البيانات.', '50000', '8 سنوات', 'صنعاء', 'published', true, 4.8, 5, now() - interval '28 days'),
  ('b2000001-0000-0000-0000-000000000002'::uuid, 'a1000001-0000-0000-0000-000000000001'::uuid, 'التقنية والرقمية', 'تصميم مواقع', 'تصميم واجهات مستخدم احترافية تجمع بين الجمال وسهولة الاستخدام.', '30000', '5 سنوات', 'صنعاء', 'published', false, 4.5, 3, now() - interval '20 days'),
  ('b2000001-0000-0000-0000-000000000003'::uuid, 'a1000001-0000-0000-0000-000000000002'::uuid, 'التقنية والرقمية', 'تصميم جرافيك', 'تصميم شعارات، هويات بصرية، منشورات سوشيال ميديا، وبطاقات أعمال.', '15000', '6 سنوات', 'عدن', 'published', true, 4.9, 8, now() - interval '24 days'),
  ('b2000001-0000-0000-0000-000000000004'::uuid, 'a1000001-0000-0000-0000-000000000002'::uuid, 'التقنية والرقمية', 'مونتاج فيديو', 'مونتاج احترافي للفيديوهات والإعلانات ومحتوى السوشيال ميديا.', '25000', '4 سنوات', 'عدن', 'published', false, 4.6, 4, now() - interval '18 days'),
  ('b2000001-0000-0000-0000-000000000005'::uuid, 'a1000001-0000-0000-0000-000000000003'::uuid, 'المطاعم والضيافة', 'شيف', 'طبخ أطباق يمنية وعربية وعالمية للمناسبات والفعاليات.', '20000', '12 سنة', 'صنعاء', 'published', true, 5.0, 6, now() - interval '19 days'),
  ('b2000001-0000-0000-0000-000000000006'::uuid, 'a1000001-0000-0000-0000-000000000003'::uuid, 'المطاعم والضيافة', 'طبّاخ', 'طبخ يومي للعائلات والمناسبات الصغيرة.', '10000', '8 سنوات', 'صنعاء', 'published', false, 4.3, 3, now() - interval '12 days'),
  ('b2000001-0000-0000-0000-000000000007'::uuid, 'a1000001-0000-0000-0000-000000000004'::uuid, 'الجمال والعناية', 'مكياج', 'مكياج احترافي للأعراس والمناسبات والتصوير.', '12000', '7 سنوات', 'عدن', 'published', true, 4.9, 10, now() - interval '14 days'),
  ('b2000001-0000-0000-0000-000000000008'::uuid, 'a1000001-0000-0000-0000-000000000004'::uuid, 'الجمال والعناية', 'عناية بالبشرة', 'جلسات عناية بالبشرة والاسترخاء.', '8000', '5 سنوات', 'عدن', 'published', false, 4.7, 5, now() - interval '10 days'),
  ('b2000001-0000-0000-0000-000000000009'::uuid, 'a1000001-0000-0000-0000-000000000005'::uuid, 'الأعمال والإدارة', 'محاسبة', 'خدمات محاسبية للشركات والأفراد.', '20000', '10 سنوات', 'صنعاء', 'published', false, 4.4, 4, now() - interval '9 days'),
  ('b2000001-0000-0000-0000-000000000010'::uuid, 'a1000001-0000-0000-0000-000000000005'::uuid, 'الأعمال والإدارة', 'استشارات', 'استشارات إدارية ومالية للشركات الناشئة.', '35000', '10 سنوات', 'صنعاء', 'published', false, 4.6, 3, now() - interval '7 days'),
  ('b2000001-0000-0000-0000-000000000011'::uuid, 'a1000001-0000-0000-0000-000000000006'::uuid, 'التقنية والرقمية', 'كتابة محتوى', 'كتابة محتوى احترافي للمواقع والمدونات.', '10000', '4 سنوات', 'صنعاء', 'published', false, 4.7, 6, now() - interval '6 days'),
  ('b2000001-0000-0000-0000-000000000012'::uuid, 'a1000001-0000-0000-0000-000000000006'::uuid, 'التقنية والرقمية', 'ترجمة', 'ترجمة احترافية بين العربية والإنجليزية.', '8000', '5 سنوات', 'صنعاء', 'published', false, 4.5, 4, now() - interval '5 days')
) AS v(id, provider_id, cat_name, service_name, description, price, experience, city, status, featured, rating, rating_count, created_at)
JOIN categories cat ON cat.name = v.cat_name
WHERE NOT EXISTS (SELECT 1 FROM listings l WHERE l.id = v.id);

-- ============ DEMO REVIEWS ============
INSERT INTO reviews (listing_id, client_id, client_name, rating, comment, created_at)
SELECT l.id, p.id, p.full_name, r.rating, r.comment, r.created_at
FROM (VALUES
  ('b2000001-0000-0000-0000-000000000001'::uuid, 'a1000001-0000-0000-0000-000000000003'::uuid, 5, 'عمل ممتاز واحترافية عالية'::text, now() - interval '5 days'),
  ('b2000001-0000-0000-0000-000000000003'::uuid, 'a1000001-0000-0000-0000-000000000004'::uuid, 4, 'تصميم رائع وسريع في التسليم', now() - interval '4 days'),
  ('b2000001-0000-0000-0000-000000000005'::uuid, 'a1000001-0000-0000-0000-000000000001'::uuid, 5, 'الأطعمة كانت لذيذة جدا', now() - interval '3 days'),
  ('b2000001-0000-0000-0000-000000000007'::uuid, 'a1000001-0000-0000-0000-000000000001'::uuid, 5, 'مكياج احترافي ورائع', now() - interval '2 days'),
  ('b2000001-0000-0000-0000-000000000009'::uuid, 'a1000001-0000-0000-0000-000000000001'::uuid, 4, 'خدمة محاسبية دقيقة', now() - interval '1 day')
) AS r(listing_id, client_id, rating, comment, created_at)
JOIN listings l ON l.id = r.listing_id
JOIN profiles p ON p.id = r.client_id
WHERE NOT EXISTS (SELECT 1 FROM reviews rv WHERE rv.listing_id = r.listing_id AND rv.client_id = r.client_id);
