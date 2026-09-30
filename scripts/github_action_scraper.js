/**
 * GitHub Action Visa Bulletin Scraper
 * 
 * Script này được thực thi tự động bởi GitHub Actions (chạy trên dải IP Microsoft Azure).
 * Giúp vượt qua Cloudflare chống cào dữ liệu của travel.state.gov 100% miễn phí và đáng tin cậy.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://visatracking.io.vn";
const CRON_SECRET = process.env.CRON_SECRET;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Lỗi: Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong environment variables.");
  process.exit(1);
}

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=minimal"
};

// Helper tính toán tháng hiện tại và tháng tiếp theo
function getTargetMonths() {
  const now = new Date();
  const currentM = now.getMonth() + 1; // 1-12
  const currentY = now.getFullYear();

  let nextM = currentM + 1;
  let nextY = currentY;
  if (nextM > 12) {
    nextM = 1;
    nextY += 1;
  }

  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  const pad = (n) => n.toString().padStart(2, "0");

  return [
    {
      monthStr: `${pad(nextM)}/${nextY}`,
      englishName: monthNames[nextM - 1],
      year: nextY
    },
    {
      monthStr: `${pad(currentM)}/${currentY}`,
      englishName: monthNames[currentM - 1],
      year: currentY
    }
  ];
}

// Helper parse định dạng ngày Visa Bulletin (22OCT15, C, U) -> YYYY-MM-DD
function parseVisaBulletinDate(dateStr) {
  const clean = dateStr.replace(/\s+/g, "").trim().toUpperCase();
  if (clean === "C" || clean === "CURRENT") {
    return "9999-12-31";
  }
  if (clean === "U" || clean === "UNAVAILABLE") {
    return "1900-01-01";
  }
  const match = clean.match(/^(\d{1,2})([A-Z]{3})(\d{2}|\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const monthStr = match[2];
  let year = parseInt(match[3], 10);
  if (year < 100) {
    year += 2000;
  }

  const months = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
  };

  const month = months[monthStr];
  if (month === undefined) return null;

  const pad = (n) => n.toString().padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function isCaptchaPage(html) {
  const cleanHtml = html.toLowerCase();
  return cleanHtml.includes("g-recaptcha") || 
         cleanHtml.includes("hcaptcha") || 
         cleanHtml.includes("cf-challenge") ||
         cleanHtml.includes("attention required! | cloudflare");
}

function parseFamilyTable(tableRows) {
  const data = {};
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

async function logScraperStatus(status, message, targetMonth, emailsSent = 0) {
  const now = new Date().toISOString();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scraper_logs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        target_month: targetMonth || null,
        status,
        message,
        emails_sent: emailsSent,
        created_at: now
      })
    });

    // Update cron_status in global_settings
    await fetch(`${SUPABASE_URL}/rest/v1/global_settings?id=eq.cron_status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        config: {
          last_run: now,
          last_alert_month: targetMonth || null,
          last_reason: message
        },
        updated_at: now
      })
    });
  } catch (err) {
    console.error("Lỗi khi ghi log scraper:", err.message);
  }
}

async function fetchPage(url) {
  console.log(`🌐 Đang tải trang: ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"'
    }
  });

  if (res.status === 404) return { status: 404, html: "" };
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

  const html = await res.text();
  if (isCaptchaPage(html)) {
    throw new Error(`Trang trả về thách thức Cloudflare (Captcha Challenge)`);
  }
  return { status: 200, html };
}

async function triggerSiteSyncApi() {
  if (!CRON_SECRET) {
    console.log("ℹ️ Không tìm thấy CRON_SECRET, bỏ qua việc gọi API /api/cron/bulletin.");
    return false;
  }
  const syncUrl = `${SITE_URL}/api/cron/bulletin?force=true`;
  console.log(`🚀 Kích hoạt API đồng bộ ứng dụng: ${syncUrl}`);
  try {
    const res = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json"
      }
    });
    const data = await res.json().catch(() => ({}));
    console.log("-> Kết quả phản hồi từ API Web:", res.status, data);
    return res.ok;
  } catch (err) {
    console.warn("⚠️ Gọi API web gặp lỗi:", err.message);
    return false;
  }
}

async function main() {
  console.log("=== BẮT ĐẦU QUÁ TRÌNH CÀO VISA BULLETIN TỰ ĐỘNG THÔNG QUA GITHUB ACTIONS ===");

  const targets = getTargetMonths();
  let successMonth = null;

  for (const target of targets) {
    console.log(`\n🔍 Kiểm tra lịch tháng target: ${target.monthStr}...`);
    const bulletinUrl = `https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/${target.year}/visa-bulletin-for-${target.englishName}-${target.year}.html`;

    try {
      const pageResult = await fetchPage(bulletinUrl);
      if (pageResult.status === 404) {
        console.log(`-> Lịch tháng ${target.monthStr} chưa phát hành trên travel.state.gov (HTTP 404).`);
        continue;
      }

      const html = pageResult.html;
      // Parse các bảng
      const familyTables = [];
      const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      let match;

      while ((match = tableRegex.exec(html)) !== null) {
        const tableHtml = match[1];
        const tableRows = [];
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
          const rowHtml = rowMatch[1];
          const cells = [];
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

      if (familyTables.length < 2) {
        console.log(`-> Không tìm thấy đủ 2 bảng Family preferences trong HTML tháng ${target.monthStr}.`);
        continue;
      }

      const finalActionDates = parseFamilyTable(familyTables[0]);
      const filingDates = parseFamilyTable(familyTables[1]);
      const categories = ["F1", "F2A", "F2B", "F3", "F4"];
      const hasAll = categories.every(cat => finalActionDates[cat] && filingDates[cat]);

      if (!hasAll) {
        console.log(`-> Dữ liệu phân tích bị thiếu các diện F1-F4.`);
        continue;
      }

      console.log(`🎉 TÌM THẤY LỊCH MỚI THÁNG ${target.monthStr}!`);
      console.log("-> Bảng Final Action Dates:", finalActionDates);
      console.log("-> Bảng Dates for Filing:", filingDates);

      // Lưu vào Supabase DB
      for (const cat of categories) {
        await fetch(`${SUPABASE_URL}/rest/v1/bulletins?month=eq.${target.monthStr}&category=eq.${cat}&chargeability=eq.All%20Areas`, {
          method: "DELETE",
          headers
        });

        await fetch(`${SUPABASE_URL}/rest/v1/bulletins`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            month: target.monthStr,
            category: cat,
            chargeability: "All Areas",
            final_action_date: finalActionDates[cat],
            filing_date: filingDates[cat]
          })
        });
      }

      await logScraperStatus("success", `GitHub Action cào và cập nhật thành công lịch Visa Bulletin tháng ${target.monthStr}`, target.monthStr);
      
      // Kích hoạt API của trang web để gửi email thông báo
      await triggerSiteSyncApi();

      successMonth = target.monthStr;
      break;

    } catch (err) {
      console.error(`❌ Lỗi khi tải tháng ${target.monthStr}:`, err.message);
    }
  }

  if (!successMonth) {
    console.log("ℹ️ Không tìm thấy lịch mới hoặc chưa có thay đổi.");
  }

  console.log("\n=== HOÀN TẤT TIẾN TRÌNH GITHUB ACTION SCRAPER ===");
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
