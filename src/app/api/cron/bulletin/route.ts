import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { verifyCronOrAdminAuth } from "@/lib/auth_utils";
import { sendMail } from "@/lib/mail";

// Helper to calculate the next month's string and English name
function getNextMonth(monthStr: string): { month: string; englishName: string; year: number } {
  // input is e.g. "07/2026"
  const [m, y] = monthStr.split("/").map(Number);
  let nextM = m + 1;
  let nextY = y;
  if (nextM > 12) {
    nextM = 1;
    nextY += 1;
  }
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const formattedMonth = nextM.toString().padStart(2, "0");
  return {
    month: `${formattedMonth}/${nextY}`,
    englishName: monthNames[nextM - 1],
    year: nextY
  };
}

// Helper to parse dates from the Visa Bulletin format (e.g., "22OCT15", "C", "U")
function parseVisaBulletinDate(dateStr: string): string | null {
  const clean = dateStr.replace(/\s+/g, "").trim().toUpperCase();
  if (clean === "C" || clean === "CURRENT") {
    return "9999-12-31"; // Far in future for 'Current'
  }
  if (clean === "U" || clean === "UNAVAILABLE") {
    return "1900-01-01"; // Far in past for 'Unavailable'
  }
  const match = clean.match(/^(\d{1,2})([A-Z]{3})(\d{2}|\d{4})$/);
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const monthStr = match[2];
  let year = parseInt(match[3], 10);
  if (year < 100) {
    year += 2000;
  }
  
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
  };
  
  const month = months[monthStr];
  if (month === undefined) return null;
  
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

// Helper to parse the family-sponsored table rows
function parseFamilyTable(tableRows: string[][]) {
  const data: Record<string, string> = {};
  for (const row of tableRows) {
    if (row.length < 2) continue;
    const cat = row[0].trim().toUpperCase();
    if (["F1", "F2A", "F2B", "F3", "F4"].includes(cat)) {
      const dateVal = row[1].trim();
      const parsedDate = parseVisaBulletinDate(dateVal);
      if (parsedDate) {
        data[cat] = parsedDate;
      }
    }
  }
  return data;
}

// Helper to log scraper execution status in scraper_logs table and update global_settings cron status
async function logScraperStatus(
  supabaseAdmin: any,
  status: string,
  message: string,
  targetMonth?: string,
  emailsSent: number = 0,
  nextRun?: string
) {
  const now = new Date().toISOString();
  
  // 1. Insert into scraper_logs
  try {
    const { error } = await supabaseAdmin
      .from("scraper_logs")
      .insert({
        status,
        message,
        target_month: targetMonth || null,
        emails_sent: emailsSent
      });
    if (error) {
      console.warn("Failed to insert into scraper_logs table (it might not exist yet):", error.message);
    }
  } catch (err: any) {
    console.warn("Failed to insert into scraper_logs table (it might not exist yet):", err.message || err);
  }

  // 2. Fetch current cron_status config and update it
  try {
    const { data: cronStatusData } = await supabaseAdmin
      .from("global_settings")
      .select("config")
      .eq("id", "cron_status")
      .maybeSingle();

    const cronConfig = (cronStatusData?.config as any) || {};

    // Calculate next run if not provided
    let nextRunTime = nextRun;
    if (!nextRunTime) {
      const dayOfMonth = new Date(now).getDate();
      const { data: settingsData } = await supabaseAdmin
        .from("global_settings")
        .select("config")
        .eq("id", "site_settings")
        .maybeSingle();
      const siteSettings = (settingsData?.config as any) || {};
      const intervalNormal = Number(siteSettings.cronCheckIntervalNormal) || 24;
      const intervalPeak = Number(siteSettings.cronCheckIntervalPeak) || 6;
      const peakStartDay = Number(siteSettings.cronPeakStartDay) || 10;
      const peakEndDay = Number(siteSettings.cronPeakEndDay) || 20;

      let hasTargetMonth = false;
      if (targetMonth) {
        const { count } = await supabaseAdmin
          .from("visa_bulletin")
          .select("id", { count: "exact", head: true })
          .eq("month", targetMonth);
        hasTargetMonth = (count || 0) > 0;
      }

      const nextInterval = (hasTargetMonth || !(dayOfMonth >= peakStartDay && dayOfMonth <= peakEndDay)) ? intervalNormal : intervalPeak;
      nextRunTime = new Date(new Date(now).getTime() + nextInterval * 60 * 60 * 1000).toISOString();
    }

    await supabaseAdmin
      .from("global_settings")
      .upsert({
        id: "cron_status",
        config: {
          ...cronConfig,
          last_run: now,
          last_reason: message,
          next_run: nextRunTime
        },
        updated_at: now
      });
  } catch (err: any) {
    console.error("Failed to update cron_status in global_settings:", err.message || err);
  }
}

export async function POST(request: NextRequest) {
  // 1. Authorization check
  const isAuthorized = await verifyCronOrAdminAuth(request);
  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isForced = request.nextUrl.searchParams.get("force") === "true";
  const supabaseAdmin = getSupabaseAdminClient();

  try {
    // 2. Tính toán tháng mục tiêu thông minh dựa trên thời gian thực tế hiện tại
    const now = new Date();
    // Chuyển đổi sang múi giờ Việt Nam (GMT+7) hoặc Mỹ (GMT-5) để tính toán chính xác ngày tháng
    const year = now.getFullYear();
    const monthVal = now.getMonth() + 1; // 1-12
    
    // Tính tháng tiếp theo (tháng Visa Bulletin mới nhất có thể được công bố ở thời điểm hiện tại)
    let nextMonthVal = monthVal + 1;
    let nextYear = year;
    if (nextMonthVal > 12) {
      nextMonthVal = 1;
      nextYear += 1;
    }
    const formattedNextMonth = nextMonthVal.toString().padStart(2, "0");
    const targetMonthStr = `${formattedNextMonth}/${nextYear}`;

    // Kiểm tra xem lịch của tháng tiếp theo (targetMonthStr) đã có trong Database chưa
    const { data: targetExists } = await supabaseAdmin
      .from("bulletins")
      .select("id")
      .eq("month", targetMonthStr)
      .limit(1);

    const hasTargetMonth = targetExists && targetExists.length > 0;

    // Nếu ĐÃ CÓ lịch của tháng tiếp theo rồi, tức là hệ thống đang hoàn toàn Up to date!
    // Không cần quét tìm lịch của tháng tiếp theo nữa (ví dụ: đang tháng 7, đã có lịch tháng 8, không cần quét tháng 9)
    if (hasTargetMonth && !isForced) {
      await logScraperStatus(supabaseAdmin, "already_up_to_date", `Hệ thống đã cập nhật lịch Visa Bulletin mới nhất (${targetMonthStr}) phù hợp với thời điểm hiện tại. Không cần quét thêm.`, targetMonthStr);
      return Response.json({
        success: true,
        status: "already_up_to_date",
        message: `Hệ thống đã cập nhật lịch Visa Bulletin mới nhất (${targetMonthStr}) phù hợp với thời điểm hiện tại (tháng ${monthVal.toString().padStart(2, "0")}/${year}). Không cần quét thêm.`,
        currentMonth: `${monthVal.toString().padStart(2, "0")}/${year}`,
        latestMonthInDB: targetMonthStr
      });
    }

    // Xác định target cào là targetMonthStr
    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];
    const target = {
      month: targetMonthStr,
      englishName: monthNames[nextMonthVal - 1],
      year: nextYear
    };

    // Tải cấu hình site_settings từ database để lấy các tham số cào dữ liệu và chu kỳ
    const { data: settingsData } = await supabaseAdmin
      .from("global_settings")
      .select("config")
      .eq("id", "site_settings")
      .maybeSingle();
    const siteSettings = (settingsData?.config as any) || {};

    // 3. Adaptive Polling Schedule Check
    const dayOfMonth = now.getDate();

    const { data: cronStatusData } = await supabaseAdmin
      .from("global_settings")
      .select("config")
      .eq("id", "cron_status")
      .maybeSingle();

    const cronConfig = (cronStatusData?.config as any) || {};
    const lastRunStr = cronConfig.last_run;
    const lastRun = lastRunStr ? new Date(lastRunStr) : new Date(0);
    const msSinceLastRun = now.getTime() - lastRun.getTime();

    // Các tham số cấu hình chu kỳ cào từ Database
    const intervalNormal = Number(siteSettings.cronCheckIntervalNormal) || 24;
    const intervalPeak = Number(siteSettings.cronCheckIntervalPeak) || 6;
    const peakStartDay = Number(siteSettings.cronPeakStartDay) || 10;
    const peakEndDay = Number(siteSettings.cronPeakEndDay) || 20;

    let shouldRun = false;
    let scheduleReason = "";

    if (hasTargetMonth) {
      shouldRun = msSinceLastRun >= intervalNormal * 60 * 60 * 1000 - 10 * 60 * 1000; // Normal interval with 10 min buffer
      scheduleReason = `Target month already exists. Checking every ${intervalNormal} hours.`;
    } else {
      if (dayOfMonth >= peakStartDay && dayOfMonth <= peakEndDay) {
        shouldRun = msSinceLastRun >= intervalPeak * 60 * 60 * 1000 - 10 * 60 * 1000; // Peak interval with 10 min buffer
        scheduleReason = `Peak window (${peakStartDay}-${peakEndDay}th) and target month missing. Checking every ${intervalPeak} hours.`;
      } else {
        shouldRun = msSinceLastRun >= intervalNormal * 60 * 60 * 1000 - 10 * 60 * 1000; // Normal interval
        scheduleReason = `Outside peak window. Checking every ${intervalNormal} hours.`;
      }
    }

    const nextAllowedRun = new Date(lastRun.getTime() + (hasTargetMonth || !(dayOfMonth >= peakStartDay && dayOfMonth <= peakEndDay) ? intervalNormal : intervalPeak) * 60 * 60 * 1000).toISOString();

    if (!shouldRun && !isForced) {
      await logScraperStatus(supabaseAdmin, "skipped", `Chu kỳ cào bỏ qua: ${scheduleReason}`, targetMonthStr, 0, nextAllowedRun);
      return Response.json({
        success: true,
        status: "skipped",
        reason: scheduleReason,
        lastRun: lastRun.toISOString(),
        nextAllowedRun
      });
    }

    // Update cron last run status
    const nextRunTime = new Date(now.getTime() + (hasTargetMonth || !(dayOfMonth >= peakStartDay && dayOfMonth <= peakEndDay) ? intervalNormal : intervalPeak) * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("global_settings")
      .upsert({
        id: "cron_status",
        config: {
          ...cronConfig,
          last_run: now.toISOString(),
          last_reason: scheduleReason,
          next_run: nextRunTime
        },
        updated_at: now.toISOString()
      });

    // 4. Fetch and Scrape travel.state.gov (Support Cloudflare Bypass via ScraperAPI/Custom Proxy)
    const url = `https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/${target.year}/visa-bulletin-for-${target.englishName}-${target.year}.html`;
    let html = "";
    let pageFound = false;

    const scraperApiKey = siteSettings.scraperApiKey || process.env.SCRAPER_API_KEY;
    const scraperUrlTemplate = siteSettings.scraperUrlTemplate;

    const fetchWithProxy = async (targetUrl: string) => {
      const executeFetch = async (proxyUrl: string, isDirect = false) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90_000);
        const fetchOpts: RequestInit = { signal: controller.signal };
        try {
          if (isDirect) {
            return await fetch(targetUrl, {
              ...fetchOpts,
              headers: { 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
              } 
            });
          }
          return await fetch(proxyUrl, fetchOpts);
        } finally {
          clearTimeout(timeoutId);
        }
      };

      // 1. TH1: Sử dụng URL cào tùy chỉnh nếu được cấu hình (E.g. ZenRows, Apify, ...)
      if (scraperUrlTemplate && scraperUrlTemplate.includes("{url}")) {
        let proxyUrl = scraperUrlTemplate.replace("{url}", encodeURIComponent(targetUrl));
        if (scraperApiKey) {
          proxyUrl = proxyUrl.replace("{key}", encodeURIComponent(scraperApiKey));
        }
        // Auto-inject js_render=true và antibot=true cho ZenRows nếu chưa có (bắt buộc để bypass Cloudflare)
        if (proxyUrl.includes("zenrows.com")) {
          if (!proxyUrl.includes("js_render=")) {
            proxyUrl += (proxyUrl.includes("?") ? "&" : "?") + "js_render=true";
          }
          if (!proxyUrl.includes("antibot=")) {
            proxyUrl += (proxyUrl.includes("?") ? "&" : "?") + "antibot=true";
          }
        }
        console.log("[Scraper] Trying custom URL template, target:", targetUrl.substring(0, 80));
        try {
          const res = await executeFetch(proxyUrl);
          if (res.status === 200 || res.status === 404) {
            return res;
          }
          console.warn(`[Scraper] Custom template failed with status ${res.status}. Falling back to default ScraperAPI...`);
        } catch (err) {
          console.warn("[Scraper] Custom template threw error:", err, "Falling back to default ScraperAPI...");
        }
      }

      // 2. TH2: Sử dụng ScraperAPI với Premium + Render làm phương án dự phòng chính
      if (scraperApiKey) {
        let proxyUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}&premium=true&render=true`;
        console.log("[Scraper] Trying ScraperAPI (Fallback Premium+Render), target:", targetUrl.substring(0, 80));
        try {
          const res = await executeFetch(proxyUrl);
          if (res.status === 200 || res.status === 404) {
            return res;
          }
          console.warn(`[Scraper] ScraperAPI (Premium+Render) failed with status ${res.status}. Trying standard ScraperAPI...`);
        } catch (err) {
          console.warn("[Scraper] ScraperAPI (Premium+Render) threw error:", err);
        }

        // Thử ScraperAPI tiêu chuẩn
        let stdProxyUrl = `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}`;
        if (siteSettings.scraperUsePremium) {
          stdProxyUrl += `&premium=true&country_code=us`;
        }
        if (siteSettings.scraperUseRender) {
          stdProxyUrl += `&render=true`;
        }
        console.log("[Scraper] Trying standard ScraperAPI, target:", targetUrl.substring(0, 80));
        try {
          const res = await executeFetch(stdProxyUrl);
          if (res.status === 200 || res.status === 404) {
            return res;
          }
          console.warn(`[Scraper] Standard ScraperAPI failed with status ${res.status}.`);
        } catch (err) {
          console.warn("[Scraper] Standard ScraperAPI threw error:", err);
        }
      }

      // 3. TH3: Tải trực tiếp không dùng proxy (Direct Fetch)
      console.log("[Scraper] Trying direct fetch (no proxy), target:", targetUrl.substring(0, 80));
      return await executeFetch("", true);
    };

    try {
      const res = await fetchWithProxy(url);
      if (res.status === 200) {
        html = await res.text();
        pageFound = true;
      } else if (res.status !== 404) {
        // Đọc nội dung lỗi chi tiết để hỗ trợ chẩn đoán cấu hình
        const errText = await res.text().catch(() => "");
        throw new Error(`HTTP status ${res.status}: ${errText.substring(0, 150)}`);
      } else {
        // Fallback: search the landing page
        const landingRes = await fetchWithProxy("https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html");
        if (landingRes.status === 200) {
          const landingHtml = await landingRes.text();
          const regex = new RegExp(`href="([^"]*?visa-bulletin[^"]*?${target.englishName}[^"]*?${target.year}[^"]*?)"`, "i");
          const match = landingHtml.match(regex);
          if (match && match[1]) {
            let matchedUrl = match[1];
            if (!matchedUrl.startsWith("http")) {
              matchedUrl = `https://travel.state.gov${matchedUrl.startsWith("/") ? "" : "/content/travel/en/legal/visa-law0/"}${matchedUrl}`;
            }
            const bulletRes = await fetchWithProxy(matchedUrl);
            if (bulletRes.status === 200) {
              html = await bulletRes.text();
              pageFound = true;
            } else {
              const errText = await bulletRes.text().catch(() => "");
              throw new Error(`HTTP status ${bulletRes.status} on matched URL: ${errText.substring(0, 150)}`);
            }
          }
        } else {
          const errText = await landingRes.text().catch(() => "");
          throw new Error(`HTTP status ${landingRes.status} on landing page: ${errText.substring(0, 150)}`);
        }
      }
    } catch (fetchErr: any) {
      console.error("Fetch error during scraping:", fetchErr);
      await logScraperStatus(supabaseAdmin, "failed", `Lỗi tải trang: ${fetchErr.message || fetchErr}`, target.month);
      // Fallback: send email alert on network error if not already alerted
      await triggerAdminAlertEmail(supabaseAdmin, target.month, `Lỗi mạng/kết nối: ${fetchErr.message || fetchErr}`);
      return Response.json({ error: `Fetch error: ${fetchErr.message}` }, { status: 500 });
    }

    if (!pageFound) {
      await logScraperStatus(supabaseAdmin, "not_released_yet", `Lịch Visa Bulletin tháng ${target.month} chưa được phát hành trên travel.state.gov.`, target.month);
      // 404 is normal before bulletin release
      return Response.json({
        success: true,
        status: "not_released_yet",
        message: `Lịch Visa Bulletin tháng ${target.month} chưa được phát hành trên travel.state.gov.`
      });
    }

    // 5. Parse the tables
    const familyTables: string[][][] = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let match;

    while ((match = tableRegex.exec(html)) !== null) {
      const tableHtml = match[1];
      const tableRows: string[][] = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const rowHtml = rowMatch[1];
        const cells: string[] = [];
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          const cellText = cellMatch[1]
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          cells.push(cellText);
        }
        if (cells.length > 0) {
          tableRows.push(cells);
        }
      }

      // Check if this table has Family categories
      let matchCount = 0;
      for (const row of tableRows) {
        if (row.length > 0) {
          const firstCell = row[0].trim().toUpperCase();
          if (["F1", "F2A", "F2B", "F3", "F4"].includes(firstCell)) {
            matchCount++;
          }
        }
      }

      if (matchCount >= 4) {
        familyTables.push(tableRows);
      }
    }

    // Validate if Table A and B are parsed
    if (familyTables.length < 2) {
      console.error("Parsed fewer than 2 Family preference tables. Length:", familyTables.length);
      await logScraperStatus(supabaseAdmin, "failed", `Lỗi phân tích: Tìm thấy ít hơn 2 bảng gia đình trong HTML.`, target.month);
      await triggerAdminAlertEmail(supabaseAdmin, target.month, `Không thể tìm thấy đủ 2 bảng lịch gia đình (Table A và Table B) trong HTML trang web.`);
      return Response.json({ error: "Parsing failed: Table structure changed" }, { status: 500 });
    }

    const finalActionDates = parseFamilyTable(familyTables[0]);
    const filingDates = parseFamilyTable(familyTables[1]);
    const categories = ["F1", "F2A", "F2B", "F3", "F4"];
    const hasAll = categories.every(cat => finalActionDates[cat] && filingDates[cat]);

    if (!hasAll) {
      console.error("Missing categories in parsed data:", { finalActionDates, filingDates });
      await logScraperStatus(supabaseAdmin, "failed", `Lỗi phân tích: Thiếu diện F1-F4 trong dữ liệu cào.`, target.month);
      await triggerAdminAlertEmail(supabaseAdmin, target.month, `Dữ liệu phân tích bị thiếu hoặc không đúng định dạng diện F1-F4.`);
      return Response.json({ error: "Parsing failed: Missing category data" }, { status: 500 });
    }

    // 6. Save newly crawled monthly data to Database
    for (const cat of categories) {
      // Clean up previous values
      await supabaseAdmin
        .from("bulletins")
        .delete()
        .eq("month", target.month)
        .eq("category", cat)
        .eq("chargeability", "All Areas");

      // Insert new values
      const { error: insertErr } = await supabaseAdmin
        .from("bulletins")
        .insert({
          month: target.month,
          category: cat,
          chargeability: "All Areas",
          final_action_date: finalActionDates[cat],
          filing_date: filingDates[cat]
        });

      if (insertErr) throw insertErr;
    }

    // Revalidate cached pages so the homepage and dashboard reflect the new month immediately
    try {
      revalidatePath("/");
      revalidatePath("/dashboard");
      revalidatePath("/admin");
    } catch (revalErr) {
      console.warn("revalidatePath warning:", revalErr);
    }

    // 7. Load all active cases to evaluate notifications
    // Filter profiles where status is active
    const { data: casesList, error: casesError } = await supabaseAdmin
      .from("cases")
      .select(`
        id,
        user_id,
        name,
        category,
        priority_date,
        profiles:user_id ( email, enable_drip_emails, status )
      `);

    if (casesError) throw casesError;

    // Load Drip Day 0 Article
    const { data: art } = await supabaseAdmin
      .from("articles")
      .select("id")
      .eq("drip_day", 0)
      .single();

    const emailNotifications = [];

    for (const userCase of (casesList || [])) {
      const profile = Array.isArray(userCase.profiles) ? userCase.profiles[0] : userCase.profiles;
      
      // Skip notifications if profile is inactive, email is disabled, or email is empty
      if (!profile || profile.status === "inactive" || !profile.enable_drip_emails) {
        continue;
      }

      // Check if Day 0 drip mail was already sent/queued to avoid duplicate
      if (art) {
        const { data: existingDrip } = await supabaseAdmin
          .from("drip_queues")
          .select("id")
          .eq("user_id", userCase.user_id)
          .eq("article_id", art.id)
          .limit(1);

        if (existingDrip && existingDrip.length > 0) {
          continue;
        }
      }

      // Find bulletin dates
      const newFilingDateStr = filingDates[userCase.category];
      if (!newFilingDateStr) continue;

      const priorityDate = new Date(userCase.priority_date);
      const newFilingDate = new Date(newFilingDateStr);

      const isNowFilingCurrent = priorityDate <= newFilingDate;

      if (isNowFilingCurrent) {
        try {
          const emailResult = await sendMail({
            to: profile.email,
            subject: `[VisaTracker] 🎉 Hồ sơ ${userCase.name} (${userCase.category}) đã đến hạn nộp đơn - Bulletin ${target.month}!`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background-color: #fefce8; color: #18181b;">
                <div style="background-color: #ffffff; border: 1px solid #18181b; border-radius: 16px; padding: 30px; box-shadow: 4px 4px 0px #18181b; max-width: 600px; margin: 0 auto;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <div>
                      <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.05em;">VisaTracker</div>
                      <div style="width: 40px; height: 3px; background-color: #f59e0b; margin-top: 4px;"></div>
                    </div>
                    <span style="background-color: #f59e0b; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase;">Cảnh báo · Đến hạn</span>
                  </div>

                  <div style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); border-radius: 12px; padding: 22px; margin-bottom: 24px; text-align: center;">
                    <div style="font-size: 36px; margin-bottom: 8px;">🎉</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 900; line-height: 1.3;">
                      Chúc mừng! Hồ sơ của bạn đã đến hạn nộp đơn!
                    </h1>
                    <p style="color: #fef3c7; font-size: 12px; margin: 8px 0 0 0;">Visa Bulletin chính thức tháng ${target.month} vừa được công bố</p>
                  </div>

                  <div style="color: #333333; line-height: 1.7; font-size: 14px;">
                    <p style="margin: 0 0 12px 0;">Chào bạn,</p>
                    <p style="margin: 0 0 16px 0;">Hệ thống <strong>VisaTracker</strong> phát hiện lịch Visa Bulletin mới tháng <strong>${target.month}</strong> vừa được Bộ Ngoại Giao Hoa Kỳ công bố và <strong>hồ sơ của bạn đã đến hạn nộp đơn</strong> (Filing Date Current).</p>

                    <div style="background-color: #fffbeb; border: 1px solid #fbbf24; padding: 18px; border-radius: 12px; margin: 16px 0;">
                      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #92400e;">📋 Thông tin hồ sơ</p>
                      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px;">
                        <tr>
                          <td style="padding: 5px 0; color: #6b7280; width: 50%;">Tên hồ sơ:</td>
                          <td style="padding: 5px 0; font-weight: 700;">${userCase.name}</td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #6b7280;">Diện bảo lãnh:</td>
                          <td style="padding: 5px 0; font-weight: 700;">${userCase.category}</td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #6b7280;">Priority Date:</td>
                          <td style="padding: 5px 0; font-weight: 700;">${new Date(userCase.priority_date).toLocaleDateString("vi-VN")}</td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #6b7280;">Filing Date tháng ${target.month}:</td>
                          <td style="padding: 5px 0; font-weight: 700; color: #059669;">${new Date(newFilingDate).toLocaleDateString("vi-VN")} ✓ Current</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0 0 0; color: #6b7280; border-top: 1px dashed #fbbf24;">Nguồn kiểm chứng:</td>
                          <td style="padding: 8px 0 0 0; font-weight: 700; border-top: 1px dashed #fbbf24;">
                            <a href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" target="_blank" style="color: #d97706; text-decoration: underline;">U.S. Department of State (travel.state.gov)</a>
                          </td>
                        </tr>
                      </table>
                    </div>

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

                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" style="background-color: #18181b; color: #ffffff; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; border: 2px solid #18181b; display: inline-block;">
                      Vào Dashboard Xem Lộ Trình →
                    </a>
                  </div>

                  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                  <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.6;">
                    <strong>VisaTracker</strong> · Theo dõi tự động tiến trình hồ sơ di trú Mỹ<br/>
                    Quản lý thông báo tại <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" style="color:#f59e0b; text-decoration: none;">trang cài đặt</a> của bạn.
                  </p>
                </div>
              </div>
            `
          });
          
          emailNotifications.push({ email: profile.email, status: "sent", id: emailResult.id });

          if (art) {
            await supabaseAdmin.from("drip_queues").insert({
              user_id: userCase.user_id,
              article_id: art.id,
              scheduled_for: new Date().toISOString(),
              sent_at: new Date().toISOString(),
              status: "sent"
            });
          }
        } catch (mailErr: any) {
          console.error(`Failed to send email to ${profile.email}:`, mailErr);
          emailNotifications.push({ email: profile.email, status: "failed", error: mailErr.message });
        }
      }
    }

    // Gửi email thông báo cào dữ liệu thành công cho Admin
    await triggerAdminSuccessEmail(supabaseAdmin, target.month, emailNotifications.length);

    await logScraperStatus(supabaseAdmin, "success", `Cập nhật thành công lịch tháng ${target.month}. Đã gửi ${emailNotifications.length} email thông báo.`, target.month, emailNotifications.length);

    return Response.json({
      success: true,
      status: "scraped_and_saved",
      message: `Lịch Visa Bulletin tháng ${target.month} đã được cào và cập nhật thành công.`,
      targetMonth: target.month,
      bulletinsScraped: categories.length,
      emailsSentCount: emailNotifications.length,
      emailsDetail: emailNotifications
    });

  } catch (err: any) {
    console.error("API error:", err);
    try {
      const errorMsg = err.message || JSON.stringify(err);
      await logScraperStatus(supabaseAdmin, "failed", `Lỗi xử lý API: ${errorMsg.substring(0, 250)}`);
    } catch (_) {}
    return Response.json({ error: err.message || err }, { status: 500 });
  }
}

// Helper to trigger and limit alert emails to Admin
async function triggerAdminAlertEmail(supabaseAdmin: any, targetMonth: string, errorMessage: string) {
  try {
    const { data: cronStatusData } = await supabaseAdmin
      .from("global_settings")
      .select("config")
      .eq("id", "cron_status")
      .maybeSingle();

    const cronConfig = (cronStatusData?.config as any) || {};
    // Check if we already sent alert email for this target month to avoid spam
    if (cronConfig.last_alert_month === targetMonth) {
      console.log(`Alert email already sent for month ${targetMonth}, skipping.`);
      return;
    }

    const { data: adminProfiles } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("role", "admin");

    const adminEmails = adminProfiles?.map((a: any) => a.email).filter(Boolean) || [];
    if (adminEmails.length === 0) return;

    await sendMail({
      to: adminEmails,
      subject: `[VisaTracker] ⚠️ Cảnh báo: Lỗi cào lịch tự động Visa Bulletin ${targetMonth}!`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <h2 style="margin-top: 0; color: #990000; font-size: 20px;">Phát hiện lỗi cào lịch tự động</h2>
          <p style="color: #1f2937;">Hệ thống tự động phát hiện lịch Visa Bulletin cho tháng <strong>${targetMonth}</strong> có thể đã được phát hành hoặc đang trong thời điểm cập nhật, nhưng tiến trình cào tự động thất bại.</p>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #fecaca; margin: 15px 0;">
            <strong>Chi tiết lỗi kỹ thuật:</strong><br/>
            <code style="color: #ef4444; font-family: monospace; display: block; margin-top: 5px;">${errorMessage}</code>
          </div>
          <p style="color: #4b5563;">Vui lòng kiểm tra thủ công trang web gốc của Bộ Ngoại Giao Hoa Kỳ và sử dụng tính năng <strong>Ghi đè thủ công (Manual Override)</strong> trong trang quản trị Admin để cập nhật lịch mới kịp thời cho người dùng.</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://visatracking.io.vn'}/admin" style="background-color: #ef4444; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Truy cập Trang Admin</a>
          </div>
        </div>
      `
    });

    // Mark alert as sent in settings
    await supabaseAdmin
      .from("global_settings")
      .upsert({
        id: "cron_status",
        config: {
          ...cronConfig,
          last_alert_month: targetMonth,
          last_alert_time: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      });

    console.log(`Alert email sent successfully to admins for ${targetMonth}`);
  } catch (err) {
    console.error("Failed to send admin alert email:", err);
  }
}

// Helper gửi email thông báo cào lịch thành công cho Admin
async function triggerAdminSuccessEmail(supabaseAdmin: any, targetMonth: string, emailsCount: number) {
  try {
    const { data: adminProfiles } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("role", "admin");

    const adminEmails = adminProfiles?.map((a: any) => a.email).filter(Boolean) || [];
    if (adminEmails.length === 0) return;

    await sendMail({
      to: adminEmails,
      subject: `[VisaTracker] 🎉 Thành công: Lịch Visa Bulletin tháng ${targetMonth} đã cập nhật!`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <h2 style="margin-top: 0; color: #15803d; font-size: 20px;">Cập nhật Visa Bulletin thành công</h2>
          <p style="color: #1f2937;">Lịch Visa Bulletin mới tháng <strong>${targetMonth}</strong> đã được hệ thống tự động cào và cập nhật thành công từ trang web Bộ Ngoại giao Mỹ.</p>
          
          <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #dcfce7; margin: 15px 0;">
            <strong>Thông tin cập nhật:</strong>
            <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #374151;">
              <li>Tháng cập nhật: <strong>${targetMonth}</strong></li>
              <li>Số lượng email thông báo gửi đi cho các thành viên đến hạn: <strong>${emailsCount} email</strong></li>
              <li>Thời gian hoàn tất: <strong>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</strong></li>
            </ul>
          </div>
          
          <p style="color: #4b5563;">Hệ thống đã lưu trữ các bản ghi chi tiết bảng Final Action Dates và Dates for Filing vào cơ sở dữ liệu.</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://visatracking.io.vn'}/admin" style="background-color: #15803d; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Xem Bảng Điều Khiển Admin</a>
          </div>
        </div>
      `
    });

    console.log(`Success email sent to admins for ${targetMonth}`);
  } catch (err) {
    console.error("Failed to send admin success email:", err);
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return POST(request);
}
