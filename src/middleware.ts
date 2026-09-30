import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Bỏ qua kiểm tra cho các tệp tĩnh, API, hình ảnh, favicon và trang thông báo bị chặn (blocked)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/blocked"
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // 1. Kiểm tra IP Blacklist trước tiên
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
                   request.headers.get("x-real-ip") || 
                   "127.0.0.1";

  try {
    const ipCheckRes = await fetch(
      `${supabaseUrl}/rest/v1/ip_blacklist?ip=eq.${encodeURIComponent(clientIp)}&select=ip,expires_at`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        },
        next: { revalidate: 30 } // Cache 30 giây để tránh làm quá tải Supabase
      }
    );

    if (ipCheckRes.ok) {
      const blacklistData = await ipCheckRes.json();
      if (blacklistData && blacklistData.length > 0) {
        const block = blacklistData[0];
        const expiresAt = block.expires_at ? new Date(block.expires_at) : null;

        // Nếu chặn vĩnh viễn (expiresAt là null) hoặc chưa hết hạn chặn
        if (!expiresAt || expiresAt > new Date()) {
          const url = request.nextUrl.clone();
          url.pathname = "/blocked";
          return NextResponse.redirect(url);
        }
      }
    }
  } catch (err) {
    console.error("Lỗi kiểm tra IP Blacklist trong middleware:", err);
  }

  // 2. Kiểm tra chế độ bảo trì (Không áp dụng cho trang Admin và trang bảo trì chính nó)
  if (pathname.startsWith("/admin") || pathname === "/maintenance") {
    return NextResponse.next();
  }

  try {
    // Gọi Supabase REST API trực tiếp bằng fetch tương thích Edge Runtime
    const res = await fetch(`${supabaseUrl}/rest/v1/global_settings?id=eq.site_settings&select=config`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      },
      next: { revalidate: 30 } // Cache ngắn 30s tránh gọi database liên tục
    });

    if (res.ok) {
      const data = await res.json();
      const config = data?.[0]?.config;
      
      // Nếu chế độ bảo trì đang bật
      if (config && config.maintenanceMode === true) {
        const url = request.nextUrl.clone();
        url.pathname = "/maintenance";
        return NextResponse.redirect(url);
      }
    }
  } catch (err) {
    console.error("Lỗi kiểm tra bảo trì trong middleware:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Chạy middleware trên tất cả các trang, ngoại trừ tài nguyên tĩnh
    "/((?!_next/static|_next/image|favicon.ico|images).*)",
  ],
};
