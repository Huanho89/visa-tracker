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
    const { articleId, subject } = await request.json();
    
    if (!articleId || !subject) {
      return Response.json({ error: "Missing articleId or subject" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // 2. Fetch the article
    const { data: article, error: articleError } = await supabaseAdmin
      .from("articles")
      .select("title, content, slug")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      return Response.json({ error: "Article not found" }, { status: 404 });
    }

    // 3. Fetch all active members who opted in for emails
    const { data: recipients, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("email, id")
      .eq("enable_drip_emails", true);

    if (profilesError) throw profilesError;

    if (!recipients || recipients.length === 0) {
      return Response.json({ success: true, recipientCount: 0, message: "No subscribers opted in." });
    }

    const dispatchLogs = [];

    // 4. Send bulk newsletter emails (in-parallel/sequence)
    for (const member of recipients) {
      try {
        const mailResult = await sendMail({
          to: member.email,
          subject: subject,
          html: `
            <div style="font-family: sans-serif; padding: 20px; background-color: #f2f2f3; color: #18181b;">
              <div style="background-color: #ffffff; border: 1px solid #18181b; border-radius: 16px; padding: 30px; box-shadow: 4px 4px 0px #18181b; max-width: 600px; margin: 0 auto;">
                <span style="background-color: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase;">Bản tin VisaTracker</span>
                <h1 style="color: #18181b; margin-top: 15px; font-size: 20px; border-bottom: 1px solid #18181b; padding-bottom: 10px;">${article.title}</h1>
                
                <div style="color: #333333; line-height: 1.6; font-size: 14px; margin: 20px 0;">
                  <p>Xin chào,</p>
                  <p>Ban quản trị VisaTracker xin gửi đến bạn thông tin hướng dẫn mới nhất:</p>
                  <p><em>${article.title}</em></p>
                </div>

                <div style="text-align: center; margin: 25px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/articles/${article.slug}" style="background-color: #2170e4; color: #ffffff; padding: 10px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 13px; border: 1px solid #18181b;">Xem Bài Viết Chi Tiết →</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #18181b; margin: 25px 0;" />
                <p style="font-size: 11px; color: #888; text-align: center;">
                  Để ngừng nhận bản tin định kỳ, bạn có thể thay đổi trong phần <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" style="color:#2170e4;">Cài đặt tài khoản</a>.
                </p>
              </div>
            </div>
          `
        });

        // Log this transaction into drip_queues as a record
        await supabaseAdmin.from("drip_queues").insert({
          user_id: member.id,
          article_id: articleId,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          status: "sent"
        });

        dispatchLogs.push({ email: member.email, status: "sent", messageId: mailResult.id });
      } catch (mailErr: any) {
        console.error(`Error emailing newsletter to ${member.email}:`, mailErr);
        dispatchLogs.push({ email: member.email, status: "failed", error: mailErr.message });
      }
    }

    return Response.json({
      success: true,
      recipientCount: recipients.length,
      dispatchLogs
    });

  } catch (err: any) {
    console.error("Newsletter API error:", err);
    return Response.json({ error: err.message || err }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
