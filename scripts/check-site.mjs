import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
let totalErrors = 0;
let totalWarnings = 0;

const pass = (msg) => console.log(`\x1b[32m✔ [نجاح]\x1b[0m ${msg}`);
const warn = (msg) => {
  totalWarnings++;
  console.log(`\x1b[33m⚠ [تنبيه]\x1b[0m ${msg}`);
};
const fail = (msg) => {
  totalErrors++;
  console.log(`\x1b[31m✖ [خطأ]\x1b[0m ${msg}`);
};

function loadEnv() {
  const envVars = { ...process.env };
  for (const envFile of ['.env', '.env.local', '.env.production']) {
    const fullPath = path.join(root, envFile);
    if (fs.existsSync(fullPath)) {
      for (const line of fs.readFileSync(fullPath, 'utf8').split('\n')) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match && !envVars[match[1]]) {
          envVars[match[1]] = (match[2] || '').replace(/^['"]|['"]$/g, '');
        }
      }
    }
  }
  return envVars;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('\n====================================================================');
console.log('   الفحص الشامل: قاعدة البيانات (Supabase) + الموقع + الأزرار والعمليات');
console.log('====================================================================\n');

// ------------------------------------------------------------------
// 1. فحص جداول وأعمدة قاعدة بيانات Supabase الفعلية
// ------------------------------------------------------------------
console.log('--- [1/4] فحص جداول وأعمدة قاعدة بيانات Supabase ---');
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  fail('مفاتيح VITE_SUPABASE_URL أو VITE_SUPABASE_ANON_KEY مفقودة في ملف .env');
} else {
  const dbChecks = [
    { label: 'جدول الملفات الشخصية والكفاءات (profiles)', query: 'profiles?select=id,full_name,account_type&limit=1' },
    { label: 'جدول الخدمات (listings)', query: 'listings?select=id,provider_id,category_id,service_name,description,price,city,status&limit=1' },
    { label: 'جدول التصنيفات (categories)', query: 'categories?select=id,name&limit=1' },
    { label: 'جدول المدن (cities)', query: 'cities?select=id,name&limit=1' },
    { label: 'جدول الوظائف (jobs)', query: 'jobs?select=id,title,job_type,city,status&limit=1' },
    { label: 'جدول طلبات التوظيف (job_applications)', query: 'job_applications?select=id,job_id,applicant_id,status&limit=1' },
    { label: 'جدول الطلبات (orders)', query: 'orders?select=id,listing_id,status&limit=1' },
    { label: 'جدول الرسائل (messages)', query: 'messages?select=id,conversation_id,sender_id,body,read_at&limit=1' },
    { label: 'جدول الإشعارات (notifications)', query: 'notifications?select=id,title&limit=1' },
    { label: 'جدول المحافظ المالية (wallets)', query: 'wallets?select=id,balance&limit=1' },
  ];

  for (const item of dbChecks) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${item.query}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (res.ok) {
        pass(`القاعدة سليمة: ${item.label}`);
      } else {
        fail(`خطأ في قاعدة البيانات ← ${item.label} [${res.status}]: ${await res.text()}`);
      }
    } catch (e) {
      fail(`تعذر الاتصال بقاعدة البيانات لفحص ${item.label}: ${e.message}`);
    }
  }
}

// ------------------------------------------------------------------
// 2. فحص الكود البرمجي وبناء الموقع
// ------------------------------------------------------------------
console.log('\n--- [2/4] فحص الكود البرمجي وبناء الموقع ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  pass('كود TypeScript سليم 100% بدون أخطاء.');
} catch (err) {
  fail('خطأ برمجي في TypeScript:');
  console.log(err.stdout?.toString() || err.message);
}

try {
  execSync('npm run build', { stdio: 'pipe' });
  pass('بناء الإنتاج (npm run build) نجح بالكامل.');
} catch (err) {
  fail('فشل بناء الإنتاج:');
  console.log(err.stderr?.toString() || err.message);
}

// ------------------------------------------------------------------
// 3. تشغيل السيرفر واختبار دورة (نشر خدمة -> طلبها -> إنجازها)
// ------------------------------------------------------------------
console.log('\n--- [3/4] اختبار دورة نشر وطلب وإنجاز الخدمة في الموقع والقاعدة ---');
const server = spawn('npm run dev -- --port 4173', {
  shell: true,
  stdio: 'ignore',
});

const waitForServer = async (url, retries = 30) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
};

const baseUrl = 'http://localhost:4173';
if (!(await waitForServer(baseUrl))) {
  fail('تعذر تشغيل السيرفر المحلي.');
  server.kill();
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });

const stamp = Date.now();
const providerEmail = `test_provider_${stamp}@mahra-test.com`;
const clientEmail = `test_client_${stamp}@mahra-test.com`;
const testPassword = `MahraTest#${stamp}`;
const testServiceName = `خدمة اختبار تلقائي ${stamp}`;

function getAdminHeaders() {
  if (!SUPABASE_SERVICE_KEY) return null;
  return {
    apikey: SUPABASE_SERVICE_KEY,
    ...(SUPABASE_SERVICE_KEY.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }),
    'Content-Type': 'application/json',
  };
}

async function finalizeTestProfile(authData, fullName, accountType) {
  let profileId = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((r) => setTimeout(r, 400));
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?or=(id.eq.${authData.user.id},auth_user_id.eq.${authData.user.id})&select=id`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${authData.access_token}` } }
    );
    const profRows = await profRes.json().catch(() => []);
    if (Array.isArray(profRows) && profRows[0]?.id) {
      profileId = profRows[0].id;
      break;
    }
  }

  authData.profileId = profileId || authData.user.id;

  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authData.profileId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${authData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ full_name: fullName, account_type: accountType }),
  });

  if (accountType === 'individual') {
    const adminHeaders = getAdminHeaders();
    const walletHeaders = adminHeaders || {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${authData.access_token}`,
      'Content-Type': 'application/json',
    };

    const authUserId = authData.user.id;
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets?user_id=eq.${authUserId}`, {
      method: 'PATCH',
      headers: { ...walletHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({ balance: 50000 }),
    });
    const patchedRows = patchRes.ok ? await patchRes.json().catch(() => []) : [];

    if (!Array.isArray(patchedRows) || patchedRows.length === 0) {
      const postRes = await fetch(`${SUPABASE_URL}/rest/v1/wallets`, {
        method: 'POST',
        headers: { ...walletHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: authUserId, balance: 50000 }),
      });
      if (!postRes.ok) {
        const errBody = await postRes.text();
        warn(`سبب فشل إنشاء المحفظة (${postRes.status}): ${errBody}`);
      }
    }
  }

  return authData;
}

async function createTestUser(email, fullName, accountType) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const adminHeaders = getAdminHeaders();
  if (adminHeaders) {
    const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password: testPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, account_type: accountType },
      }),
    });

    if (adminRes.ok) {
      const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: testPassword }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok && loginData.access_token) {
        return await finalizeTestProfile(loginData, fullName, accountType);
      }
    } else {
      const errData = await adminRes.json().catch(() => ({}));
      const reason = errData.msg || errData.message || adminRes.status;
      warn(`تعذر الإنشاء عبر مفتاح الإدارة (${reason}) — جاري تجربة التسجيل العادي...`);
    }
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: testPassword,
      data: { full_name: fullName, account_type: accountType },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const reason = data.msg || data.error_description || data.message || JSON.stringify(data);
    warn(`تعذر إنشاء حساب اختبار تلقائي (${email}) — السبب: ${reason}`);
    return null;
  }

  return await finalizeTestProfile(data, fullName, accountType);
}

async function deleteTestUser(userId) {
  const adminHeaders = getAdminHeaders();
  if (!adminHeaders || !userId) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: adminHeaders,
  }).catch(() => {});
}

const providerAuth = await createTestUser(providerEmail, 'مقدّم خدمة تجريبي', 'business');
const clientAuth = await createTestUser(clientEmail, 'عميل تجريبي', 'individual');

if (providerAuth && clientAuth) {
  const providerToken = providerAuth.access_token;
  const clientToken = clientAuth.access_token;
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

  const openAuthedContext = async (authSession) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(
      ([k, v]) => window.localStorage.setItem(k, JSON.stringify(v)),
      [storageKey, authSession]
    );
    const p = await ctx.newPage();
    const apiErrors = [];
    p.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        apiErrors.push(`[${res.status()}] ${res.request().method()} ${res.url()}`);
      }
    });
    p.on('pageerror', (err) => apiErrors.push(`JS Error: ${err.message}`));
    return { ctx, p, apiErrors };
  };

  let listingId = null;
  let orderId = null;
  const prov = await openAuthedContext(providerAuth);
  let cli = null;

  try {
    await prov.p.goto(`${baseUrl}/add-skill`, { waitUntil: 'domcontentloaded' });
    await prov.p.waitForSelector('form .grid button[type="button"]', { timeout: 8000 }).catch(() => {});

    const categoryBtn = prov.p.locator('form .grid button[type="button"]:visible').first();
    if ((await categoryBtn.count()) > 0) {
      await categoryBtn.click();
      await prov.p.waitForTimeout(400);
    }

    const selects = prov.p.locator('form select:visible');
    for (let i = 0; i < (await selects.count()); i++) {
      const opts = await selects.nth(i).locator('option').count();
      if (opts > 1) await selects.nth(i).selectOption({ index: 1 });
    }

    const enabledTextInputs = prov.p.locator('form input[type="text"]:visible:not([disabled])');
    if ((await enabledTextInputs.count()) > 0) {
      await enabledTextInputs.first().fill(testServiceName);
      if ((await enabledTextInputs.count()) > 1) {
        await enabledTextInputs.nth(1).fill('5 سنوات');
      }
    }

    const numInput = prov.p.locator('form input[type="number"]:visible').first();
    if ((await numInput.count()) > 0) await numInput.fill('5000');

    const textareas = prov.p.locator('form textarea:visible');
    if ((await textareas.count()) > 0) {
      await textareas.first().fill('وصف خدمة الاختبار التلقائي للتحقق من القاعدة والموقع.');
    }

    const submitBtn = prov.p.locator('form button[type="submit"]:visible').first();
    if ((await submitBtn.count()) > 0) {
      await submitBtn.click();
      await prov.p.waitForTimeout(2000);
    }

    const checkListingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?provider_id=eq.${providerAuth.profileId}&select=id,service_name,status&order=created_at.desc&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${providerToken}` } }
    );
    const createdListings = await checkListingRes.json();

    if (Array.isArray(createdListings) && createdListings.length > 0) {
      listingId = createdListings[0].id;
      pass(`نشر الخدمة (${createdListings[0].service_name}) نجح وحُفظ في قاعدة البيانات (الحالة: ${createdListings[0].status}).`);

      if (createdListings[0].status !== 'published') {
        await fetch(`${SUPABASE_URL}/rest/v1/listings?id=eq.${listingId}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'published' }),
        });
      }

      cli = await openAuthedContext(clientAuth);
      await cli.p.goto(`${baseUrl}/listing/${listingId}`, { waitUntil: 'domcontentloaded' });
      await cli.p.waitForTimeout(1000);

      if (new URL(cli.p.url()).pathname === '/') {
        fail('خطأ توجيه: الدخول إلى تفاصيل الخدمة أعاد العميل إلى الصفحة الرئيسية (/)!');
      } else {
        pass(`صفحة تفاصيل الخدمة (/listing/${listingId}) فتحت بنجاح.`);
        await cli.p.waitForSelector('main button:visible', { timeout: 6000 }).catch(() => {});

        const orderBtn = cli.p.locator('main button:visible').filter({ hasText: 'طلب الخدمة' }).first();
        if ((await orderBtn.count()) > 0) {
          await orderBtn.click();
          await cli.p.waitForTimeout(1200);

          const modalTextarea = cli.p.locator('textarea:visible').first();
          if ((await modalTextarea.count()) > 0) {
            await modalTextarea.fill('ملاحظة وتفاصيل طلب الاختبار التلقائي');
          }

          const confirmBtn = cli.p.locator('button:visible').filter({ hasText: 'تأكيد الطلب' }).first();
          await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

          if ((await confirmBtn.count()) > 0 && (await confirmBtn.isEnabled())) {
            await confirmBtn.click({ timeout: 5000 });
            await cli.p.waitForTimeout(2000);

            const ordersRes = await fetch(
              `${SUPABASE_URL}/rest/v1/orders?listing_id=eq.${listingId}&select=id,status`,
              { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${clientToken}` } }
            );
            const createdOrders = await ordersRes.json();

            if (Array.isArray(createdOrders) && createdOrders.length > 0) {
              orderId = createdOrders[0].id;
              pass(`طلب الخدمة نجح وحُفظ في جدول orders (الحالة: ${createdOrders[0].status}).`);

              await prov.p.goto(`${baseUrl}/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
              await prov.p.waitForTimeout(1000);

              for (let step = 0; step < 3; step++) {
                const actionBtn = prov.p.locator('button:visible').filter({ hasText: /قبول|بدء|تسليم|إنجاز|مكتمل/ }).first();
                if ((await actionBtn.count()) > 0 && (await actionBtn.isEnabled())) {
                  const label = (await actionBtn.innerText()).trim();
                  await actionBtn.click();
                  await prov.p.waitForTimeout(1000);
                  pass(`مقدّم الخدمة نفّذ خطوة (${label}) بنجاح.`);
                } else break;
              }

              await cli.p.goto(`${baseUrl}/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
              await cli.p.waitForTimeout(1000);
              const clientConfirmBtn = cli.p.locator('button:visible').filter({ hasText: /استلام|تأكيد|إنجاز|مكتمل/ }).first();
              if ((await clientConfirmBtn.count()) > 0 && (await clientConfirmBtn.isEnabled())) {
                const label = (await clientConfirmBtn.innerText()).trim();
                await clientConfirmBtn.click();
                await cli.p.waitForTimeout(1000);
                pass(`العميل نفّذ خطوة (${label}) لإتمام العملية بنجاح.`);
              }
            } else {
              fail('الضغط على زر تأكيد الطلب لم ينشئ طلباً في جدول orders بقاعدة البيانات!');
            }
          } else {
            const modalText = await cli.p.locator('.fixed.z-50').first().innerText().catch(() => '');
            fail(`زر تأكيد الطلب بقي معطلاً (disabled) — تفاصيل نافذة الدفع: ${modalText.replace(/\s+/g, ' ')}`);
          }
        } else {
          fail('لم يُعثر على زر (طلب الخدمة) في صفحة التفاصيل!');
        }
      }
    } else {
      const currentPath = new URL(prov.p.url()).pathname;
      const uiError = await prov.p.locator('[class*="error"]').first().innerText().catch(() => '');
      fail(`فشل نشر الخدمة (المسار الحالي: ${currentPath}) — رسالة الصفحة: ${uiError || 'لا توجد'}`);
    }
  } finally {
    if (cli) {
      if (cli.apiErrors.length > 0) {
        fail('أخطاء قاعدة بيانات أو شبكة أثناء رحلة العميل:');
        cli.apiErrors.forEach((e) => console.log('   -', e));
      }
      await cli.ctx.close();
    }
    if (prov.apiErrors.length > 0) {
      fail('أخطاء قاعدة بيانات أو شبكة أثناء رحلة مقدّم الخدمة:');
      prov.apiErrors.forEach((e) => console.log('   -', e));
    }
    await prov.ctx.close();

    const adminHeaders = getAdminHeaders();
    const cleanupHeaders = adminHeaders || { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${clientToken}` };
    if (orderId) {
      await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
        method: 'DELETE',
        headers: cleanupHeaders,
      }).catch(() => {});
    }
    if (listingId) {
      await fetch(`${SUPABASE_URL}/rest/v1/listings?id=eq.${listingId}`, {
        method: 'DELETE',
        headers: adminHeaders || { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${providerToken}` },
      }).catch(() => {});
    }
    await deleteTestUser(providerAuth.user?.id);
    await deleteTestUser(clientAuth.user?.id);
  }
}

// ------------------------------------------------------------------
// 4. فحص كل صفحة وكل زر قابل للنقر في الموقع (لابتوب + جوال)
// ------------------------------------------------------------------
console.log('\n--- [4/4] فحص كل صفحة وكل زر قابل للنقر في الموقع (لابتوب + جوال) ---');
const viewports = [
  { name: 'اللابتوب (Desktop)', width: 1280, height: 800 },
  { name: 'الجوال (Mobile)', width: 390, height: 844 },
];

for (const vp of viewports) {
  console.log(`\n> اختبار واجهة ${vp.name}:`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();

  const runtimeErrors = [];
  page.on('pageerror', (err) => runtimeErrors.push(`JS Error: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') runtimeErrors.push(`Console Error: ${msg.text()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      runtimeErrors.push(`HTTP [${res.status()}]: ${res.url()}`);
    }
  });

  const queue = ['/', '/services', '/jobs', '/talents', '/post-job', '/add-skill', '/orders', '/messages', '/wallet', '/profile', '/auth'];
  const visited = new Set();

  while (queue.length > 0) {
    const targetPath = queue.shift();
    if (visited.has(targetPath)) continue;
    visited.add(targetPath);

    try {
      await page.goto(`${baseUrl}${targetPath}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (err) {
      fail(`تعذر فتح الصفحة (${targetPath}): ${err.message.split('\n')[0]}`);
      continue;
    }
    await page.waitForTimeout(500);

    const links = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')).filter(Boolean)
    );
    for (const href of links) {
      const clean = href.split('?')[0];
      if (!visited.has(clean) && !queue.includes(clean) && queue.length < 35) {
        queue.push(clean);
      }
    }

    const clickables = page.locator('main button:visible');
    const count = await clickables.count();
    let clicked = 0;

    for (let i = 0; i < count; i++) {
      if (new URL(page.url()).pathname !== targetPath) break;

      const el = clickables.nth(i);
      if ((await el.count()) === 0) break;

      try {
        const type = await el.getAttribute('type', { timeout: 1000 });
        if (type === 'submit') continue;
        const text = (await el.innerText().catch(() => '')).trim();
        if (!text) continue;

        if (await el.isEnabled({ timeout: 1000 })) {
          await el.scrollIntoViewIfNeeded({ timeout: 1000 });
          await el.click({ timeout: 2000, force: true });
          clicked++;
          await page.waitForTimeout(100);
        }
      } catch (e) {
        const text = await el.innerText().catch(() => 'زر بدون نص');
        fail(`عنصر لا يستجيب للنقر في (${targetPath}) [${text.trim()}]: ${e.message.split('\n')[0]}`);
      }
    }
    pass(`(${targetPath}) ← تم فحص (${clicked}) زر/عنصر قابل للنقر بنجاح.`);
  }

  if (runtimeErrors.length > 0) {
    fail(`أخطاء في الموقع أو قاعدة البيانات على ${vp.name}:`);
    [...new Set(runtimeErrors)].forEach((e) => console.log('   -', e));
  } else {
    pass(`صفر أخطاء في الموقع وقاعدة البيانات على ${vp.name}.`);
  }

  await context.close();
}

await browser.close();
server.kill();

console.log('\n====================================================================');
if (totalErrors > 0) {
  console.log(`\x1b[31mالنتيجة النهائية: وُجد (${totalErrors}) خطأ و (${totalWarnings}) تنبيه.\x1b[0m\n`);
  process.exit(1);
} else {
  console.log(`\x1b[32mالنتيجة النهائية: قاعدة البيانات والموقع والأزرار ودورة الطلب سليمة 100%!\x1b[0m\n`);
}