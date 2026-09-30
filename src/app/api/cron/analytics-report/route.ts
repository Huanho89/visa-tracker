import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    // 1. Verify Authorization Header (CRON_SECRET)
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET || 'local-test-trigger';
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Không được phép: CRON_SECRET không hợp lệ.' }, { status: 401 });
    }

    // 2. Initialize Supabase Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2.5 Load report configuration from database
    const { data: configData } = await supabase
      .from('global_settings')
      .select('config')
      .eq('id', 'analytics_report_config')
      .maybeSingle();

    const reportConfig = (configData?.config as any) || {
      to: 'hqhuan@gmail.com',
      cc: '',
      frequency: 'weekly',
      enabled: true
    };

    const { searchParams } = new URL(request.url);
    const isManual = searchParams.get('manual') === 'true';

    const period = reportConfig.frequency || 'weekly';
    const now = new Date();

    // If auto-trigger (not manual) and config is disabled or period doesn't match today, exit
    if (!isManual) {
      if (reportConfig.enabled === false) {
        return NextResponse.json({ success: true, message: 'Tự động gửi báo cáo thống kê đang bị tắt.' });
      }

      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
      const dayOfMonth = now.getDate();

      if (period === 'weekly' && dayOfWeek !== 1) {
        return NextResponse.json({ success: true, message: 'Báo cáo hàng tuần chỉ gửi vào thứ Hai. Hôm nay không phải thứ Hai.' });
      }
      if (period === 'monthly' && dayOfMonth !== 1) {
        return NextResponse.json({ success: true, message: 'Báo cáo hàng tháng chỉ gửi vào ngày 1 hàng tháng.' });
      }
      if (period === '3days' && (dayOfMonth - 1) % 3 !== 0) {
        return NextResponse.json({ success: true, message: 'Báo cáo mỗi 3 ngày chỉ gửi vào các ngày 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31. Hôm nay không phải ngày gửi.' });
      }
    }
    const startDate = new Date();
    
    let periodName = 'Tuần';
    if (period === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
      periodName = 'Ngày';
    } else if (period === '3days') {
      startDate.setDate(startDate.getDate() - 3);
      periodName = '3 Ngày';
    } else if (period === 'monthly') {
      startDate.setDate(startDate.getDate() - 30);
      periodName = 'Tháng';
    } else {
      startDate.setDate(startDate.getDate() - 7); // weekly default
      periodName = 'Tuần';
    }

    // 3. Fetch analytics logs for the configured period
    const { data: logs, error } = await supabase
      .from('analytics_logs')
      .select('url, title, referrer, device, created_at, visitor_id, session_id')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', now.toISOString());

    if (error) {
      console.error('Cron Analytics Query Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch scraper logs for the configured period
    const { data: scraperLogs, error: scraperError } = await supabase
      .from('scraper_logs')
      .select('run_at, status, message, target_month, emails_sent')
      .gte('run_at', startDate.toISOString())
      .lt('run_at', now.toISOString())
      .order('run_at', { ascending: false });

    if (scraperError) {
      console.error('Cron Scraper logs Query Error:', scraperError);
    }

    const totalViews = logs.length;
    const uniqueVisitors = new Set(logs.map(l => l.visitor_id)).size;
    const uniqueSessions = new Set(logs.map(l => l.session_id)).size;
    const viewsPerSession = uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : '0';

    // Scraper stats calculations
    const totalScrapes = scraperLogs?.length || 0;
    const successScrapes = scraperLogs?.filter(s => s.status === 'success').length || 0;
    const failedScrapes = scraperLogs?.filter(s => s.status === 'failed').length || 0;
    const skippedScrapes = scraperLogs?.filter(s => s.status === 'skipped').length || 0;
    const notReleasedScrapes = scraperLogs?.filter(s => s.status === 'not_released_yet').length || 0;
    const totalEmailsSent = scraperLogs?.reduce((acc, s) => acc + (s.emails_sent || 0), 0) || 0;

    // Group Top Pages
    const pagesMap: { [url: string]: { url: string; title: string; views: number } } = {};
    logs.forEach(log => {
      const key = log.url || '/';
      if (!pagesMap[key]) {
        pagesMap[key] = { url: key, title: log.title || 'Visa Auto Tracking', views: 0 };
      }
      pagesMap[key].views++;
    });
    const topPages = Object.values(pagesMap)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // Group Top Referrers
    const referrersMap: { [referrer: string]: number } = {};
    logs.forEach(log => {
      const ref = log.referrer || 'Direct / Bookmarks';
      referrersMap[ref] = (referrersMap[ref] || 0) + 1;
    });
    const topReferrers = Object.keys(referrersMap)
      .map(k => ({ name: k, views: referrersMap[k] }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // Group Devices
    const devicesMap: { [device: string]: number } = {};
    logs.forEach(log => {
      const dev = log.device || 'Desktop';
      devicesMap[dev] = (devicesMap[dev] || 0) + 1;
    });

    // 4. Create HTML Email Template
    const dateFormatted = `${startDate.getDate()}/${startDate.getMonth() + 1} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #0f172a; border-radius: 12px; background-color: #f8fafc; color: #0f172a; box-shadow: 4px 4px 0px #0f172a;">
        <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #2563eb;">Visa Auto Tracking</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase; font-weight: bold; color: #64748b; letter-spacing: 1px;">Báo cáo Lưu lượng Truy cập ${periodName}</p>
          <span style="display: inline-block; background-color: #e2e8f0; border: 1px solid #0f172a; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; margin-top: 10px;">Chu kỳ: ${dateFormatted}</span>
        </div>
        
        <!-- Summary Dashboard Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px;">
          <div style="background-color: #ffffff; border: 1.5px solid #0f172a; padding: 12px; border-radius: 8px; box-shadow: 2px 2px 0px #0f172a;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Tổng Pageviews</div>
            <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">${totalViews.toLocaleString()}</div>
          </div>
          <div style="background-color: #ffffff; border: 1.5px solid #0f172a; padding: 12px; border-radius: 8px; box-shadow: 2px 2px 0px #0f172a;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Khách độc bản (Visitors)</div>
            <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">${uniqueVisitors.toLocaleString()}</div>
          </div>
          <div style="background-color: #ffffff; border: 1.5px solid #0f172a; padding: 12px; border-radius: 8px; box-shadow: 2px 2px 0px #0f172a;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Số Phiên (Sessions)</div>
            <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">${uniqueSessions.toLocaleString()}</div>
          </div>
          <div style="background-color: #ffffff; border: 1.5px solid #0f172a; padding: 12px; border-radius: 8px; box-shadow: 2px 2px 0px #0f172a;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Xem / Phiên (Avg)</div>
            <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">${viewsPerSession}</div>
          </div>
        </div>

        <!-- Top Pages -->
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 8px;">Top Trang Xem Nhiều Nhất</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #0f172a; text-align: left;">
                <th style="padding: 10px; font-size: 11px; font-weight: bold; color: #475569;">Trang</th>
                <th style="padding: 10px; font-size: 11px; font-weight: bold; color: #475569; width: 80px; text-align: right;">Lượt xem</th>
              </tr>
            </thead>
            <tbody>
              ${topPages.map(p => `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
                  <td style="padding: 10px; font-weight: bold; color: #334155;">
                    <div style="font-size: 12px; color: #0f172a;">${p.title}</div>
                    <div style="font-size: 10px; color: #64748b; font-family: monospace;">${p.url}</div>
                  </td>
                  <td style="padding: 10px; text-align: right; font-weight: 900; color: #2563eb;">${p.views.toLocaleString()}</td>
                </tr>
              `).join('')}
              ${topPages.length === 0 ? `<tr><td colspan="2" style="padding: 15px; text-align: center; color: #64748b; font-size: 12px;">Không có dữ liệu lượt xem nào trong tuần qua.</td></tr>` : ''}
            </tbody>
          </table>
        </div>

        <!-- Top Referrers & Devices -->
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 8px;">Nguồn Truy Cập & Thiết Bị</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #0f172a; text-align: left;">
                <th style="padding: 10px; font-size: 11px; font-weight: bold; color: #475569;">Nguồn / Thiết bị</th>
                <th style="padding: 10px; font-size: 11px; font-weight: bold; color: #475569; width: 80px; text-align: right;">Lượt xem</th>
              </tr>
            </thead>
            <tbody>
              ${topReferrers.slice(0, 3).map(r => `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
                  <td style="padding: 10px; color: #334155;">Nguồn: <strong>${r.name}</strong></td>
                  <td style="padding: 10px; text-align: right; font-weight: bold;">${r.views.toLocaleString()}</td>
                </tr>
              `).join('')}
              ${Object.keys(devicesMap).map(d => `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
                  <td style="padding: 10px; color: #334155;">Thiết bị: <strong>${d}</strong></td>
                  <td style="padding: 10px; text-align: right; font-weight: bold;">${devicesMap[d].toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        </div>

        <!-- Section: Scraper Summary -->
        <div style="margin-bottom: 25px; border-top: 2px dashed #0f172a; padding-top: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; font-weight: 900; color: #0f172a; border-left: 4px solid #ef4444; padding-left: 8px;">Nhật Ký & Hiệu Suất Cào Visa Bulletin</h3>
          
          <!-- Scraper Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
            <div style="background-color: #ffffff; border: 1.5px solid #0f172a; padding: 12px; border-radius: 8px; box-shadow: 2px 2px 0px #0f172a;">
              <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Tổng số lượt chạy</div>
              <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">${totalScrapes}</div>
            </div>
            <div style="background-color: #ffffff; border: 1.5px solid #0f172a; padding: 12px; border-radius: 8px; box-shadow: 2px 2px 0px #0f172a;">
              <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Email thông báo gửi đi</div>
              <div style="font-size: 20px; font-weight: 900; color: #10b981; margin-top: 4px;">✓ ${totalEmailsSent}</div>
            </div>
          </div>
          
          <div style="background-color: #ffffff; border: 1.5px solid #0f172a; padding: 12px; border-radius: 8px; box-shadow: 2px 2px 0px #0f172a; margin-bottom: 15px; font-size: 11px;">
            <strong>Chi tiết kết quả chạy:</strong>
            <div style="margin-top: 8px;">
              <span style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 2px 8px; border-radius: 9999px; font-weight: bold; margin-right: 5px; display: inline-block; margin-bottom: 5px;">Thành công: ${successScrapes}</span>
              <span style="background-color: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-weight: bold; margin-right: 5px; display: inline-block; margin-bottom: 5px;">Thất bại (Lỗi): ${failedScrapes}</span>
              <span style="background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 2px 8px; border-radius: 9999px; font-weight: bold; margin-right: 5px; display: inline-block; margin-bottom: 5px;">Bỏ qua (Cron): ${skippedScrapes}</span>
              <span style="background-color: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px; font-weight: bold; display: inline-block; margin-bottom: 5px;">Chưa phát hành: ${notReleasedScrapes}</span>
            </div>
          </div>

          <!-- Detailed Scraper Runs Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1.5px solid #0f172a; text-align: left;">
                <th style="padding: 10px; font-size: 11px; font-weight: bold; color: #475569; width: 30%;">Thời gian (VN)</th>
                <th style="padding: 10px; font-size: 11px; font-weight: bold; color: #475569; width: 25%;">Trạng thái</th>
                <th style="padding: 10px; font-size: 11px; font-weight: bold; color: #475569; width: 45%;">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${(scraperLogs || []).slice(0, 15).map(s => {
                let statusBadge = '';
                if (s.status === 'success') {
                  statusBadge = '<span style="background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">THÀNH CÔNG</span>';
                } else if (s.status === 'failed') {
                  statusBadge = '<span style="background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">THẤT BẠI</span>';
                } else if (s.status === 'skipped') {
                  statusBadge = '<span style="background-color: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">BỎ QUA</span>';
                } else if (s.status === 'not_released_yet') {
                  statusBadge = '<span style="background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">CHƯA CÓ</span>';
                } else {
                  statusBadge = `<span style="background-color: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">${s.status.toUpperCase()}</span>`;
                }

                const localTimeStr = new Date(s.run_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                return `
                  <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                    <td style="padding: 8px 10px; color: #475569; white-space: nowrap;">${localTimeStr}</td>
                    <td style="padding: 8px 10px;">${statusBadge}</td>
                    <td style="padding: 8px 10px; color: #0f172a; word-break: break-word;">
                      ${s.message}
                      ${s.emails_sent > 0 ? `<div style="color: #10b981; font-weight: bold; font-size: 9px; margin-top: 2px;">✓ Đã gửi ${s.emails_sent} email</div>` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
              ${(!scraperLogs || scraperLogs.length === 0) ? `<tr><td colspan="3" style="padding: 15px; text-align: center; color: #64748b; font-size: 11px;">Không ghi nhận lượt chạy cào nào trong khoảng thời gian này.</td></tr>` : ''}
            </tbody>
          </table>
          ${(scraperLogs && scraperLogs.length > 15) ? `<div style="text-align: right; font-size: 10px; color: #64748b; margin-top: 5px;">* Chỉ hiển thị 15 lượt chạy gần nhất. Xem chi tiết hơn trong Admin Panel.</div>` : ''}
        </div>

        <div style="border-top: 2px solid #0f172a; padding-top: 15px; font-size: 11px; text-align: center; color: #64748b; font-family: sans-serif;">
          Email này được gửi tự động từ hệ thống giám sát <strong>Visa Auto Tracking</strong>.<br/>
          Để cấu hình lại báo cáo hoặc tắt email, vui lòng truy cập Bảng điều khiển Admin.
        </div>
      </div>
    `;

    // 5. Send Email to configured recipients
    const emailTo = reportConfig.to || 'hqhuan@gmail.com';
    const emailCc = reportConfig.cc || '';

    await sendMail({
      to: emailTo,
      cc: emailCc || undefined,
      subject: `[Visa Auto Tracking] Báo cáo tổng hợp ${periodName.toLowerCase()} (Truy cập & Nhật ký cào) (${dateFormatted})`,
      html
    });

    return NextResponse.json({
      success: true,
      message: `Báo cáo thống kê đã được gửi email thành công tới ${emailTo}${emailCc ? ` (Cc: ${emailCc})` : ''}.`,
      stats: {
        pageviews: totalViews,
        visitors: uniqueVisitors,
        sessions: uniqueSessions
      }
    });
  } catch (err: any) {
    console.error('Cron report error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
