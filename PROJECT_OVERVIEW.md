# مَهَرَة (Mahrah) — مشروع المنصة الكاملة

> **تاريخ الإصدار:** 2026-10-04  
> **هذا الملف يوثّق المشروع كما هو حاليًا — بدون تعديلات أو تحسينات.**

---

## 1. فكرة مَهَرَة

مَهَرَة هي منصة يمنية لعرض المهارات والخدمات تربط بين مقدمي الخدمات (Providers) والعملاء (Clients). يعرض مقدم الخدمة مهارته بسعر ثابت، يبحث العميل عن خدمة، يطلبها، يقبلها المقدم، ينفذها، ثم يؤكد العميل استلامها. يوجد نظام عمولة (Commission) على الطرفين، محفظة (Wallet) لكل مستخدم، فترة حماية 48 ساعة، نظام نزاعات (Disputes)، رسائل مباشرة، إشعارات، وتقييمات.

العملة: الريال اليمني (YER). المدن: صنعاء وعدن. اللغة: العربية (RTL).

---

## 2. Tech Stack

| الطبقة | التقنية |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS 3 + CSS مخصص (RTL) |
| Routing | React Router DOM 7 |
| Icons | lucide-react |
| Backend / Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email/Password) |
| Edge Functions | Supabase Deno Edge Functions (TypeScript) |
| Hosting | Bolt Hosting (default) / Netlify (optional) |
| PWA | غير متوفّر |

---

## 3. Architecture

```
Browser (React SPA, RTL Arabic)
  ├─ src/pages/        → صفحات التطبيق
  ├─ src/components/   → مكوّنات قابلة لإعادة الاستخدام
  ├─ src/contexts/     → AuthContext (Supabase session + profile)
  ├─ src/hooks/        → useStaticData, useNotifications
  ├─ src/lib/          → supabase client, commission calc, payment types
  ├─ src/types/        → TypeScript interfaces & constants
  │
  ├─ Supabase Postgres (20 tables, 27 functions, 6 triggers)
  │   ├─ RLS policies on every table
  │   ├─ SECURITY DEFINER functions for all mutations
  │   └─ Deny-by-default on financial tables
  │
  └─ Supabase Edge Function (/api) — public REST API
```

---

## 4. Frontend Structure

### Routes (from App.tsx)

| Route | Page | الوصف |
|---|---|---|
| `/` | HomePage | الصفحة الرئيسية: Hero، بحث، تصنيفات، خدمات مميزة، إحصائيات |
| `/services` | ServicesPage | قائمة الخدمات مع فلاتر (تصنيف، مدينة، سعر، تقييم) |
| `/listings/:id` | ListingDetailPage | تفاصيل خدمة + طلب + مراسلة + تقييمات + معرض صور |
| `/add-skill` | AddSkillPage | نموذج إضافة خدمة جديدة (provider فقط) |
| `/orders` | OrdersPage | إدارة الطلبات: قبول، إنجاز، تأكيد، نزاع، إلغاء |
| `/messages` | MessagesPage | محادثات ورسائل مباشرة (polling كل 5 ثوان) |
| `/notifications` | NotificationsPage | قائمة الإشعارات |
| `/profile` | ProfilePage | الملف الشخصي: خدماتي، طلباتي، تقييماتي، تعديل، ترقية أدمن |
| `/wallet` | WalletPage | المحفظة: أرصدة، معاملات، سحب (معطّل) |
| `/auth/signin` | AuthPage | تسجيل الدخول |
| `/auth/signup` | AuthPage | التسجيل |
| `/auth/forgot` | AuthPage | استعادة كلمة المرور (وهمية — Mock) |
| `/admin` | AdminPage | لوحة الإدارة |
| `/admin/:section` | AdminPage | قسم محدد في لوحة الإدارة |

### Components

| Component | الوصف |
|---|---|
| Header | شريط علوي ثابت: شعار، إشعارات، رسائل، زر إضافة، قائمة مستخدم |
| Footer | تذييل تسويقي |
| BottomNav | تنقّل سفلي للموبايل (Home, Services, Orders, Messages, Profile) |
| Onboarding | 3 شرائح تعريفية للمستخدم الجديد (localStorage) |
| ListingCard | بطاقة خدمة |
| Logo | شعار مَهَرَة (صورة + نص) |
| NotificationBell | أيقونة جرس مع عدد غير المقروء + dropdown |
| StarRating | عرض تقييم نجوم |

### Hooks

| Hook | الوصف |
|---|---|
| useStaticData | تحميل categories, cities, services_catalog من DB |
| useNotifications | تحميل إشعارات المستخدم + عدّ غير المقروء (polling كل 15 ثانية) |

### Contexts

| Context | الوصف |
|---|---|
| AuthContext | جلسة Supabase + بيانات الـ profile + signIn/signUp/signOut/refreshProfile |

---

## 5. Backend Structure

### Edge Function: `/api` (Deno)

ملف: `supabase/functions/api/index.ts`

- **verify_jwt = false** (عام)
- يستخدم Service Role Key
- CORS مفتوح لـ `*`
- المسارات:

| Endpoint | الوصف |
|---|---|
| `GET /api/categories` | كل التصنيفات |
| `GET /api/services` | كل خدمات services_catalog |
| `GET /api/listings` | الخدمات المنشورة |
| `GET /api/listings/:id` | تفاصيل خدمة + تقييمات |
| `GET /api/cities` | كل المدن |
| `GET /api/commission-settings` | إعدادات العمولة |
| `POST /api/calculate-fees` | حساب الرسوم (RPC) |
| `GET /api/stats` | إحصائيات (عدد المقدمين، الخدمات، الطلبات) |

### Supabase RPC Functions (المستخدمة من Frontend)

| RPC | الوصف |
|---|---|
| `create_order` | إنشاء طلب جديد |
| `accept_order` | مقدم يقبل الطلب |
| `provider_complete_order` | مقدم يعلن إنجاز الخدمة |
| `customer_confirm_order` | عميل يؤكد استلام الخدمة |
| `open_dispute` | عميل يفتح نزاع |
| `cancel_order` | إلغاء الطلب |
| `resolve_dispute` | أدمن يحل النزاع |
| `admin_update_order_status` | أدمن يغيّر حالة الطلب |
| `admin_delete_listing` | أدمن يحذف خدمة |
| `admin_toggle_user_disabled` | أدمن يعطّل/يفعّل مستخدم |
| `promote_to_admin` | ترقية مستخدم لأدمن (يتطلب كود) |
| `send_notification_to_all` | أدمن يرسل إشعار جماعي |
| `request_withdrawal` | طلب سحب من المحفظة |
| `calculate_fees` | حساب الرسوم من الخادم |
| `expire_confirmations` | انتهاء مهلة التأكيد |
| `send_confirmation_reminders` | تذكيرات 24/40 ساعة |
| `expire_protection_periods` | انتهاء فترة الحماية |
| `apply_verified_payment` | تسجيل دفع مؤكَّد (service_role فقط) |

---

## 6. Database Structure

### كل الجداول (20)

| # | Table | الوصف |
|---|---|---|
| 1 | profiles | ملفات المستخدمين (auth_user_id, email, full_name, account_type, is_admin, provider_status, provider_earnings, pending_balance) |
| 2 | categories | تصنيفات الخدمات (4: تقنية، أعمال، مطاعم، جمال) |
| 3 | services_catalog | قائمة خدمات لكل تصنيف (29 خدمة) |
| 4 | cities | المدن (صنعاء، عدن) |
| 5 | listings | الخدمات المعروضة (provider, category, price, status, rating) |
| 6 | listing_images | صور معرض الأعمال لكل خدمة |
| 7 | orders | الطلبات (16 حالة، رسوم، فترة حماية، دفع) |
| 8 | reviews | التقييمات (rating 1-5, UNIQUE listing+client) |
| 9 | homepage_settings | إعدادات الصفحة الرئيسية (singleton) |
| 10 | conversations | محادثات بين مستخدمين حول خدمة |
| 11 | messages | رسائل داخل المحادثات (read_at للحالة المقروء) |
| 12 | notifications | إشعارات المستخدم (type, is_read, link) |
| 13 | commission_settings | إعدادات العمولة (singleton: 2.5%/2.5%, min 100 YER) |
| 14 | disputes | النزاعات (status, admin_resolution) |
| 15 | wallet_accounts | محفظة كل مستخدم (available, pending, total_earnings, total_paid, total_withdrawn, total_fees) |
| 16 | wallet_transactions | سجل المعاملات المالية (PAYMENT, COMMISSION, EARNING, PAYOUT, REFUND, HOLD, RELEASE, DISPUTE_HOLD, ADJUSTMENT) |
| 17 | payment_records | سجلات الدفع (provider, payment_status, transaction_reference) |
| 18 | payment_methods | وسائل دفع المستخدم (provider, account_reference, is_verified) |
| 19 | withdrawals | طلبات السحب (REQUESTED → PROCESSING → COMPLETED/FAILED) |
| 20 | audit_logs | سجل تدقيق (actor, action, order_id, transaction_id, metadata) |

### العلاقات الرئيسية

```
auth.users (1) ──→ (1) profiles
profiles (1) ──→ (n) listings
profiles (1) ──→ (n) orders (as client or provider)
profiles (1) ──→ (1) wallet_accounts
listings (1) ──→ (n) listing_images
listings (1) ──→ (n) reviews
listings (1) ──→ (n) orders
categories (1) ──→ (n) services_catalog
categories (1) ──→ (n) listings
orders (1) ──→ (1) disputes
orders (1) ──→ (n) wallet_transactions
orders (1) ──→ (n) payment_records
conversations (1) ──→ (n) messages
profiles (1) ──→ (n) notifications
profiles (1) ──→ (n) payment_methods
profiles (1) ──→ (n) withdrawals
```

### Enums (CHECK Constraints — لا توجد ENUM types أصلية)

| Column | Values |
|---|---|
| profiles.account_type | provider, client, both |
| profiles.provider_status | pending, approved, rejected |
| listings.status | pending, published, hidden, rejected |
| orders.status | new, pending_payment, paid, waiting_for_provider, accepted, in_progress, provider_completed, awaiting_customer_confirmation, completed_by_customer, protection_period, completed, cancelled, disputed, resolved, confirmation_expired, refunded |
| orders.payment_status | not_connected, pending, paid, refunded |
| disputes.status | open, under_review, resolved_customer, resolved_provider, resolved_partial |
| notifications.type | message, order, order_update, admin_broadcast, system |
| wallet_transactions.type | PAYMENT, COMMISSION, EARNING, PAYOUT, REFUND, HOLD, RELEASE, DISPUTE_HOLD, ADJUSTMENT |
| wallet_transactions.status | pending, posted, failed, reversed |
| payment_records.payment_status | PENDING, PROCESSING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED, DISPUTED, CANCELLED |
| withdrawals.status | REQUESTED, PROCESSING, COMPLETED, FAILED, CANCELLED |
| reviews.rating | 1-5 |

### Triggers (6)

| Trigger | Table | Event | Function |
|---|---|---|---|
| on_auth_user_created | auth.users | AFTER INSERT | handle_new_user() — ينشئ profile تلقائيًا |
| on_message_insert | messages | AFTER INSERT | notify_message_recipient() |
| on_order_insert | orders | AFTER INSERT | notify_order_provider() |
| on_order_status_change | orders | AFTER UPDATE OF status | update_pending_balance() |
| on_order_wallet_sync | orders | AFTER UPDATE OF status | sync_wallet_for_order() |
| on_profile_wallet_created | profiles | AFTER INSERT | create_wallet_for_profile() |

### RLS Policies

- جميع الجداول الـ20 مفعّل عليها RLS
- معظمها: SELECT عام للبيانات المنشورة + CRUD للمالك + صلاحيات أدمن عبر `is_admin()`
- الجداول المالية (wallet_accounts, wallet_transactions, payment_records, withdrawals, audit_logs): deny-by-default (`WITH CHECK (false)`) — لا يمكن للـbrowser تعديلها مباشرة، فقط SECURITY DEFINER functions
- payment_methods: CRUD كامل للمالك

---

## 7. Authentication Flow

1. **التسجيل**: `supabase.auth.signUp()` → trigger `handle_new_user()` ينشئ profile تلقائيًا
2. **تسجيل الدخول**: `supabase.auth.signInWithPassword()` → AuthContext يحمّل profile
3. **الجلسة**: `onAuthStateChange` يحدّث session + profile
4. **أدوار المستخدمين**: `account_type` (provider/client/both) + `is_admin` boolean
5. **ترقية أدمن**: `promote_to_admin(p_admin_code)` — يتطلب كود `mahrah-admin-2024`
6. **استعادة كلمة المرور**: وهمية (Mock) — تعرض شاشة نجاح فقط دون استدعاء `resetPasswordForEmail`
7. **تأكيد البريد**: معطّل (email confirmation OFF)

---

## 8. Order Flow (دورة حياة الطلب)

```
Client يطلب الخدمة (create_order)
  → status: pending_payment, payment_status: pending
  → إشعار للمقدم

Provider يقبل (accept_order)
  → status: in_progress
  → HOLD: provider_net يُضاف لـ pending_balance

Provider ينجز (provider_complete_order)
  → status: awaiting_customer_confirmation
  → confirmation_deadline = now + 48h
  → تذكيرات عند 24h و 40h (send_confirmation_reminders)

Client يؤكد استلام (customer_confirm_order)
  → status: protection_period
  → protection_period_start/end مضبوطة

انتهاء فترة الحماية (expire_protection_periods)
  → status: completed
  → RELEASE: pending → available, total_earnings يزيد

Client يفتح نزاع (open_dispute)
  → status: disputed

Admin يحل النزاع (resolve_dispute)
  → resolved_customer → status: refunded
  → resolved_provider/partial → status: completed

Client/Provider يلغي (cancel_order)
  → status: cancelled
  → RELEASE إذا كان في in_progress
```

### Business Rules للطلبات
- لا يمكن لمقدم الخدمة طلب خدمته الخاصة
- الرسوم تُحسب من الخادم دائمًا (calculate_fees) — العميل لا يمكنه التلاعب بالسعر
- فترة التأكيد: 48 ساعة من إعلان الإنجاز
- تذكيرات: عند 24h و 40h
- إذا انتهت مهلة التأكيد: `confirmation_expired`
- فترة الحماية: بعد تأكيد العميل، قبل التحويل النهائي

---

## 9. Payment Flow

- **مزود الدفع**: غير متصل حاليًا (`unavailablePaymentProvider` في payments.ts — يرمي error دائمًا)
- **create_order** يضبط `payment_status = 'pending'`, `status = 'pending_payment'`
- **apply_verified_payment** (service_role فقط): مخصّص لاستقبال webhook من مزود دفع حقيقي بعد التحقق من التوقيع — غير مستخدم حاليًا لعدم وجود مزود
- **الوضع الحالي**: الطلبات تُنشأ بانتظار ربط بوابة دفع موثوقة

---

## 10. Wallet Flow

- كل profile يحصل على `wallet_accounts` تلقائيًا (trigger عند إنشاء profile)
- **الأرصدة**:
  - `available_balance`: قابل للسحب
  - `pending_balance`: محجوز حتى اكتمال الطلب
  - `total_earnings`: إجمالي الأرباح
  - `total_paid`, `total_withdrawn`, `total_fees`
- **المعاملات** (wallet_transactions): كل تحويل مالي مُسجّل مع idempotency_key
- **السحب** (withdrawals): موجود في DB (request_withdrawal RPC)، لكن **معطّل في الواجهة** — الزر disabled مع نص "قريبًا"

### Hold/Release Flow

```
Order → in_progress:
  sync_wallet_for_order → HOLD (provider_net → pending_balance)

Order → protection_period / completed / confirmation_expired:
  sync_wallet_for_order → RELEASE (pending → available, total_earnings up)

Order → cancelled (from in_progress):
  sync_wallet_for_order → RELEASE (إرجاع المحجوز)
```

---

## 11. Commission Calculation

- **commission_settings** (singleton, id=1):
  - `customer_fee_percentage`: 2.5%
  - `provider_fee_percentage`: 2.5%
  - `minimum_customer_fee`: 100 YER
  - `minimum_provider_fee`: 100 YER
- **calculate_fees(price)** (RPC + client display):
  - `customer_fee = max(price * 2.5%, 100)`
  - `provider_fee = max(price * 2.5%, 100)`
  - `customer_total = price + customer_fee`
  - `provider_net = price - provider_fee`
  - `mahra_revenue = customer_fee + provider_fee`
- **الخادم دائمًا يعيد الحساب** — قيم العميل للعرض فقط
- الأدمن يمكنه تعديل النسب من لوحة الإدارة

---

## 12. Refund Flow

- يحدث تلقائيًا عند `resolve_dispute` بنتيجة `resolved_customer`:
  - status → `refunded`
  - المعاملات المالية تُعكس (reversed)
- لا يوجد استرداد تلقائي عبر بوابة دفع (لعدم وجود مزود متصل)

---

## 13. Dispute Flow

1. Client يفتح نزاع: `open_dispute(p_order_id, p_reason, p_details, p_evidence)`
2. status → `disputed`, يُنشأ row في `disputes`
3. Admin يحل: `resolve_dispute(p_dispute_id, p_resolution, p_outcome)`
   - `resolved_customer` → order `refunded` (استرداد للعميل)
   - `resolved_provider` → order `completed` (تحويل للمقدم)
   - `resolved_partial` → order `completed` (تسوية جزئية)
4. الأدمن يكتب `admin_resolution` نصي
5. إشعارات تُرسل للطرفين

---

## 14. Admin Flow

لوحة `/admin` — يتطلب `is_admin = true`:

| القسم | الوصف |
|---|---|
| Dashboard | إحصائيات حية (مستخدمين، خدمات، طلبات، نزاعات) |
| Listings | موافقة/رفض/إخفاء/تمييز/حذف + إضافة/تعديل |
| Categories | إدارة التصنيفات + services_catalog |
| Cities | إدارة المدن |
| Users | بحث/تعطيل/حذف مستخدمين |
| Providers | موافقة/رفض مقدمي الخدمات |
| Orders | تغيير حالة أي طلب (admin_update_order_status) |
| Disputes | حل النزاعات (resolve_dispute) |
| Finance | إعدادات العمولة + إحصائيات مالية |
| Homepage | تعديل Hero title/description/image |
| Notifications | إرسال إشعار جماعي (send_notification_to_all) |

---

## 15. AI Flow

**لا توجد أي ميزات ذكاء اصطناعي في المشروع.** لا توجد ملفات AI، لا prompts، لا APIs للذكاء الاصطناعي، لا functions. المشروع خالٍ تمامًا من AI.

---

## 16. PWA / التطبيق

**غير متوفّر.** لا يوجد:
- manifest.json / manifest.webmanifest
- service worker
- theme-color meta tag
- splash screen
- install configuration

---

## 17. Configuration

### Environment Variables (أسماء فقط — القيم السرية مستبدلة)

```env
# Supabase
VITE_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_URL=YOUR_SUPABASE_URL_HERE
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
SUPABASE_DB_URL=YOUR_SUPABASE_DB_URL_HERE
```

### Build Configuration
- **Vite 5** + `@vitejs/plugin-react`
- `@` alias → `./src`
- `lucide-react` مستثنى من optimizeDeps
- Scripts: `dev`, `build`, `lint`, `preview`, `typecheck`

### Routing Configuration
- `BrowserRouter` في main.tsx
- جميع المسارات معرّفة في App.tsx (14 route)

### Deployment Configuration
- `dist/_redirects` للـ SPA routing
- Bolt Hosting (default) أو Netlify

### Supabase Config (config.toml)
- `[functions.api]` with `verify_jwt = false`

---

## 18. ما هو حقيقي وما هو Mock/Demo

| الميزة | حقيقي / Mock | ملاحظات |
|---|---|---|
| Authentication | **حقيقي** | Supabase Auth (email/password) |
| Profiles | **حقيقي** | + 6 demo profiles بدون auth_user_id |
| Listings | **حقيقي** | + 12 demo listings |
| Categories/Cities | **حقيقي** | + seed data |
| Search & Filters | **حقيقي** | Supabase queries |
| Orders | **حقيقي** | RPC functions + DB |
| Order lifecycle (16 states) | **حقيقي** | SECURITY DEFINER functions |
| Commission | **حقيقي** | server-side calculation |
| Wallet balances | **حقيقي** | wallet_accounts + transactions |
| Wallet hold/release | **حقيقي** | trigger-based |
| Withdrawals (DB) | **حقيقي** | request_withdrawal RPC |
| Withdrawals (UI) | **Mock/معطّل** | زر disabled "قريبًا" |
| Payment gateway | **غير متصل** | unavailablePaymentProvider |
| apply_verified_payment | **حقيقي (غير مستخدم)** | مخصّص لـ webhook مستقبلي |
| Disputes | **حقيقي** | open_dispute + resolve_dispute |
| 48h protection | **حقيقي** | confirmation_deadline + triggers |
| Chat/Messages | **حقيقي** | conversations + messages (polling) |
| Notifications | **حقيقي** | notifications table + triggers |
| Reviews | **حقيقي** | reviews table + rating |
| Favorites | **غير متوفّر** | غير موجود |
| Admin panel | **حقيقي** | جميع الأقسام تعمل |
| Restaurants/Cafes | **غير متوفّر** | لا يوجد جدول أو صفحة مستقلة |
| Jobs/Opportunities | **غير متوفّر** | غير موجود |
| AI | **غير متوفّر** | لا يوجد أي AI |
| PWA | **غير متوفّر** | لا manifest ولا service worker |
| Forgot password | **Mock** | تعرض شاشة نجاح فقط |
| Avatar upload | **شبه حقيقي** | FileReader → base64 في DB (ليس Supabase Storage) |
| Work images upload | **جزئي** | data URLs تُستبعد (كبيرة جدًا)، URLs فقط تُحفظ |
| Edge Function API | **حقيقي** | public REST API |

---

## 19. Bugs / TODOs معروفة

1. **Forgot password وهمي**: `AuthPage` mode="forgot" لا يستدعي `supabase.auth.resetPasswordForEmail` — يعرض شاشة نجاح فقط.
2. **Notifications RLS mismatch**: سياسات `notifications` تقارن `auth.uid() = user_id`، لكن `user_id` هو FK لـ `profiles(id)` وليس `auth.users.id`. الإشعارات المكتوبة بواسطة triggers (التي تستخدم profile IDs) قد لا تكون مرئية للمالك. الترحيلات اللاحقة تتجنب هذا باستخدام `current_profile_id()`.
3. **Avatar base64 في DB**: `ProfilePage` يخزّن الصور الرمزية كـ data URLs في `profiles.avatar_url` بدلاً من Supabase Storage — يمكن أن يسبب مشاكل في الأداء وحجم الصفوف.
4. **Work images تُستبعد**: `AddSkillPage` يفلتر `data:` URLs لأنها كبيرة جدًا للـDB — الصور المرفوعة فعليًا لا تُحفظ.
5. **Admin "add listing" hack**: `AdminPage` عند إضافة خدمة يعينها لأول provider في DB (`select('id').limit(1)`) — arbitrary.
6. **Edge Function uses service role key publicly**: `verify_jwt = false` + service role key + CORS `*` — كل البيانات عامة بدون per-user authz.
7. **No payment gateway**: الطلبات تُنشأ بـ `payment_status = 'pending'` ولا تكتمل دورة الدفع.
8. **No realtime**: الرسائل والإشعارات تستخدم polling (5s / 15s) بدلاً من Supabase Realtime.
9. **No Supabase Storage integration**: لا يوجد تخزين للصور — جميع الصور URLs خارجية أو base64.
10. **لا تذكيرات مجدولة**: `send_confirmation_reminders` و `expire_confirmations` و `expire_protection_periods` موجودة كـ functions لكن لا يوجد pg_cron أو scheduled edge function لاستدعائها تلقائيًا.

---

## 20. قائمة APIs (Edge Function)

| Method | Path | الوصف |
|---|---|---|
| GET | /api/categories | كل التصنيفات |
| GET | /api/services | كل خدمات services_catalog |
| GET | /api/listings | الخدمات المنشورة |
| GET | /api/listings/:id | تفاصيل خدمة + تقييمات |
| GET | /api/cities | كل المدن |
| GET | /api/commission-settings | إعدادات العمولة |
| POST | /api/calculate-fees | حساب الرسوم |
| GET | /api/stats | إحصائيات عامة |

---

## 21. قائمة Database Tables (20)

profiles, categories, services_catalog, cities, listings, listing_images, orders, reviews, homepage_settings, conversations, messages, notifications, commission_settings, disputes, wallet_accounts, wallet_transactions, payment_records, payment_methods, withdrawals, audit_logs

---

## 22. قائمة Database Functions (27)

is_admin, handle_new_user, promote_to_admin, current_profile_id, send_notification_to_all, notify_message_recipient, notify_order_provider, calculate_fees, create_order, accept_order, provider_complete_order, customer_confirm_order, open_dispute, cancel_order, resolve_dispute, expire_confirmations, update_pending_balance, send_confirmation_reminders, admin_update_order_status, admin_delete_listing, admin_toggle_user_disabled, ensure_wallet, request_withdrawal, sync_wallet_for_order, expire_protection_periods, apply_verified_payment, create_wallet_for_profile

---

## 23. قائمة Frontend Routes (14)

`/`, `/services`, `/listings/:id`, `/add-skill`, `/orders`, `/messages`, `/notifications`, `/profile`, `/wallet`, `/auth/signin`, `/auth/signup`, `/auth/forgot`, `/admin`, `/admin/:section`

---

## 24. Migrations (13)

| # | Filename | الوصف |
|---|---|---|
| 001 | 20260925105324_001_initial_schema.sql | الجداول الأساسية + RLS + functions |
| 002 | 20260925105600_002_seed_data.sql | بيانات تجريبية (مدن، تصنيفات، خدمات، providers، listings، reviews) |
| 003 | 20260928132650_003_messages.sql | المحادثات والرسائل + current_profile_id() |
| 004 | 20260929123204_004_fix_current_profile_id_permissions.sql | تقييد current_profile_id لـ authenticated |
| 005 | 20260929131612_005_notifications.sql | جدول الإشعارات + send_notification_to_all |
| 006 | 20260929131838_006_notification_triggers.sql | triggers للإشعارات (رسائل + طلبات) |
| 007 | 20260930163629_007_order_lifecycle_commission_disputes.sql | دورة حياة الطلب + العمولة + النزاعات |
| 008 | 20260930164217_008_reminder_triggers.sql | تذكيرات 24/40 ساعة + expire_confirmations |
| 009 | 20261002071208_009_security_fixes_admin_control.sql | إصلاحات أمنية + تحكم الأدمن |
| 010 | 20261002071421_010_fix_anon_execute_final.sql | إغلاق ثغرة public role EXECUTE |
| 011 | 20261003190714_011_wallet_finance_foundation.sql | المحفظة + المعاملات + الدفع + السحب + التدقيق |
| 012 | 20261003190735_012_secure_order_finance_flow.sql | إعادة كتابة order functions بـ current_profile_id() |
| 013 | 20261003191202_013_lock_wallet_trigger_function.sql | قفل create_wallet_for_profile لـ service_role |
