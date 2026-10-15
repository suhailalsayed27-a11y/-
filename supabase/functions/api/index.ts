import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface RouteHandler {
  pattern: RegExp;
  handler: (req: Request, match: RegExpMatchArray) => Promise<Response>;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ============ Route Handlers ============

async function getCategories(): Promise<Response> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon_name, sort_order")
    .order("sort_order");
  if (error) return errorResponse("حدث خطأ، حاول مرة أخرى.", 500);
  return jsonResponse({ data });
}

async function getServices(): Promise<Response> {
  const { data, error } = await supabase
    .from("services_catalog")
    .select("id, category_id, name, sort_order")
    .order("sort_order");
  if (error) return errorResponse("حدث خطأ، حاول مرة أخرى.", 500);
  return jsonResponse({ data });
}

async function getListings(): Promise<Response> {
  const { data, error } = await supabase
    .from("listings")
    .select(`
      id, service_name, description, price, experience, city,
      status, featured, rating, rating_count,
      category:categories(id, name),
      provider:profiles(id, full_name, avatar_url, city, provider_verified)
    `)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("rating", { ascending: false });
  if (error) return errorResponse("حدث خطأ، حاول مرة أخرى.", 500);
  return jsonResponse({ data });
}

async function getListingById(match: RegExpMatchArray): Promise<Response> {
  const id = match[1];
  const { data, error } = await supabase
    .from("listings")
    .select(`
      id, service_name, description, price, experience, city,
      status, featured, rating, rating_count, created_at,
      category:categories(id, name),
      provider:profiles(id, full_name, avatar_url, city, provider_verified, bio),
      images:listing_images(id, image_url, sort_order)
    `)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) return errorResponse("حدث خطأ، حاول مرة أخرى.", 500);
  if (!data) return errorResponse("الخدمة غير موجودة", 404);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, client_name, rating, comment, created_at")
    .eq("listing_id", id)
    .order("created_at", { ascending: false });

  return jsonResponse({ data: { ...data, reviews: reviews || [] } });
}

async function getListingReviews(match: RegExpMatchArray): Promise<Response> {
  const id = match[1];
  const { data, error } = await supabase
    .from("reviews")
    .select("id, client_name, rating, comment, created_at")
    .eq("listing_id", id)
    .order("created_at", { ascending: false });
  if (error) return errorResponse("حدث خطأ، حاول مرة أخرى.", 500);
  return jsonResponse({ data });
}

async function getCities(): Promise<Response> {
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, sort_order")
    .order("sort_order");
  if (error) return errorResponse("حدث خطأ، حاول مرة أخرى.", 500);
  return jsonResponse({ data });
}

async function getCommissionSettings(): Promise<Response> {
  const { data, error } = await supabase
    .from("commission_settings")
    .select("customer_fee_percentage, provider_fee_percentage, minimum_customer_fee, minimum_provider_fee, currency, confirmation_window_hours")
    .eq("id", 1)
    .maybeSingle();
  if (error) return errorResponse("حدث خطأ، حاول مرة أخرى.", 500);
  return jsonResponse({ data });
}

async function calculateFees(req: Request): Promise<Response> {
  let body: { price?: number };
  try {
    body = await req.json();
  } catch {
    return errorResponse("صيغة البيانات غير صحيحة", 400);
  }
  const price = Number(body.price);
  if (!price || price <= 0) return errorResponse("السعر غير صحيح", 400);

  const { data, error } = await supabase.rpc("calculate_fees", { p_price: price });
  if (error) return errorResponse("حدث خطأ في حساب الرسوم", 500);
  return jsonResponse({ data });
}

async function getStats(): Promise<Response> {
  const [listingsRes, providersRes, ordersRes] = await Promise.all([
    supabase.from("listings").select("id, price, status").eq("status", "published"),
    supabase.from("profiles").select("id").neq("account_type", "client"),
    supabase.from("orders").select("id, status, service_price, mahra_revenue"),
  ]);

  const listings = listingsRes.data || [];
  const orders = ordersRes.data || [];

  const totalListings = listings.length;
  const totalProviders = providersRes.data?.length || 0;
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o: { status: string }) => o.status === "completed").length;
  const totalValue = listings.reduce((s: number, l: { price: number }) => s + Number(l.price), 0);
  const mahraRevenue = orders.reduce((s: number, o: { mahra_revenue: number }) => s + Number(o.mahra_revenue), 0);

  return jsonResponse({
    data: {
      total_listings: totalListings,
      total_providers: totalProviders,
      total_orders: totalOrders,
      completed_orders: completedOrders,
      total_listings_value: totalValue,
      mahra_revenue: mahraRevenue,
    },
  });
}

// ============ Route Table ============

const routes: RouteHandler[] = [
  { pattern: /^\/api\/categories$/, handler: getCategories },
  { pattern: /^\/api\/services$/, handler: getServices },
  { pattern: /^\/api\/listings$/, handler: getListings },
  { pattern: /^\/api\/listings\/([^/]+)$/, handler: getListingById },
  { pattern: /^\/api\/listings\/([^/]+)\/reviews$/, handler: getListingReviews },
  { pattern: /^\/api\/cities$/, handler: getCities },
  { pattern: /^\/api\/commission-settings$/, handler: getCommissionSettings },
  { pattern: /^\/api\/calculate-fees$/, handler: calculateFees },
  { pattern: /^\/api\/stats$/, handler: getStats },
];

// ============ Main Handler ============

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Remove the /functions/v1/api prefix if present
    const cleanPath = path.replace(/^\/functions\/v1\/api/, "/api");

    for (const route of routes) {
      const match = cleanPath.match(route.pattern);
      if (match) {
        return await route.handler(req, match);
      }
    }

    return errorResponse("المسار غير موجود", 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
    return errorResponse(message, 500);
  }
});
