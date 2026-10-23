import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const tokenCookie = "spare_go_admin_token";

function isAllowedRoute(path: string[], method: string): boolean {
  const key = path.join("/");
  const isObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);

  if (key === "auth/login") return method === "POST";
  if (key === "auth/logout") return method === "POST" || method === "GET";
  if (key === "auth/me") return method === "GET";

  if (key === "admin/approvals/pending-counts") return method === "GET";
  if (key === "admin/config" || key === "public/config") return method === "GET";
  if (key === "admin/audit-logs") return method === "GET";
  if (key === "admin/customers") return method === "GET";
  if (key === "admin/craftsmen") return method === "GET" || method === "POST";
  if (key === "admin/vendors") return method === "GET" || method === "POST";
  if (key === "admin/orders") return method === "GET";
  if (key === "admin/tickets") return method === "GET";
  if (key === "admin/ledger") return method === "GET";

  // Payment methods
  if (key === "admin/payment-methods") return method === "GET" || method === "POST";
  if (path.length === 3 && path[0] === "admin" && path[1] === "payment-methods" && isObjectId(path[2])) {
    return ["GET", "PATCH", "DELETE"].includes(method);
  }

  // Top-ups
  if (key === "admin/topups") return method === "GET";
  if (path.length === 4 && path[0] === "admin" && path[1] === "topups" && isObjectId(path[2])) {
    const action = path[3];
    if (action === "proof") return method === "GET";
    if (action === "approve" || action === "reject") return method === "POST";
  }

  // Withdrawals
  if (key === "admin/withdrawals") return method === "GET";
  if (path.length === 4 && path[0] === "admin" && path[1] === "withdrawals" && isObjectId(path[2])) {
    const action = path[3];
    if (action === "pay" || action === "reject") return method === "POST";
  }

  // Wallets
  if (key === "admin/wallets") return method === "GET";
  if (path.length === 3 && path[0] === "admin" && path[1] === "wallets" && isObjectId(path[2])) {
    return method === "GET";
  }
  if (
    path.length === 4 &&
    path[0] === "admin" &&
    path[1] === "wallets" &&
    isObjectId(path[2]) &&
    path[3] === "adjust"
  ) {
    return method === "POST";
  }

  // Reconciliation
  if (key === "admin/wallet/reconciliation") return method === "GET";
  if (key === "admin/wallet/reconciliation/run") return method === "POST";

  if (key === "admin/settlements/vendors" || key === "admin/settlements/craftsmen") {
    return method === "POST";
  }

  // Settings
  if (key === "admin/settings") return method === "GET" || method === "PATCH";
  if (key === "admin/settings/simulate") return method === "POST";
  if (key === "admin/settings/history") return method === "GET";
  if (
    path.length === 5 &&
    path[0] === "admin" &&
    path[1] === "settings" &&
    path[2] === "history" &&
    isObjectId(path[3]) &&
    path[4] === "revert"
  ) {
    return method === "POST";
  }
  if (
    path.length === 4 &&
    path[0] === "admin" &&
    path[1] === "settings" &&
    path[3] === "reset"
  ) {
    return method === "POST";
  }

  // Part Requests
  if (key === "admin/part-requests") return method === "GET";
  if (
    path.length === 3 &&
    path[0] === "admin" &&
    path[1] === "part-requests" &&
    isObjectId(path[2])
  ) {
    return method === "PATCH";
  }

  // Parameterized routes (craftsmen / vendors / tickets / orders)
  if (path.length === 4 && path[0] === "admin") {
    const resource = path[1];
    const id = path[2];
    const action = path[3];

    if (!isObjectId(id)) return false;

    if (resource === "craftsmen" && action === "status") return method === "PATCH";
    if (resource === "craftsmen" && action === "commission") return method === "PATCH";
    if (resource === "craftsmen" && action === "reset-password") return method === "PATCH";
    if (resource === "vendors" && action === "status") return method === "PATCH";
    if (resource === "vendors" && action === "commission") return method === "PATCH";
    if (resource === "vendors" && action === "reset-password") return method === "PATCH";
    if (resource === "tickets" && action === "resolve") return method === "PATCH";
    if (resource === "orders" && action === "deposit") return method === "PATCH";
    if (
      resource === "orders" &&
      ["cancel", "reassign", "unlock-completion", "notes"].includes(action)
    ) {
      return method === "POST";
    }
  }

  // admin/orders/:id
  if (path.length === 3 && path[0] === "admin" && path[1] === "orders" && isObjectId(path[2])) {
    return method === "GET";
  }

  return false;
}

async function proxyRequest(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const method = request.method.toUpperCase();
  const pathKey = path.join("/");
  const cookieStore = await cookies();

  if (pathKey === "auth/logout" && (method === "POST" || method === "GET")) {
    cookieStore.delete(tokenCookie);
    if (method === "GET") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.json({ message: "تم تسجيل الخروج بنجاح" });
  }

  if (!isAllowedRoute(path, method)) {
    return NextResponse.json({ message: "المسار غير متاح أو غير مصرح به للإدارة" }, { status: 404 });
  }

  const isPublicAuth = pathKey === "auth/login";
  const token = cookieStore.get(tokenCookie)?.value;

  if (!isPublicAuth && !token) {
    return NextResponse.json({ message: "يرجى تسجيل الدخول كمدير نظام" }, { status: 401 });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const targetUrl = new URL(
    `/${path.map((segment) => encodeURIComponent(segment)).join("/")}`,
    apiBaseUrl,
  );
  targetUrl.search = new URL(request.url).search;

  const isBinaryEndpoint =
    pathKey === "admin/wallet/reconciliation" ||
    (path.length === 4 && path[0] === "admin" && path[1] === "topups" && path[3] === "proof");

  const headers = new Headers();
  if (isBinaryEndpoint) {
    headers.set("Accept", "*/*");
  } else {
    headers.set("Accept", "application/json");
  }
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (method === "GET" || method === "HEAD") {
    body = undefined;
  } else {
    body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "تعذر الاتصال بخادم سبير جو المركزي" },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }
  const contentDisposition = upstream.headers.get("content-disposition");
  if (contentDisposition) {
    responseHeaders.set("content-disposition", contentDisposition);
  }
  responseHeaders.set("cache-control", "no-store");

  const isBinaryResponse =
    upstreamContentType &&
    (upstreamContentType.startsWith("image/") ||
      upstreamContentType.includes("pdf") ||
      upstreamContentType.includes("csv") ||
      upstreamContentType.includes("octet-stream"));

  let responseBody: BodyInit;
  if (isBinaryResponse) {
    responseBody = await upstream.arrayBuffer();
  } else {
    const responseText = await upstream.text();
    responseBody = responseText;

    if (upstream.ok && pathKey === "auth/login") {
      try {
        const payload = JSON.parse(responseText) as {
          access_token?: string;
          user?: { role?: string };
          [key: string]: unknown;
        };

        if (payload.user?.role !== "admin") {
          return NextResponse.json(
            { message: "غير مصرح لك بالدخول، هذه البوابة للإدارة فقط" },
            { status: 403 },
          );
        }

        if (payload.access_token) {
          cookieStore.set(tokenCookie, payload.access_token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 7 * 24 * 60 * 60, // 7 days
          });
        }
        delete payload.access_token;
        responseBody = JSON.stringify(payload);
      } catch {
        return NextResponse.json(
          { message: "استجابة غير صالحة من خادم المصادقة" },
          { status: 502 },
        );
      }
    }
  }

  if (upstream.status === 401 && token) {
    cookieStore.delete(tokenCookie);
  }

  return new Response(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
