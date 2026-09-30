import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { verifyCronOrAdminAuth } from "@/lib/auth_utils";
import { sendMail } from "@/lib/mail";

export async function POST(request: NextRequest) {
  // 1. Authorization check
  const isAuthorized = await verifyCronOrAdminAuth(request);
  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // 2. Developer helper: Auto-queue drip emails for users who have a case but no queue items yet
    // Load all users who have at least one case
    const { data: casesData } = await supabaseAdmin
      .from("cases")
      .select("user_id, id");

    const activeUserIds = Array.from(new Set((casesData || []).map(c => c.user_id)));

    // Load all articles with drip days
    const { data: dripArticles } = await supabaseAdmin
      .from("articles")
      .select("id, drip_day, title")
      .not("drip_day", "is", null);

    if (activeUserIds.length > 0 && dripArticles && dripArticles.length > 0) {
      for (const userId of activeUserIds) {
        // Check if user already has queue entries
        const { data: existingQueue } = await supabaseAdmin
          .from("drip_queues")
          .select("id")
          .eq("user_id", userId)
          .limit(1);

        if (!existingQueue || existingQueue.length === 0) {
          // User needs drip queue populated
          console.log(`Auto-queuing drip campaign for user: ${userId}`);
          const queueEntries = dripArticles.map(art => {
            const scheduledDate = new Date();
            // Schedule Day 0 = now, Day 7 = now + 7 days, etc.
            scheduledDate.setDate(scheduledDate.getDate() + (art.drip_day || 0));
            
            return {
              user_id: userId,
              article_id: art.id,
              scheduled_for: scheduledDate.toISOString(),
              status: "pending"
            };
          });

          await supabaseAdmin.from("drip_queues").insert(queueEntries);
        }
      }
    }

    // 3. Scan pending queue items that are scheduled to be sent now or in the past
    const nowStr = new Date().toISOString();
    
    // Load pending queue items
    const { data: pendingItems, error: fetchError } = await supabaseAdmin
      .from("drip_queues")
      .select(`
        id,
        user_id,
        article_id,
        scheduled_for,
        profiles:user_id ( email, enable_drip_emails ),
        articles:article_id ( title, content )
      `)
      .eq("status", "pending")
      .lte("scheduled_for", nowStr);

    if (fetchError) throw fetchError;

    const results = [];

    for (const item of (pendingItems || [])) {
      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      const article = Array.isArray(item.articles) ? item.articles[0] : item.articles;

      if (!profile || !article) {
        // Invalid item, mark as cancelled
        await supabaseAdmin
          .from("drip_queues")
          .update({ status: "cancelled" })
          .eq("id", item.id);
        results.push({ queueId: item.id, status: "cancelled", reason: "Missing profile or article reference" });
        continue;
      }

      // Check if user has opted out of drip emails
      if (!profile.enable_drip_emails) {
        await supabaseAdmin
          .from("drip_queues")
          .update({ status: "cancelled" })
          .eq("id", item.id);
        results.push({ queueId: item.id, status: "cancelled", email: profile.email, reason: "User opted out of drip emails" });
        continue;
      }

      // Send email using Resend
      try {
        const mailResult = await sendMail({
          to: profile.email,
          subject: `[Lộ trình di trú Mỹ] ${article.title}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; background-color: #f2f2f3; color: #18181b;">
              <div style="background-color: #ffffff; border: 1px solid #18181b; border-radius: 16px; padding: 30px; box-shadow: 4px 4px 0px #18181b; max-width: 600px; margin: 0 auto;">
                <span style="background-color: #2170e4; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase;">Bài học định cư</span>
                <h1 style="color: #18181b; margin-top: 15px; font-size: 22px; border-bottom: 1px solid #18181b; pb: 10px;">${article.title}</h1>
                
                <div style="color: #333333; line-height: 1.6; font-size: 14px; margin: 20px 0;">
                  <p>Xin chào,</p>
                  <p>Hệ thống tự động gửi bài học hướng dẫn định cư tiếp theo nằm trong lộ trình chuẩn bị hồ sơ di trú Mỹ của bạn:</p>
                  
                  <div style="background-color: #f9f9fa; border-left: 4px solid #2170e4; padding: 15px; border-radius: 4px; margin: 15px 0;">
                    <em>Bài viết đầy đủ và chi tiết đã được cập nhật trên cổng VisaTracker. Bạn có thể bấm vào đường link bên dưới để xem bài học định cư trực quan hơn.</em>
                  </div>
                </div>

                <div style="text-align: center; margin: 25px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" style="background-color: #18181b; color: #ffffff; padding: 10px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 13px; border: 1px solid #18181b;">Đọc Bài Hướng Dẫn Đầy Đủ →</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #18181b; margin: 25px 0;" />
                <p style="font-size: 11px; color: #888; text-align: center;">
                  Để ngừng nhận email lộ trình định cư này, bạn có thể tắt cấu hình nhận email trong trang <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" style="color:#2170e4;">Cài đặt tài khoản</a>.
                </p>
              </div>
            </div>
          `
        });

        // Update queue item to sent
        await supabaseAdmin
          .from("drip_queues")
          .update({
            status: "sent",
            sent_at: new Date().toISOString()
          })
          .eq("id", item.id);

        results.push({ queueId: item.id, status: "sent", email: profile.email, messageId: mailResult.id });

      } catch (mailErr: any) {
        console.error(`Error sending queue item ${item.id}:`, mailErr);
        results.push({ queueId: item.id, status: "failed", email: profile.email, error: mailErr.message });
      }
    }

    return Response.json({
      success: true,
      processedCount: pendingItems?.length || 0,
      results
    });

  } catch (err: any) {
    console.error("Drip API error:", err);
    return Response.json({ error: err.message || err }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return POST(request);
}
