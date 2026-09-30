/**
 * Script gửi email mẫu cho tất cả các loại thông báo trong VisaTracker
 * Run: node --experimental-fetch supabase/send_preview_emails.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mpgfzdpxddmnhwkbskdq.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ2Z6ZHB4ZGRtbmh3a2Jza2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM5ODM0OSwiZXhwIjoyMDg5OTc0MzQ5fQ.Bxf9nYfUVDNs3ZeEePiEpnz9Awb9LxYOZFgfIMByrsQ';
const SITE_URL = 'https://visatracking.io.vn';
const PREVIEW_EMAIL = 'hqhuan@gmail.com';
const CRON_SECRET = 'local-test-trigger';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ─── Lấy email config từ DB ─────────────────────────────────────────────────
async function getEmailConfig() {
  const { data } = await supabase
    .from('global_settings')
    .select('config')
    .eq('id', 'email_config')
    .maybeSingle();
  return data?.config || null;
}

// ─── Gửi email qua SMTP / Resend theo config DB ─────────────────────────────
async function sendEmail({ to, subject, html }) {
  const conf = await getEmailConfig();

  if (conf?.provider === 'smtp' && conf?.smtpHost && conf?.smtpUser && conf?.smtpPass) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: conf.smtpHost,
      port: parseInt(conf.smtpPort || '465', 10),
      secure: conf.smtpSecure === true || conf.smtpSecure === 'true',
      auth: { user: conf.smtpUser, pass: conf.smtpPass },
    });
    const info = await transporter.sendMail({
      from: `VisaTracker <${conf.smtpUser}>`,
      to, subject, html,
    });
    return { provider: 'smtp', messageId: info.messageId };
  }

  // Fallback: Resend
  const { Resend } = require('resend');
  const apiKey = conf?.resendApiKey || process.env.RESEND_API_KEY;
  const from = conf?.resendFrom || 'onboarding@resend.dev';
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to, subject, html });
  if (result.error) throw new Error(result.error.message);
  return { provider: 'resend', messageId: result.data?.id };
}

// ════════════════════════════════════════════════════════════════════════════
// EMAIL 1: DRIP EMAIL — Bài học định cư theo lịch
// ════════════════════════════════════════════════════════════════════════════
async function sendDripPreview() {
  console.log('\n📚 [1/3] Gửi Drip Email mẫu (Bài học định cư)...');

  // Lấy bài viết đầu tiên trong drip schedule
  const { data: article } = await supabase
    .from('articles')
    .select('id, title, content, drip_day')
    .not('drip_day', 'is', null)
    .order('drip_day', { ascending: true })
    .limit(1)
    .single();

  const articleTitle = article?.title || 'Hướng dẫn đóng phí Visa định cư (IV Fee) qua cổng CEAC';
  const dripDay = article?.drip_day ?? 0;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background-color: #f2f2f3; color: #18181b;">
      <div style="background-color: #ffffff; border: 1px solid #18181b; border-radius: 16px; padding: 30px; box-shadow: 4px 4px 0px #18181b; max-width: 600px; margin: 0 auto;">
        
        <!-- Header badge -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <span style="background-color: #2170e4; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Bài học định cư · Ngày ${dripDay}</span>
          <span style="font-size: 11px; color: #888;">📧 Email mẫu · Preview</span>
        </div>

        <!-- Logo -->
        <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.05em; margin-bottom: 5px;">
          VisaTracker
        </div>
        <div style="width: 40px; height: 3px; background-color: #2170e4; margin-bottom: 20px;"></div>

        <!-- Title -->
        <h1 style="color: #18181b; margin: 0 0 15px 0; font-size: 20px; font-weight: 800; line-height: 1.3; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px;">
          ${articleTitle}
        </h1>

        <!-- Body -->
        <div style="color: #333333; line-height: 1.7; font-size: 14px; margin: 20px 0;">
          <p style="margin: 0 0 12px 0;">Xin chào,</p>
          <p style="margin: 0 0 12px 0;">Đây là bài học thứ <strong>${dripDay + 1}</strong> trong lộ trình chuẩn bị hồ sơ di trú Mỹ của bạn. Hệ thống <strong>VisaTracker</strong> tự động gửi bài hướng dẫn theo lịch trình cá nhân hóa để đảm bảo bạn không bỏ lỡ bất kỳ bước quan trọng nào.</p>
          
          <div style="background-color: #eff6ff; border-left: 4px solid #2170e4; padding: 15px 18px; border-radius: 4px; margin: 18px 0;">
            <p style="margin: 0; font-size: 13px; color: #1d4ed8; font-weight: 600;">💡 Nội dung bài học:</p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #1e40af;">Bài viết đầy đủ đã được cập nhật trên cổng VisaTracker với hình ảnh minh họa, bảng tra cứu và hướng dẫn từng bước. Bấm vào đường link bên dưới để xem chi tiết.</p>
          </div>

          <p style="margin: 12px 0 0 0; font-size: 13px; color: #666;">📅 Bài học tiếp theo sẽ được gửi vào <strong>ngày ${dripDay + 7}</strong> của lộ trình.</p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${SITE_URL}/dashboard" style="background-color: #18181b; color: #ffffff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 13px; border: 2px solid #18181b; display: inline-block;">
            Đọc Bài Hướng Dẫn Đầy Đủ →
          </a>
        </div>

        <!-- Divider & Footer -->
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.6;">
          Bạn nhận được email này vì đã đăng ký theo dõi lộ trình định cư trên <strong>VisaTracker</strong>.<br/>
          Để ngừng nhận, vào <a href="${SITE_URL}/dashboard" style="color:#2170e4; text-decoration: none;">Cài đặt tài khoản</a> và tắt <em>Nhận email hướng dẫn</em>.
        </p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: PREVIEW_EMAIL,
    subject: `[Lộ trình di trú Mỹ] ${articleTitle}`,
    html,
  });

  console.log(`   ✅ Đã gửi! Provider: ${result.provider} | MessageID: ${result.messageId}`);
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// EMAIL 2: NEWSLETTER — Bản tin hướng dẫn thủ công từ admin
// ════════════════════════════════════════════════════════════════════════════
async function sendNewsletterPreview() {
  console.log('\n📣 [2/3] Gửi Newsletter mẫu (Bản tin từ Admin)...');

  const { data: article } = await supabase
    .from('articles')
    .select('id, title, slug')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const articleTitle = article?.title || 'Cập nhật Visa Bulletin tháng 08/2026';
  const articleSlug = article?.slug || 'huong-dan-visa-tracker';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background-color: #f0fdf4; color: #18181b;">
      <div style="background-color: #ffffff; border: 1px solid #18181b; border-radius: 16px; padding: 30px; box-shadow: 4px 4px 0px #18181b; max-width: 600px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.05em;">VisaTracker</div>
            <div style="width: 40px; height: 3px; background-color: #10b981; margin-top: 4px;"></div>
          </div>
          <span style="background-color: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase;">Bản tin · Newsletter</span>
        </div>

        <!-- Banner -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <p style="color: #ffffff; font-size: 12px; margin: 0 0 8px 0; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.1em;">Thông báo mới từ Ban Quản Trị</p>
          <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 800; line-height: 1.3;">
            ${articleTitle}
          </h1>
        </div>

        <!-- Body -->
        <div style="color: #333333; line-height: 1.7; font-size: 14px; margin: 20px 0;">
          <p style="margin: 0 0 12px 0;">Xin chào,</p>
          <p style="margin: 0 0 12px 0;">Ban quản trị <strong>VisaTracker</strong> xin gửi đến bạn thông tin hướng dẫn mới nhất vừa được cập nhật trên hệ thống:</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 10px; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #111827;">📄 ${articleTitle}</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">Bài viết chi tiết có hình ảnh hướng dẫn từng bước.</p>
          </div>

          <p style="margin: 12px 0 0 0; font-size: 13px; color: #555;">Bấm vào nút bên dưới để đọc bài viết đầy đủ trên cổng VisaTracker.</p>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${SITE_URL}/articles/${articleSlug}" style="background-color: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 13px; border: 2px solid #059669; display: inline-block;">
            Xem Bài Viết Chi Tiết →
          </a>
        </div>

        <!-- Stats row -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 20px 0; text-align: center;">
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px;">
            <div style="font-size: 18px; font-weight: 900; color: #2170e4;">5</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Diện bảo lãnh</div>
          </div>
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px;">
            <div style="font-size: 18px; font-weight: 900; color: #10b981;">08/2026</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Bulletin hiện tại</div>
          </div>
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px;">
            <div style="font-size: 18px; font-weight: 900; color: #f59e0b;">24/7</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Theo dõi tự động</div>
          </div>
        </div>

        <!-- Footer -->
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.6;">
          Bạn nhận được email này vì đã đăng ký nhận bản tin từ <strong>VisaTracker</strong>.<br/>
          Quản lý cài đặt tại <a href="${SITE_URL}/dashboard" style="color:#10b981; text-decoration: none;">trang tài khoản của bạn</a>.
        </p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: PREVIEW_EMAIL,
    subject: `[VisaTracker Bản Tin] ${articleTitle}`,
    html,
  });

  console.log(`   ✅ Đã gửi! Provider: ${result.provider} | MessageID: ${result.messageId}`);
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// EMAIL 3: BULLETIN ALERT — Thông báo hồ sơ đến hạn
// ════════════════════════════════════════════════════════════════════════════
async function sendBulletinAlertPreview() {
  console.log('\n🎉 [3/3] Gửi Bulletin Alert mẫu (Hồ sơ đến hạn nộp đơn)...');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background-color: #fefce8; color: #18181b;">
      <div style="background-color: #ffffff; border: 1px solid #18181b; border-radius: 16px; padding: 30px; box-shadow: 4px 4px 0px #18181b; max-width: 600px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.05em;">VisaTracker</div>
            <div style="width: 40px; height: 3px; background-color: #f59e0b; margin-top: 4px;"></div>
          </div>
          <span style="background-color: #f59e0b; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase;">Cảnh báo · Đến hạn</span>
        </div>

        <!-- Alert Banner -->
        <div style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); border-radius: 12px; padding: 22px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 8px;">🎉</div>
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 900; line-height: 1.3;">
            Chúc mừng! Hồ sơ của bạn đã đến hạn nộp đơn!
          </h1>
          <p style="color: #fef3c7; font-size: 12px; margin: 8px 0 0 0;">Visa Bulletin chính thức tháng 07/2026 vừa được công bố</p>
        </div>

        <!-- Body -->
        <div style="color: #333333; line-height: 1.7; font-size: 14px;">
          <p style="margin: 0 0 12px 0;">Chào bạn,</p>
          <p style="margin: 0 0 16px 0;">Hệ thống <strong>VisaTracker</strong> phát hiện lịch Visa Bulletin mới tháng <strong>07/2026</strong> vừa được Bộ Ngoại Giao Hoa Kỳ công bố và <strong>hồ sơ của bạn đã đến hạn nộp đơn</strong> (Filing Date Current).</p>

          <!-- Case details card -->
          <div style="background-color: #fffbeb; border: 1px solid #fbbf24; padding: 18px; border-radius: 12px; margin: 16px 0;">
            <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #92400e;">📋 Thông tin hồ sơ</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px;">
              <tr>
                <td style="padding: 5px 0; color: #6b7280; width: 50%;">Tên hồ sơ:</td>
                <td style="padding: 5px 0; font-weight: 700;">Nguyễn Văn A - Bảo lãnh F1</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Diện bảo lãnh:</td>
                <td style="padding: 5px 0; font-weight: 700;">F1 (Con của công dân Mỹ)</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Priority Date:</td>
                <td style="padding: 5px 0; font-weight: 700;">22/10/2015</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Filing Date tháng 07/2026:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #059669;">01/09/2017 ✓ Current</td>
              </tr>
              <tr>
                <td style="padding: 8px 0 0 0; color: #6b7280; border-top: 1px dashed #fbbf24;">Nguồn kiểm chứng:</td>
                <td style="padding: 8px 0 0 0; font-weight: 700; border-top: 1px dashed #fbbf24;">
                  <a href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" target="_blank" style="color: #d97706; text-decoration: underline;">U.S. Department of State (travel.state.gov)</a>
                </td>
              </tr>
            </table>
          </div>

          <!-- Action needed -->
          <div style="background-color: #fff7ed; border: 1px solid #fb923c; border-radius: 10px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; font-weight: 700; color: #c2410c; font-size: 13px;">⚡ Hành động cần thực hiện ngay:</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #7c2d12; line-height: 2;">
              <li>Đóng phí IV Fee trên cổng CEAC (nếu chưa)</li>
              <li>Nộp đơn DS-260 trực tuyến</li>
              <li>Chuẩn bị bộ hồ sơ dân sự (Civil Documents)</li>
              <li>Liên hệ NVC để xác nhận hồ sơ</li>
            </ul>
          </div>

          <p style="font-size: 13px; color: #555;">Bạn đã đủ điều kiện tiến hành đóng phí và nộp các hồ sơ dân sự lên cổng NVC CEAC. Đừng bỏ lỡ cơ hội này!</p>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${SITE_URL}/dashboard" style="background-color: #18181b; color: #ffffff; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; border: 2px solid #18181b; display: inline-block;">
            Vào Dashboard Xem Lộ Trình →
          </a>
        </div>

        <!-- Footer -->
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.6;">
          <strong>VisaTracker</strong> · Theo dõi tự động tiến trình hồ sơ di trú Mỹ<br/>
          Quản lý thông báo tại <a href="${SITE_URL}/dashboard" style="color:#f59e0b; text-decoration: none;">trang cài đặt</a> của bạn.
        </p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: PREVIEW_EMAIL,
    subject: `[VisaTracker] 🎉 Hồ sơ F1 của bạn đã đến hạn nộp đơn - Bulletin 07/2026!`,
    html,
  });

  console.log(`   ✅ Đã gửi! Provider: ${result.provider} | MessageID: ${result.messageId}`);
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  VisaTracker · Gửi Email Mẫu Preview');
  console.log(`  Địa chỉ nhận: ${PREVIEW_EMAIL}`);
  console.log('═══════════════════════════════════════════════════');

  const conf = await getEmailConfig();
  if (conf) {
    console.log(`\n📧 Email provider: ${conf.provider?.toUpperCase() || 'SMTP'}`);
    if (conf.provider === 'smtp') {
      console.log(`   SMTP Host: ${conf.smtpHost || '(chưa cấu hình)'}`);
      console.log(`   From: ${conf.smtpUser || '(chưa cấu hình)'}`);
    } else {
      console.log(`   From: ${conf.resendFrom || 'onboarding@resend.dev'}`);
    }
  } else {
    console.log('\n⚠️  Không tìm thấy cấu hình email trong DB, dùng fallback env.');
  }

  try {
    await sendDripPreview();
    await sendNewsletterPreview();
    await sendBulletinAlertPreview();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ✅ Đã gửi thành công 3/3 email mẫu!');
    console.log(`  📥 Kiểm tra hộp thư: ${PREVIEW_EMAIL}`);
    console.log('═══════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ Lỗi gửi email:', err.message);
    if (err.message.includes('API key')) {
      console.error('   → Kiểm tra lại cấu hình Resend API Key trong Admin Panel');
    }
    if (err.message.includes('SMTP') || err.message.includes('auth')) {
      console.error('   → Kiểm tra lại SMTP credentials trong Admin Panel');
    }
    process.exit(1);
  }
}

main();
