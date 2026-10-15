# CURRENT_STATUS.md — مَهَرَة (Mahrah)

> **تاريخ:** 2026-10-04  
> **حالة المشروع كما هو — بدون تعديلات.**

---

## جدول حالة الميزات

| # | Feature | Status | Real/Mock | Backend Connected | Notes |
|---|---|---|---|---|---|
| 1 | Authentication (تسجيل/دخول) | يعمل | Real | نعم (Supabase Auth) | Email/password، email confirmation OFF |
| 2 | Forgot Password | وهمي | Mock | لا | يعرض شاشة نجاح دون استدعاء resetPasswordForEmail |
| 3 | Users / Profiles | يعمل | Real | نعم | + 6 demo profiles بدون auth_user_id |
| 4 | Providers | يعمل | Real | نعم | provider_status (pending/approved/rejected)، approval من Admin |
| 5 | Services (Listings) | يعمل | Real | نعم | + 12 demo listings، CRUD كامل |
| 6 | Categories | يعمل | Real | نعم | 4 تصنيفات seeded + إدارة من Admin |
| 7 | Search | يعمل | Real | نعم | ilike على service_name + فلاتر URL params |
| 8 | Filters | يعمل | Real | نعم | تصنيف، مدينة، سعر (min/max)، تقييم |
| 9 | Orders (إنشاء/قبول/إنجاز/تأكيد/إلغاء) | يعمل | Real | نعم | RPC functions، 16 حالة كاملة |
| 10 | Payments (بوابة دفع) | غير متصل | N/A | لا | unavailablePaymentProvider يرمي error دائمًا |
| 11 | Wallet (أرصدة + معاملات) | يعمل | Real | نعم | wallet_accounts + wallet_transactions، deny-by-default RLS |
| 12 | Commission (العمولة) | يعمل | Real | نعم | server-side calculate_fees، 2.5%/2.5% min 100 YER |
| 13 | Hold (حجز الأموال) | يعمل | Real | نعم | trigger sync_wallet_for_order عند in_progress |
| 14 | Release (تحرير الأموال) | يعمل | Real | نعم | عند protection_period/completed/confirmation_expired |
| 15 | Refund (استرداد) | يعمل | Real | نعم | عند resolve_dispute بنتيجة resolved_customer |
| 16 | Payout / Withdrawal (DB) | يعمل | Real | نعم | request_withdrawal RPC مع idempotency |
| 17 | Payout / Withdrawal (UI) | معطّل | Mock | جزئي | زر disabled "قريبًا"، وسائل دفع placeholder |
| 18 | Disputes (نزاعات) | يعمل | Real | نعم | open_dispute + resolve_dispute (admin) |
| 19 | 48-hour Protection | يعمل | Real | نعم | confirmation_deadline + protection_period_start/end |
| 20 | Reminders (24h/40h) | يعمل (غير مجدول) | Real | نعم | send_confirmation_reminders function موجودة لكن لا يوجد cron |
| 21 | Expire Confirmations | يعمل (غير مجدول) | Real | نعم | expire_confirmations function موجودة لكن لا يوجد cron |
| 22 | Chat / Messages | يعمل | Real | نعم | conversations + messages، polling كل 5 ثوان (لا realtime) |
| 23 | Notifications | يعمل | Real | نعم | triggers على messages + orders، polling كل 15 ثوان |
| 24 | Reviews / Ratings | يعمل | Real | نعم | reviews table، UNIQUE(listing+client)، rating 1-5 |
| 25 | Favorites | غير متوفّر | N/A | لا | غير موجود في الكود أو DB |
| 26 | Admin Dashboard | يعمل | Real | نعم | إحصائيات حية، 10 أقسام |
| 27 | Admin: Users Management | يعمل | Real | نعم | بحث/تعطيل/حذف (admin_toggle_user_disabled) |
| 28 | Admin: Listings Management | يعمل | Real | نعم | موافقة/رفض/إخفاء/تمييز/حذف/إضافة/تعديل |
| 29 | Admin: Orders Management | يعمل | Real | نعم | admin_update_order_status |
| 30 | Admin: Disputes Resolution | يعمل | Real | نعم | resolve_dispute |
| 31 | Admin: Commission Settings | يعمل | Real | نعم | تعديل commission_settings من الواجهة |
| 32 | Admin: Homepage Settings | يعمل | Real | نعم | hero_title/description/image |
| 33 | Admin: Broadcast Notifications | يعمل | Real | نعم | send_notification_to_all |
| 34 | Restaurants / Cafes | غير متوفّر | N/A | لا | لا يوجد جدول أو صفحة مستقلة (تصنيف "مطاعم وضيافة" موجود فقط كـ category) |
| 35 | Jobs / Opportunities | غير متوفّر | N/A | لا | غير موجود |
| 36 | AI (أي ميزة) | غير متوفّر | N/A | لا | لا يوجد أي AI في المشروع |
| 37 | PWA (manifest/sw/install) | غير متوفّر | N/A | لا | لا manifest، لا service worker، لا theme-color |
| 38 | Edge Function API (/api) | يعمل | Real | نعم | public REST API، verify_jwt=false، service role key |
| 39 | Avatar Upload | شبه حقيقي | Partial | نعم | FileReader → base64 في DB (ليس Supabase Storage) |
| 40 | Work Images Upload | جزئي | Partial | نعم | data URLs تُستبعد (كبيرة)، URLs خارجية فقط تُحفظ |
| 41 | Supabase Storage | غير متوفّر | N/A | لا | لا يوجد تكامل مع Storage للصور |
| 42 | Realtime (Supabase) | غير متوفّر | N/A | لا | polling بدلاً من Realtime subscriptions |
| 43 | Scheduled Jobs (pg_cron) | غير متوفّر | N/A | لا | functions موجودة لكن لا يوجد scheduler |

---

## ملخص سريع

- **ميزات تعمل بالكامل (Real + Backend):** Authentication, Profiles, Listings, Categories, Search, Filters, Orders (16 states), Wallet (balances + transactions + hold/release), Commission, Disputes, 48h Protection, Chat, Notifications, Reviews, Admin (10 sections), Edge API
- **ميزات تعمل جزئيًا:** Withdrawals (DB حقيقي، UI معطّل), Avatar/Images (base64 بدل Storage), Reminders/Expiry (functions موجودة لكن غير مجدولة)
- **ميزات وهمية:** Forgot Password
- **غير متوفّر:** Payment Gateway, Favorites, Restaurants/Cafes (مستقل), Jobs, AI, PWA, Supabase Storage, Realtime, Scheduled Jobs
