import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

/**
 * Xác thực yêu cầu từ Cron hoặc Admin Panel.
 * Chấp nhận:
 * 1. Token Bearer khớp với CRON_SECRET (chỉ cho phép dùng "local-test-trigger" ở môi trường local).
 * 2. Token Bearer là Supabase Auth JWT hợp lệ của người dùng có quyền 'admin'.
 */
export async function verifyCronOrAdminAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.substring(7); // Loại bỏ tiền tố "Bearer "
  const cronSecret = process.env.CRON_SECRET;

  // 1. Kiểm tra nếu token trùng khớp với CRON_SECRET
  // Trong môi trường production, nếu CRON_SECRET rỗng sẽ không cho phép dùng fallback.
  const expectedSecret = cronSecret || (process.env.NODE_ENV === "production" ? null : "local-test-trigger");
  if (expectedSecret && token === expectedSecret) {
    return true;
  }

  // 2. Kiểm tra nếu token là Supabase Auth JWT của tài khoản Admin
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Xác minh JWT token và lấy thông tin người dùng từ Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return false;
    }

    // Truy vấn thông tin người dùng trong bảng profiles để kiểm tra quyền admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return false;
    }

    return true;
  } catch (err) {
    console.error("Lỗi khi xác thực quyền Admin từ token:", err);
    return false;
  }
}
