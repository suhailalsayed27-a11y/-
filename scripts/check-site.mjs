import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
function loadEnv() {
  const envVars = { ...process.env };
  for (const f of ['.env', '.env.local']) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) {
      for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (m && !envVars[m[1]]) envVars[m[1]] = (m[2] || '').replace(/^['"]|['"]$/g, '').trim();
      }
    }
  }
  return envVars;
}

const env = loadEnv();
if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.TEST_ADMIN_EMAIL || !env.TEST_ADMIN_PASSWORD) {
  console.error('❌ تأكد من وجود SUPABASE_SERVICE_ROLE_KEY و TEST_ADMIN_EMAIL و TEST_ADMIN_PASSWORD في ملف .env');
  process.exit(1);
}

const adminSb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const adminEmail = env.TEST_ADMIN_EMAIL;
const adminPass = env.TEST_ADMIN_PASSWORD;
const provEmail = `prov.${stamp}@mahrah-test.local`;
const clientEmail = `client.${stamp}@mahrah-test.local`;
const testPass = `Mahrah#${stamp}X9`;

const createdIds = { users: [], listings: [] };
let origHomepage = null;

const { data: sampleProfile } = await adminSb.from('profiles').select('account_type, city').limit(1).maybeSingle();
const defaultCity = sampleProfile?.city || 'صنعاء';
const defaultAccountType = sampleProfile?.account_type || 'client';

async function createTestUser(email, fullName, desiredType) {
  const { data, error } = await adminSb.auth.admin.createUser({
    email,
    password: testPass,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      account_type: defaultAccountType,
      city: defaultCity,
      phone: '770000000',
    },
  });
  if (error) throw error;
  const uid = data.user.id;
  createdIds.users.push(uid);

  await new Promise((r) => setTimeout(r, 300));
  const { data: profRow } = await adminSb
    .from('profiles')
    .update({
      full_name: fullName,
      account_type: desiredType,
      city: defaultCity,
      provider_status: desiredType === 'provider' ? 'pending' : 'approved',
    })
    .or(`id.eq.${uid},auth_user_id.eq.${uid}`)
    .select('id')
    .single();

  return { authId: uid, profileId: profRow?.id || uid };
}

console.log('⏳ تجهيز بيانات الاختبار المؤقتة...');
const { data: existingAdmin, error: adminFetchErr } = await adminSb
  .from('profiles')
  .select('id, auth_user_id, is_admin')
  .eq('email', adminEmail)
  .maybeSingle();

if (adminFetchErr || !existingAdmin?.is_admin) {
  throw new Error(`الحساب (${adminEmail}) غير موجود في profiles أو لا يملك صلاحية is_admin = true`);
}
// AdminPage يستخدم profile.id عند إضافة خدمة جديدة
const adminProfileId = existingAdmin.id;

const prov = await createTestUser(provEmail, 'مزود خدمة للاختبار', 'provider');
const client = await createTestUser(clientEmail, 'عميل رصيد للاختبار', 'client');

await adminSb.from('wallets').upsert({ user_id: client.profileId, balance: 25000, currency: 'YER' }, { onConflict: 'user_id' });

const { data: cat } = await adminSb.from('categories').select('id').limit(1).single();
const { data: city } = await adminSb.from('cities').select('name').limit(1).single();

const { data: lApprove } = await adminSb.from('listings').insert({
  provider_id: prov.profileId,
  category_id: cat.id,
  service_name: `خدمة اعتماد تجريبية ${stamp}`,
  city: city?.name || defaultCity,
  description: 'وصف خدمة للاختبار',
  price: 5000,
  status: 'pending',
}).select('id').single();
if (lApprove) createdIds.listings.push(lApprove.id);

const { data: lReject } = await adminSb.from('listings').insert({
  provider_id: prov.profileId,
  category_id: cat.id,
  service_name: `خدمة رفض تجريبية ${stamp}`,
  city: city?.name || defaultCity,
  description: 'وصف خدمة مرفوضة للاختبار',
  price: 4000,
  status: 'pending',
}).select('id').single();
if (lReject) createdIds.listings.push(lReject.id);

const { data: hpBackup } = await adminSb.from('homepage_settings').select('*').eq('id', 1).maybeSingle();
origHomepage = hpBackup;

const server = spawn('npm run dev -- --port 4173', { shell: true, stdio: 'ignore' });
const baseUrl = 'http://localhost:4173';
for (let i = 0; i < 30; i++) {
  try { if ((await fetch(baseUrl)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(8000);

const errors = [];
page.on('pageerror', (e) => errors.push(`JS Error: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`Console Error: ${m.text()}`); });
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) {
    errors.push(`HTTP ${r.status()} on ${r.url()}`);
  }
});

const alerts = [];
page.on('dialog', async (dialog) => {
  if (dialog.type() === 'alert') alerts.push(dialog.message());
  await dialog.accept();
});

try {
  // 1. تسجيل دخول الأدمن
  await page.goto(`${baseUrl}/auth/signin`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPass);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((u) => u.pathname === '/', { timeout: 10000 });
  console.log('✔ [1/7] تسجيل دخول المشرف بنجاح');

  // 2. فتح /admin والمرور على جميع روابط القائمة الجانبية الـ 12 داخل aside nav
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
  const navLinks = page.locator('aside nav a');
  await navLinks.first().waitFor({ state: 'visible', timeout: 10000 });

  const totalLinks = await navLinks.count();
  const visitedTabs = [];
  for (let i = 0; i < totalLinks; i++) {
    const link = navLinks.nth(i);
    const label = (await link.innerText()).trim();
    await link.click();
    await page.waitForTimeout(500);
    // التحقق من ظهور عنوان القسم في الهيدر
    await page.locator('header h1', { hasText: label }).waitFor({ state: 'visible' });
    visitedTabs.push(label);
  }
  console.log(`✔ [2/7] تم فحص جميع الأقسام الـ (${visitedTabs.length}): [${visitedTabs.join(' | ')}]`);

  // 3. اختبار قسم الخدمات (الموافقة عبر RPC + الرفض مع سبب عبر RPC + إضافة خدمة)
  await page.locator('aside nav a[href="/admin/listings"]').click();
  await page.waitForTimeout(600);

  // الموافقة على الخدمة الأولى
  const approveCard = page.locator('div.card', { hasText: `خدمة اعتماد تجريبية ${stamp}` });
  await approveCard.locator('button', { hasText: 'موافقة' }).click();
  await page.waitForTimeout(800);

  const { data: approvedCheck } = await adminSb.from('listings').select('status').eq('id', lApprove.id).single();
  if (approvedCheck?.status !== 'published') {
    throw new Error(`فشل اعتماد الخدمة عبر admin_approve_service (الحالة: ${approvedCheck?.status})`);
  }

  // رفض الخدمة الثانية مع السبب
  const rejectCard = page.locator('div.card', { hasText: `خدمة رفض تجريبية ${stamp}` });
  await rejectCard.locator('button', { hasText: 'رفض' }).click();
  const rejectModal = page.locator('div.fixed.inset-0.z-50');
  await rejectModal.locator('textarea').fill('سبب رفض تجريبي للتأكد من عمل دالة RPC');
  await rejectModal.locator('button', { hasText: 'تأكيد الرفض وإرسال الرسالة' }).click();
  await page.waitForTimeout(800);

  const { data: rejectedCheck } = await adminSb.from('listings').select('status, rejection_reason').eq('id', lReject.id).single();
  if (rejectedCheck?.status !== 'rejected') {
    throw new Error(`فشل رفض الخدمة عبر admin_reject_service (الحالة: ${rejectedCheck?.status})`);
  }

  // إضافة خدمة جديدة من لوحة الأدمن والتأكد من ارتباطها بـ profile.id للأدمن الحالي
  await page.locator('button', { hasText: 'إضافة خدمة' }).click();
  const addModal = page.locator('div.fixed.inset-0.z-50');
  const addedTitle = `خدمة مضافة من الأدمن ${stamp}`;
  await addModal.locator('input[type="text"]').first().fill(addedTitle);
  await addModal.locator('select').first().selectOption(cat.id);
  await addModal.locator('input[type="number"]').fill('9000');
  await addModal.locator('button', { hasText: 'حفظ' }).click();
  await page.waitForTimeout(900);

  const { data: addedListing } = await adminSb.from('listings').select('id, provider_id').eq('service_name', addedTitle).maybeSingle();
  if (!addedListing || addedListing.provider_id !== adminProfileId) {
    throw new Error('الخدمة المضافة من لوحة الأدمن لم تُربط بحساب الأدمن الحالي!');
  }
  createdIds.listings.push(addedListing.id);
  console.log('✔ [3/7] نجاح اعتماد ورفض الخدمات عبر RPC + إضافة خدمة مرتبطة بحساب الأدمن');

  // 4. اختبار قسم المستخدمين (حماية حساب الأدمن الحالي + مطابقة رصيد المحفظة)
  await page.locator('aside nav a[href="/admin/users"]').click();
  await page.waitForTimeout(600);

  const adminRow = page.locator('tr', { hasText: adminEmail });
  const selfProtected = await adminRow.locator('text=حسابك الحالي').isVisible();
  if (!selfProtected) throw new Error('لم يظهر نص "حسابك الحالي" لحماية حساب الأدمن');

  const clientRow = page.locator('tr', { hasText: clientEmail });
  const clientRowText = await clientRow.innerText();
  if (!clientRowText.includes('25')) throw new Error('لم يظهر رصيد محفظة العميل (25,000) في جدول المستخدمين');
  console.log('✔ [4/7] نجاح حماية حساب الأدمن الحالي + مطابقة رصيد المحفظة في جدول المستخدمين');

  // 5. اختبار قسم المالية والمحافظ
  await page.locator('aside nav a[href="/admin/finance"]').click();
  await page.waitForTimeout(600);
  await page.locator('button', { hasText: 'محافظ المستخدمين' }).click();
  await page.waitForTimeout(400);
  const walletTableText = await page.locator('table').innerText();
  if (!walletTableText.includes('عميل رصيد للاختبار')) throw new Error('اسم صاحب المحفظة لم يظهر في جدول المحافظ');
  await page.locator('button', { hasText: 'سجل المعاملات' }).click();
  await page.waitForTimeout(300);
  console.log('✔ [5/7] نجاح فحص المالية والمحافظ ومطابقة أسماء أصحاب المحافظ');

  // 6. اختبار حفظ إعدادات الصفحة الرئيسية (upsert)
  await page.locator('aside nav a[href="/admin/homepage"]').click();
  await page.waitForTimeout(500);
  const testHeroTitle = `عنوان اختباري ${stamp}`;
  await page.locator('main input[type="text"]').first().fill(testHeroTitle);
  await page.locator('main button', { hasText: 'حفظ التغييرات' }).click();
  await page.waitForTimeout(800);
  const { data: hpUpdated } = await adminSb.from('homepage_settings').select('hero_title').eq('id', 1).single();
  if (hpUpdated?.hero_title !== testHeroTitle) throw new Error('فشل حفظ إعدادات الصفحة الرئيسية عبر upsert');
  console.log('✔ [6/7] نجاح حفظ إعدادات الصفحة الرئيسية عبر upsert');

  // 7. فحص تجاوب لوحة الأدمن على الجوال + فتح القائمة الجانبية
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  if (overflow) errors.push('يوجد تجاوز عرضي (Horizontal Overflow) على شاشة الجوال');
  await page.locator('header button').first().click();
  await page.waitForTimeout(300);
  console.log('✔ [7/7] نجاح فحص التجاوب على شاشة الجوال (390x844)');

  console.log('\n====================================');
  console.log(`التنبيهات غير المتوقعة: ${alerts.length}`);
  if (alerts.length) console.log(alerts.join('\n'));
  console.log(`إجمالي الأخطاء المكتشفة: ${errors.length}`);
  if (errors.length) console.log(errors.join('\n'));
  else console.log('🎉 جميع اختبارات لوحة الأدمن نجحت بنسبة 100%!');
  console.log('====================================');
} finally {
  await browser.close();
  server.kill();

  if (origHomepage) {
    await adminSb.from('homepage_settings').upsert(origHomepage, { onConflict: 'id' });
  }
  for (const lid of createdIds.listings) {
    await adminSb.from('listings').delete().eq('id', lid);
  }
  for (const uid of createdIds.users) {
    await adminSb.from('notifications').delete().eq('user_id', uid);
    await adminSb.from('wallets').delete().eq('user_id', uid);
    await adminSb.from('profiles').delete().or(`id.eq.${uid},auth_user_id.eq.${uid}`);
    await adminSb.auth.admin.deleteUser(uid);
  }
}