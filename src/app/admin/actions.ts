"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { sendMail } from "@/lib/mail";
import { headers } from "next/headers";

/**
 * Server Action: Xác thực quyền quản trị viên (Admin) và thực hiện gọi Cron API đồng bộ Visa Bulletin.
 * Giải pháp này giúp bảo mật CRON_SECRET, không để lộ khóa bí mật này ra client-side.
 */
export async function syncBulletinAction(token: string) {
  // 1. Xác thực người dùng bằng Supabase JWT Token được truyền từ client
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò trong bảng profiles
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên để thực hiện thao tác này.");
  }

  // 3. Lấy thông tin cấu hình từ biến môi trường phía server
  const cronSecret = process.env.CRON_SECRET || "local-test-trigger";
  // Fallback sang localhost nếu chưa định nghĩa URL trang web
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // 4. Thực hiện POST request đến endpoint API Cron kèm Header Authorization bảo mật
  const response = await fetch(`${siteUrl}/api/cron/bulletin`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cronSecret}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: "Lỗi đồng bộ không rõ nguyên nhân" }));
    throw new Error(errData.error || `Lỗi HTTP: ${response.status}`);
  }

  return await response.json();
}

/**
 * Server Action: Xác thực quyền quản trị viên (Admin) và phát hành bản tin Newsletter hàng loạt.
 */
export async function sendNewsletterAction(token: string, articleId: string, subject: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên để thực hiện thao tác này.");
  }

  // 3. Lấy cấu hình từ môi trường
  const cronSecret = process.env.CRON_SECRET || "local-test-trigger";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // 4. Gọi API phát hành bản tin kèm Header Authorization bảo mật
  const response = await fetch(`${siteUrl}/api/cron/newsletter`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cronSecret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ articleId, subject }),
    cache: "no-store"
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: "Lỗi phát bản tin không rõ nguyên nhân" }));
    throw new Error(errData.error || `Lỗi HTTP: ${response.status}`);
  }

  return await response.json();
}

/**
 * Server Action: Lấy cấu hình email từ database (đã che mờ mật khẩu/key)
 */
export async function getEmailConfigAction(token: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // 3. Tải cấu hình từ database
  const { data, error: fetchError } = await supabaseAdmin
    .from("global_settings")
    .select("config")
    .eq("id", "email_config")
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Lỗi tải cấu hình: ${fetchError.message}`);
  }

  const config = (data?.config as any) || {
    provider: "smtp",
    smtpHost: "",
    smtpPort: "465",
    smtpSecure: true,
    smtpUser: "",
    smtpPass: "",
    resendApiKey: "",
    resendFrom: "onboarding@resend.dev"
  };

  // Che mờ mật khẩu và API key trước khi trả về client
  const maskedConfig = { ...config };
  if (maskedConfig.smtpPass) {
    maskedConfig.smtpPass = "••••••••";
  }
  if (maskedConfig.resendApiKey) {
    maskedConfig.resendApiKey = "••••••••";
  }

  return maskedConfig;
}

/**
 * Server Action: Lưu cấu hình email vào database
 */
export async function saveEmailConfigAction(token: string, newConfig: any) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // 3. Lấy cấu hình cũ để kiểm tra mật khẩu/key có bị che mờ không
  const { data: existingData } = await supabaseAdmin
    .from("global_settings")
    .select("config")
    .eq("id", "email_config")
    .maybeSingle();

  const existingConfig = (existingData?.config as any) || {};

  // Xử lý các trường nhạy cảm nếu người dùng gửi dạng che mờ (nghĩa là họ không sửa đổi trường này)
  const smtpPass = newConfig.smtpPass === "••••••••" ? existingConfig.smtpPass : newConfig.smtpPass;
  const resendApiKey = newConfig.resendApiKey === "••••••••" ? existingConfig.resendApiKey : newConfig.resendApiKey;

  const finalConfig = {
    provider: newConfig.provider || "smtp",
    smtpHost: newConfig.smtpHost || "",
    smtpPort: newConfig.smtpPort || "465",
    smtpSecure: newConfig.smtpSecure === true || newConfig.smtpSecure === "true",
    smtpUser: newConfig.smtpUser || "",
    smtpPass: smtpPass || "",
    resendApiKey: resendApiKey || "",
    resendFrom: newConfig.resendFrom || "onboarding@resend.dev"
  };

  // 4. Lưu (Upsert) vào database
  const { error: saveError } = await supabaseAdmin
    .from("global_settings")
    .upsert({
      id: "email_config",
      config: finalConfig,
      updated_at: new Date().toISOString()
    });

  if (saveError) {
    throw new Error(`Lỗi lưu cấu hình: ${saveError.message}`);
  }

  return { success: true };
}

/**
 * Server Action: Gửi email thử nghiệm
 */
export async function sendTestEmailAction(token: string, toEmail: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  if (!toEmail || !toEmail.includes("@")) {
    throw new Error("Email nhận không hợp lệ.");
  }

  // 3. Tiến hành gửi email test
  try {
    const result = await sendMail({
      to: toEmail,
      subject: "[VisaTracker] Thử nghiệm cấu hình Email thành công!",
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f2f2f3; color: #18181b;">
          <div style="background-color: #ffffff; border: 1px solid #18181b; border-radius: 16px; padding: 30px; box-shadow: 4px 4px 0px #18181b; max-width: 600px; margin: 0 auto;">
            <span style="background-color: #2170e4; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase;">Kiểm thử hệ thống</span>
            <h1 style="color: #18181b; margin-top: 15px; font-size: 20px; border-bottom: 1px solid #18181b; padding-bottom: 10px;">Cấu hình hoạt động hoàn hảo!</h1>
            
            <div style="color: #333333; line-height: 1.6; font-size: 14px; margin: 20px 0;">
              <p>Xin chào Admin,</p>
              <p>Bạn vừa thực hiện kích hoạt gửi email thử nghiệm từ giao diện quản trị <strong>VisaTracker</strong>.</p>
              <p>Email này xác nhận rằng cài đặt email của bạn đã kết nối thành công và có thể hoạt động chính thức trên môi trường VPS.</p>
              <div style="background-color: #f9f9fa; border-left: 4px solid #2170e4; padding: 15px; border-radius: 4px; margin: 15px 0;">
                <strong>Trạng thái:</strong> Thành công <br />
                <strong>Thời gian gửi:</strong> ${new Date().toLocaleString("vi-VN")}
              </div>
            </div>

            <hr style="border: 0; border-top: 1px solid #18181b; margin: 25px 0;" />
            <p style="font-size: 11px; color: #888; text-align: center;">
              VisaTracker Admin Tool. Vui lòng không trả lời thư này.
            </p>
          </div>
        </div>
      `
    });

    return { success: true, provider: result.provider, messageId: result.id };
  } catch (err: any) {
    throw new Error(`Gửi email test thất bại: ${err.message}`);
  }
}

/**
 * Server Action: Bật/Tắt trạng thái hoạt động (khóa/mở khóa) của thành viên
 */
export async function toggleUserStatusAction(token: string, userId: string, newStatus: "active" | "inactive") {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  if (user.id === userId) {
    throw new Error("Không thể tự khóa tài khoản quản trị của chính bạn.");
  }

  // 3. Cập nhật trạng thái
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ status: newStatus })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Lỗi cập nhật trạng thái: ${updateError.message}`);
  }

  return { success: true };
}

/**
 * Server Action: Ghi đè hoặc thêm mới ngày Visa Bulletin thủ công
 */
export async function saveBulletinOverrideAction(
  token: string,
  month: string,
  category: string,
  chargeability: string,
  finalActionDate: string,
  filingDate: string
) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // Validations
  if (!month || !category || !chargeability || !finalActionDate || !filingDate) {
    throw new Error("Thiếu thông tin trường bắt buộc.");
  }

  // Xóa bản ghi cũ nếu có để tránh trùng lặp
  const { error: deleteError } = await supabaseAdmin
    .from("bulletins")
    .delete()
    .eq("month", month)
    .eq("category", category)
    .eq("chargeability", chargeability);

  if (deleteError) {
    console.error("Lỗi xóa bản ghi cũ:", deleteError);
  }

  // Thêm bản ghi mới
  const { error: insertError } = await supabaseAdmin
    .from("bulletins")
    .insert({
      month,
      category,
      chargeability,
      final_action_date: finalActionDate,
      filing_date: filingDate
    });

  if (insertError) {
    throw new Error(`Lỗi ghi đè dữ liệu Bulletin: ${insertError.message}`);
  }

  return { success: true };
}

/**
 * Server Action: Tạo bài viết hướng dẫn mới
 */
export async function createArticleAction(
  token: string,
  data: { 
    title: string; 
    slug: string; 
    content: string; 
    drip_day: number | null;
    seo_description: string | null;
    seo_keyword: string | null;
  }
) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // Validations
  if (!data.title || !data.slug || !data.content) {
    throw new Error("Vui lòng điền đầy đủ tiêu đề, slug và nội dung bài viết.");
  }

  // 3. Thêm bản ghi mới vào table articles
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("articles")
    .insert({
      title: data.title,
      slug: data.slug,
      content: data.content,
      drip_day: data.drip_day,
      seo_description: data.seo_description,
      seo_keyword: data.seo_keyword
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Lỗi thêm bài viết: ${insertError.message}`);
  }

  return { success: true, article: inserted };
}

/**
 * Server Action: Cập nhật bài viết hướng dẫn
 */
export async function updateArticleAction(
  token: string,
  id: string,
  data: { 
    title: string; 
    slug: string; 
    content: string; 
    drip_day: number | null;
    seo_description: string | null;
    seo_keyword: string | null;
  }
) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // Validations
  if (!data.title || !data.slug || !data.content) {
    throw new Error("Vui lòng điền đầy đủ tiêu đề, slug và nội dung bài viết.");
  }

  // 3. Cập nhật bản ghi trong table articles
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("articles")
    .update({
      title: data.title,
      slug: data.slug,
      content: data.content,
      drip_day: data.drip_day,
      seo_description: data.seo_description,
      seo_keyword: data.seo_keyword
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Lỗi cập nhật bài viết: ${updateError.message}`);
  }

  return { success: true, article: updated };
}

/**
 * Server Action: Xóa bài viết hướng dẫn
 */
export async function deleteArticleAction(token: string, id: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // 3. Xóa bản ghi trong table articles
  const { error: deleteError } = await supabaseAdmin
    .from("articles")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw new Error(`Lỗi xóa bài viết: ${deleteError.message}`);
  }

  return { success: true };
}

/**
 * Server Action: Thay đổi vai trò (role) của người dùng giữa admin và user
 */
export async function toggleUserRoleAction(token: string, userId: string, currentRole: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin của tài khoản gửi lệnh
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  if (user.id === userId) {
    throw new Error("Không thể tự đổi quyền quản trị của chính bạn.");
  }

  const newRole = currentRole === "admin" ? "user" : "admin";

  // 3. Cập nhật vai trò
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Lỗi cập nhật phân quyền: ${updateError.message}`);
  }

  return { success: true };
}

/**
 * Server Action: Xóa thành viên hoàn toàn khỏi hệ thống (cả Auth và Database Profiles)
 */
export async function deleteUserAction(token: string, userId: string) {
  // 1. Xác thực người dùng gửi lệnh
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin của tài khoản gửi lệnh
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  if (user.id === userId) {
    throw new Error("Không thể tự xóa tài khoản quản trị của chính bạn.");
  }

  // 3. Xóa dữ liệu của người dùng trong các bảng phụ (để tránh lỗi khóa ngoại nếu không được cascade delete)
  // Xóa các hàng trong bảng user_cases trước
  try {
    await supabaseAdmin
      .from("user_cases")
      .delete()
      .eq("user_id", userId);
  } catch (dbErr) {
    console.warn("Lỗi khi xóa bảng user_cases (bỏ qua nếu không tồn tại hoặc đã tự xóa):", dbErr);
  }

  // Xóa trong bảng drip_queues trước
  try {
    await supabaseAdmin
      .from("drip_queues")
      .delete()
      .eq("user_id", userId);
  } catch (dbErr) {
    console.warn("Lỗi khi xóa bảng drip_queues (bỏ qua nếu không tồn tại):", dbErr);
  }

  // 4. Xóa profile của người dùng trong bảng profiles
  const { error: profileDeleteError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileDeleteError) {
    throw new Error(`Lỗi khi xóa thông tin profile: ${profileDeleteError.message}`);
  }

  // 5. Xóa tài khoản người dùng khỏi hệ thống Authentication của Supabase
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    throw new Error(`Lỗi khi xóa tài khoản Auth: ${authDeleteError.message}`);
  }

  return { success: true };
}

/**
 * Server Action: Lấy cài đặt cấu hình chung của website
 */
export async function getSystemSettingsAction(token: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // 3. Truy cập settings
  const { data, error: fetchError } = await supabaseAdmin
    .from("global_settings")
    .select("config")
    .eq("id", "site_settings")
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Lỗi tải cài đặt: ${fetchError.message}`);
  }

  const config = (data?.config as any) || {};
  
  const defaultConfig = {
    siteTitle: "Visa Auto Tracking | Theo dõi Tiến trình Hồ sơ Định cư Mỹ",
    siteDescription: "Hệ thống tự động tra cứu, theo dõi tiến trình hồ sơ Visa và nhận thông báo email tự động khi có lịch Visa Bulletin mới hàng tháng.",
    maintenanceMode: false,
    allowGuestSandbox: true,
    turnstileSiteKey: "",
    turnstileSecretKey: "",
    scraperApiKey: "",
    scraperUsePremium: false,
    scraperUseRender: false,
    scraperUrlTemplate: "",
    cronCheckIntervalNormal: 24,
    cronCheckIntervalPeak: 6,
    cronPeakStartDay: 10,
    cronPeakEndDay: 20
  };

  const mergedConfig = { ...defaultConfig, ...config };

  // Che mờ các thông tin nhạy cảm trước khi gửi về client
  const maskedConfig = { ...mergedConfig };
  if (maskedConfig.turnstileSecretKey) {
    maskedConfig.turnstileSecretKey = "••••••••";
  }
  if (maskedConfig.scraperApiKey) {
    maskedConfig.scraperApiKey = "••••••••";
  }

  return maskedConfig;
}

/**
 * Server Action: Lưu cài đặt cấu hình chung của website
 */
export async function saveSystemSettingsAction(token: string, newConfig: any) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // Lấy cấu hình cũ từ database để giữ nguyên các giá trị bị che mờ nếu không thay đổi
  const { data: currentRecord } = await supabaseAdmin
    .from("global_settings")
    .select("config")
    .eq("id", "site_settings")
    .maybeSingle();

  const currentConfig = (currentRecord?.config as any) || {};
  const finalConfig = { ...newConfig };

  if (finalConfig.turnstileSecretKey === "••••••••") {
    finalConfig.turnstileSecretKey = currentConfig.turnstileSecretKey || "";
  }
  if (finalConfig.scraperApiKey === "••••••••") {
    finalConfig.scraperApiKey = currentConfig.scraperApiKey || "";
  }

  // Auto-fix và validate URL cào tùy chỉnh
  if (finalConfig.scraperUrlTemplate) {
    let tmpl = finalConfig.scraperUrlTemplate.trim();
    // Auto-fix lỗi thiếu 'h' ở đầu (ttps:// → https://)
    if (tmpl.startsWith("ttps://")) {
      tmpl = "h" + tmpl;
    }
    // Validate scheme hợp lệ
    if (tmpl && !tmpl.startsWith("https://") && !tmpl.startsWith("http://")) {
      throw new Error("URL cào tùy chỉnh phải bắt đầu bằng https:// hoặc http://");
    }
    finalConfig.scraperUrlTemplate = tmpl;
  }

  // 3. Upsert cấu hình mới
  const { error: saveError } = await supabaseAdmin
    .from("global_settings")
    .upsert({
      id: "site_settings",
      config: finalConfig,
      updated_at: new Date().toISOString()
    });

  if (saveError) {
    throw new Error(`Lỗi lưu cài đặt: ${saveError.message}`);
  }

  return { success: true };
}

/**
 * Server Action: Lấy số liệu thống kê truy cập (Analytics) cho quản trị viên.
 * Hỗ trợ tính toán % tăng trưởng, dữ liệu biểu đồ, nguồn giới thiệu, quốc gia/thành phố và thiết bị.
 */
export async function getAnalyticsStatsAction(token: string, days: number = 30) {
  // 1. Xác thực người dùng qua Token
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra quyền Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  const now = new Date();
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - days);
  
  const prevStart = new Date();
  prevStart.setDate(prevStart.getDate() - (days * 2));

  // 3. Lấy dữ liệu logs trong chu kỳ hiện tại
  const { data: currentLogs, error: currentError } = await supabaseAdmin
    .from("analytics_logs")
    .select("url, title, referrer, device, browser, os, country, city, session_id, visitor_id, created_at")
    .gte("created_at", currentStart.toISOString())
    .lt("created_at", now.toISOString());

  if (currentError) {
    throw new Error(`Lỗi cơ sở dữ liệu logs: ${currentError.message}`);
  }

  // 4. Lấy dữ liệu logs trong chu kỳ đối chứng trước đó
  const { data: prevLogs, error: prevError } = await supabaseAdmin
    .from("analytics_logs")
    .select("session_id, visitor_id")
    .gte("created_at", prevStart.toISOString())
    .lt("created_at", currentStart.toISOString());

  if (prevError) {
    throw new Error(`Lỗi cơ sở dữ liệu đối chứng: ${prevError.message}`);
  }

  // 5. Hàm helper tổng hợp chỉ số
  const aggregateLogs = (logs: any[]) => {
    const pageviews = logs.length;
    const uniqueVisitors = new Set(logs.map(l => l.visitor_id)).size;
    const uniqueSessions = new Set(logs.map(l => l.session_id)).size;
    const viewsPerSession = uniqueSessions > 0 ? parseFloat((pageviews / uniqueSessions).toFixed(2)) : 0;

    return {
      pageviews,
      visitors: uniqueVisitors,
      sessions: uniqueSessions,
      viewsPerSession
    };
  };

  const currentStats = aggregateLogs(currentLogs);
  const prevStats = aggregateLogs(prevLogs);

  // 6. Tính toán tỷ lệ phần trăm tăng trưởng
  const getGrowth = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - prev) / prev) * 100).toFixed(1));
  };

  const summary = {
    pageviews: {
      value: currentStats.pageviews,
      growth: getGrowth(currentStats.pageviews, prevStats.pageviews)
    },
    visitors: {
      value: currentStats.visitors,
      growth: getGrowth(currentStats.visitors, prevStats.visitors)
    },
    sessions: {
      value: currentStats.sessions,
      growth: getGrowth(currentStats.sessions, prevStats.sessions)
    },
    viewsPerSession: {
      value: currentStats.viewsPerSession,
      growth: getGrowth(currentStats.viewsPerSession, prevStats.viewsPerSession)
    }
  };

  // 7. Xây dựng dữ liệu biểu đồ Recharts theo ngày (đảm bảo hiển thị đủ các ngày)
  const chartDataMap: { [date: string]: { date: string; views: number; visitorsSet: Set<string> } } = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
    const dateFormatted = dateStr.substring(8, 10) + "/" + dateStr.substring(5, 7); // DD/MM
    chartDataMap[dateStr] = {
      date: dateFormatted,
      views: 0,
      visitorsSet: new Set<string>()
    };
  }

  currentLogs.forEach(log => {
    const dateStr = log.created_at.split("T")[0];
    if (chartDataMap[dateStr]) {
      chartDataMap[dateStr].views++;
      chartDataMap[dateStr].visitorsSet.add(log.visitor_id);
    }
  });

  const chartData = Object.keys(chartDataMap).sort().map(key => {
    const entry = chartDataMap[key];
    return {
      date: entry.date,
      views: entry.views,
      visitors: entry.visitorsSet.size
    };
  });

  // 8. Tổng hợp Top 15 trang được xem nhiều nhất
  const pagesMap: { [url: string]: { url: string; title: string; views: number; visitors: Set<string> } } = {};
  currentLogs.forEach(log => {
    const key = log.url || "/";
    if (!pagesMap[key]) {
      pagesMap[key] = { url: key, title: log.title || "Visa Auto Tracking", views: 0, visitors: new Set() };
    }
    pagesMap[key].views++;
    pagesMap[key].visitors.add(log.visitor_id);
  });

  const topPages = Object.values(pagesMap)
    .map(p => ({
      url: p.url,
      title: p.title,
      views: p.views,
      visitors: p.visitors.size
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  // 9. Tổng hợp Top 10 nguồn truy cập (Referrers)
  const referrersMap: { [referrer: string]: number } = {};
  currentLogs.forEach(log => {
    const ref = log.referrer || "Direct / Bookmarks";
    referrersMap[ref] = (referrersMap[ref] || 0) + 1;
  });

  const topReferrers = Object.keys(referrersMap)
    .map(r => ({ name: r, views: referrersMap[r] }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // 10. Tổng hợp Thiết bị
  const devicesMap: { [device: string]: number } = {};
  currentLogs.forEach(log => {
    const d = log.device || "Desktop";
    devicesMap[d] = (devicesMap[d] || 0) + 1;
  });
  const devices = Object.keys(devicesMap).map(k => ({ name: k, value: devicesMap[k] }));

  // 11. Tổng hợp Trình duyệt & Hệ điều hành
  const browsersMap: { [browser: string]: number } = {};
  const osMap: { [os: string]: number } = {};
  currentLogs.forEach(log => {
    const b = log.browser || "Unknown";
    const o = log.os || "Unknown";
    browsersMap[b] = (browsersMap[b] || 0) + 1;
    osMap[o] = (osMap[o] || 0) + 1;
  });

  const browsers = Object.keys(browsersMap)
    .map(k => ({ name: k, value: browsersMap[k] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const os = Object.keys(osMap)
    .map(k => ({ name: k, value: osMap[k] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // 12. Tổng hợp Địa điểm Quốc gia & Thành phố
  const countriesMap: { [country: string]: number } = {};
  const citiesMap: { [city: string]: number } = {};
  currentLogs.forEach(log => {
    const c = log.country || "Unknown";
    countriesMap[c] = (countriesMap[c] || 0) + 1;
    
    if (log.city && log.city !== "Unknown") {
      const cityLabel = `${log.city}, ${c}`;
      citiesMap[cityLabel] = (citiesMap[cityLabel] || 0) + 1;
    }
  });

  const countries = Object.keys(countriesMap)
    .map(k => ({ name: k, value: countriesMap[k] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const cities = Object.keys(citiesMap)
    .map(k => ({ name: k, value: citiesMap[k] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    summary,
    chartData,
    topPages,
    topReferrers,
    devices,
    browsers,
    os,
    countries,
    cities
  };
}

/**
 * Server Action: Lấy nhật ký cào lịch tự động (Scraper Logs) và cấu hình Cron Status.
 */
export async function getScraperLogsAction(token: string) {
  // 1. Xác thực người dùng qua Token
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra quyền Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // 3. Lấy 20 logs cào gần nhất
  const { data: logs, error: logsError } = await supabaseAdmin
    .from("scraper_logs")
    .select("*")
    .order("run_at", { ascending: false })
    .limit(20);

  if (logsError) {
    console.error("Error fetching scraper logs:", logsError);
  }

  // 4. Lấy trạng thái cron gần nhất
  const { data: cronStatusData } = await supabaseAdmin
    .from("global_settings")
    .select("config")
    .eq("id", "cron_status")
    .maybeSingle();

  const cronConfig = (cronStatusData?.config as any) || {};

  return {
    logs: logs || [],
    cronStatus: cronConfig,
    logsError: logsError ? logsError.message : null
  };
}

/**
 * Server Action: Lấy cấu hình email báo cáo thống kê từ database
 */
export async function getAnalyticsReportConfigAction(token: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // 3. Tải cấu hình từ database
  const { data, error: fetchError } = await supabaseAdmin
    .from("global_settings")
    .select("config")
    .eq("id", "analytics_report_config")
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Lỗi tải cấu hình: ${fetchError.message}`);
  }

  return (data?.config as any) || {
    to: "hqhuan@gmail.com",
    cc: "",
    frequency: "weekly",
    enabled: true
  };
}

/**
 * Server Action: Lưu cấu hình email báo cáo thống kê vào database
 */
export async function saveAnalyticsReportConfigAction(token: string, newConfig: any) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  const finalConfig = {
    to: newConfig.to || "hqhuan@gmail.com",
    cc: newConfig.cc || "",
    frequency: newConfig.frequency || "weekly",
    enabled: newConfig.enabled === true || newConfig.enabled === "true"
  };

  // 3. Lưu vào database
  const { error: saveError } = await supabaseAdmin
    .from("global_settings")
    .upsert({
      id: "analytics_report_config",
      config: finalConfig,
      updated_at: new Date().toISOString()
    });

  if (saveError) {
    throw new Error(`Lỗi lưu cấu hình: ${saveError.message}`);
  }

  return { success: true };
}

/**
 * Server Action: Kích hoạt gửi email báo cáo thống kê từ Server (giúp bảo mật CRON_SECRET)
 */
export async function triggerAnalyticsReportEmailAction(token: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // 3. Gọi endpoint API Cron nội bộ kèm Header Authorization bảo mật
  const cronSecret = process.env.CRON_SECRET || "local-test-trigger";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // manual=true để bỏ qua kiểm tra enabled = false
  const response = await fetch(`${siteUrl}/api/cron/analytics-report?manual=true`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cronSecret}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: "Lỗi gửi báo cáo không rõ nguyên nhân" }));
    throw new Error(errData.error || `Lỗi HTTP: ${response.status}`);
  }

  return await response.json();
}

/**
 * Server Action công khai: Ghi nhận lịch sử đăng nhập/đăng ký và tự động khóa IP nếu Brute-force
 */
export async function logAuthAttemptAction(email: string, status: "success" | "failed", userAgent: string) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || 
               headersList.get("x-real-ip") || 
               "127.0.0.1";

    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Ghi log nỗ lực đăng nhập
    const { error: logError } = await supabaseAdmin
      .from("auth_attempts")
      .insert({
        email,
        ip,
        user_agent: userAgent || "",
        status
      });

    if (logError) {
      console.error("Lỗi ghi nhận lịch sử đăng nhập:", logError.message);
    }

    // 2. Nếu đăng nhập thất bại, kiểm tra brute-force từ IP này
    if (status === "failed") {
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      // Đếm số lần thất bại từ IP này trong 10 phút gần đây
      const { count, error: countError } = await supabaseAdmin
        .from("auth_attempts")
        .select("*", { count: "exact", head: true })
        .eq("ip", ip)
        .eq("status", "failed")
        .gte("created_at", tenMinutesAgo.toISOString());

      if (!countError && count && count >= 5) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Khóa trong 30 phút

        // Thêm IP vào danh sách chặn
        const { error: blockError } = await supabaseAdmin
          .from("ip_blacklist")
          .upsert({
            ip,
            reason: "Nhập sai mật khẩu quá 5 lần trong 10 phút (Tự động khóa)",
            expires_at: expiresAt.toISOString(),
            blocked_at: new Date().toISOString()
          });

        if (blockError) {
          console.error("Lỗi thêm IP blacklist tự động:", blockError.message);
        }

        return { blocked: true, message: "Địa chỉ IP đã bị khóa 30 phút do nhập sai quá nhiều lần." };
      }
    }

    return { blocked: false };
  } catch (err: any) {
    console.error("Lỗi trong logAuthAttemptAction:", err.message);
    return { blocked: false, error: err.message };
  }
}

/**
 * Server Action: Lấy danh sách nhật ký đăng nhập và danh sách IP đen (Chỉ Admin)
 */
export async function getSecurityLogsAction(token: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  // 3. Tải nhật ký đăng nhập (100 lượt gần nhất)
  const { data: logs, error: logsError } = await supabaseAdmin
    .from("auth_attempts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);

  if (logsError) {
    throw new Error(`Lỗi tải nhật ký đăng nhập: ${logsError.message}`);
  }

  // 4. Tải danh sách đen IP
  const { data: blacklist, error: blacklistError } = await supabaseAdmin
    .from("ip_blacklist")
    .select("*")
    .order("blocked_at", { ascending: false });

  if (blacklistError) {
    throw new Error(`Lỗi tải danh sách IP bị chặn: ${blacklistError.message}`);
  }

  // 5. Tính toán các chỉ số thống kê bảo mật nhanh
  const totalAttempts = logs.length;
  const failedAttempts = logs.filter((l: any) => l.status === "failed").length;
  const successAttempts = logs.filter((l: any) => l.status === "success").length;
  const activeBlockedCount = blacklist.filter((b: any) => !b.expires_at || new Date(b.expires_at) > new Date()).length;

  return {
    logs: logs || [],
    blacklist: blacklist || [],
    stats: {
      totalAttempts,
      failedAttempts,
      successAttempts,
      activeBlockedCount
    }
  };
}

/**
 * Server Action: Thêm IP vào danh sách đen thủ công (Chỉ Admin)
 */
export async function blacklistIpAction(token: string, ip: string, reason: string, durationMinutes?: number) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  if (!ip || !ip.trim()) {
    throw new Error("Địa chỉ IP không hợp lệ.");
  }

  let expiresAt: string | null = null;
  if (durationMinutes && durationMinutes > 0) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + durationMinutes);
    expiresAt = date.toISOString();
  }

  // 3. Lưu vào database
  const { error: saveError } = await supabaseAdmin
    .from("ip_blacklist")
    .upsert({
      ip: ip.trim(),
      reason: reason || "Bị Admin chặn thủ công",
      expires_at: expiresAt,
      blocked_at: new Date().toISOString()
    });

  if (saveError) {
    throw new Error(`Lỗi chặn IP: ${saveError.message}`);
  }

  return { success: true };
}

/**
 * Server Action: Gỡ chặn IP khỏi danh sách đen (Chỉ Admin)
 */
export async function removeBlacklistIpAction(token: string, ip: string) {
  // 1. Xác thực người dùng
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error("Không được phép: Phiên đăng nhập không hợp lệ.");
  }

  // 2. Kiểm tra vai trò Admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new Error("Không được phép: Bạn không có quyền quản trị viên.");
  }

  if (!ip) {
    throw new Error("Địa chỉ IP không hợp lệ.");
  }

  // 3. Xóa khỏi database
  const { error: deleteError } = await supabaseAdmin
    .from("ip_blacklist")
    .delete()
    .eq("ip", ip);

  if (deleteError) {
    throw new Error(`Lỗi gỡ chặn IP: ${deleteError.message}`);
  }

  return { success: true };
}






