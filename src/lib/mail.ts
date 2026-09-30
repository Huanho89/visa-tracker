import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getSupabaseAdminClient } from "@/lib/supabase";

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
}

/**
 * Gửi email sử dụng cấu hình động từ database (bảng global_settings).
 * Nếu không có cấu hình trong database, tự động fallback về biến môi trường (.env.local).
 */
export async function sendMail({ to, subject, html, cc, bcc }: SendMailParams) {
  // Cấu hình SMTP mặc định từ env
  let activeSmtpHost = process.env.SMTP_HOST;
  let activeSmtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  let activeSmtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true;
  let activeSmtpUser = process.env.SMTP_USER;
  let activeSmtpPass = process.env.SMTP_PASS;

  // Cấu hình Resend mặc định từ env
  let activeResendApiKey = process.env.RESEND_API_KEY || "re_placeholder_key";
  let activeResendFrom = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  
  let preferredProvider = "smtp"; // 'smtp' hoặc 'resend'

  // 1. Tải cấu hình từ database
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("global_settings")
      .select("config")
      .eq("id", "email_config")
      .maybeSingle();

    if (data && !error && data.config) {
      const conf = data.config as any;
      preferredProvider = conf.provider || "smtp";
      
      if (conf.smtpHost) activeSmtpHost = conf.smtpHost;
      if (conf.smtpPort) activeSmtpPort = parseInt(conf.smtpPort, 10);
      if (conf.smtpSecure !== undefined) {
        activeSmtpSecure = conf.smtpSecure === true || conf.smtpSecure === "true";
      }
      if (conf.smtpUser) activeSmtpUser = conf.smtpUser;
      if (conf.smtpPass) activeSmtpPass = conf.smtpPass;

      if (conf.resendApiKey) activeResendApiKey = conf.resendApiKey;
      if (conf.resendFrom) activeResendFrom = conf.resendFrom;

      console.log(`[MailService] Đã tải cấu hình email từ DB. Provider ưu tiên: ${preferredProvider}`);
    } else {
      console.log("[MailService] Không tìm thấy cấu hình email trong DB, sử dụng cấu hình từ env.");
    }
  } catch (dbErr) {
    console.error("[MailService] Lỗi khi truy vấn cấu hình email từ database, fallback về env:", dbErr);
  }

  // 2. Thực hiện gửi email theo provider được chọn
  const isSmtpConfigured = !!(activeSmtpHost && activeSmtpUser && activeSmtpPass);

  if (preferredProvider === "smtp" && isSmtpConfigured) {
    try {
      console.log(`[MailService] Đang gửi thư tới ${to} qua SMTP (${activeSmtpUser})...`);
      
      const transporter = nodemailer.createTransport({
        host: activeSmtpHost,
        port: activeSmtpPort,
        secure: activeSmtpSecure,
        auth: {
          user: activeSmtpUser,
          pass: activeSmtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `VisaTracker <${activeSmtpUser}>`,
        to,
        cc,
        bcc,
        subject,
        html,
      });

      console.log(`[MailService] Đã gửi thành công qua SMTP. MessageID: ${info.messageId}`);
      return { success: true, provider: "smtp", id: info.messageId };
    } catch (err: any) {
      console.error("[MailService] Gửi qua SMTP thất bại, thử chuyển hướng qua Resend...", err);
      // Tiếp tục tự động fallback xuống Resend nếu SMTP lỗi
    }
  }

  // Gửi qua Resend SDK (hoặc làm fallback)
  console.log(`[MailService] Đang gửi thư tới ${to} qua Resend (${activeResendFrom})...`);
  
  const resend = new Resend(activeResendApiKey);
  const result = await resend.emails.send({
    from: activeResendFrom,
    to,
    cc: cc ? cc.split(",").map((s) => s.trim()) : undefined,
    bcc: bcc ? bcc.split(",").map((s) => s.trim()) : undefined,
    subject,
    html,
  });

  if (result.error) {
    console.error("[MailService] Gửi qua Resend thất bại:", result.error);
    throw new Error(`Tất cả dịch vụ email đều lỗi. Resend Error: ${result.error.message}`);
  }

  console.log(`[MailService] Đã gửi thành công qua Resend. MessageID: ${result.data?.id}`);
  return { success: true, provider: "resend", id: result.data?.id };
}

