import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, Clock, Calendar } from "lucide-react";

interface ArticleRecord {
  id: string;
  title: string;
  slug: string;
  content: string;
  drip_day: number | null;
  seo_description?: string | null;
  seo_keyword?: string | null;
  created_at: string;
}

// Resilient Fallback data including full markdown content from mock data
const FALLBACK_ARTICLES: ArticleRecord[] = [
  {
    id: "art-1",
    title: "Bản đồ vỡ lòng định cư Mỹ: Phân biệt USCIS, NVC và Lãnh sự quán từ con số 0",
    slug: "ban-do-vo-long-dinh-cu-my-phan-biet-uscis-nvc-va-lanh-su-quan",
    content: `# Bản đồ vỡ lòng định cư Mỹ: Phân biệt USCIS, NVC và Lãnh sự quán từ con số 0

Chào anh em. Khi bắt đầu bước vào hành trình làm hồ sơ định cư Mỹ, nhiều anh em thường rơi vào trạng thái **mông lung** trước một rừng thuật ngữ. Nhìn vào đống giấy tờ, ai cũng thấy mọi thứ thật **mù mịt** và **bất an**. Đó là một chặng đường dài đầy sự **rắc rối** khiến chúng ta dễ **mệt mỏi**. Nhiều người đã phải rơi vào thế **thụ động** và đầy **lo âu** chỉ vì không biết hồ sơ của mình đang nằm ở đâu.

Để thoát khỏi cảnh này, anh em bắt đầu **lùng sục** thông tin trên các diễn đàn mạng. Chúng ta ra sức **hỏi han** khắp nơi từ người quen đến người lạ để mong tìm được lối đi. Sau đó, anh em tự mình **dịch thuật** rồi **nộp đơn** lên hệ thống. Nhưng rồi tháng này qua tháng khác, anh em lại tiếp tục **chờ đợi** và ngày nào cũng **check** thủ công trang trạng thái để xem hồ sơ đã được chuyển giao hay chưa.

Thực ra, để không bị ngợp, anh em cần nhìn rõ bức tranh tổng quan của một bộ hồ sơ từ lúc nộp đơn cho đến ngày cầm visa trên tay. Hành trình này bắt buộc phải đi qua 4 chặng lớn sau:

## I. Tổng Quan Vòng Đời Của Một Bộ Hồ Sơ Định Cư Mỹ

*   **Chặng 1: Khởi động (USCIS tiếp nhận & xét duyệt):** Người bảo lãnh ở Mỹ nộp hồ sơ bảo lãnh lên USCIS để xét duyệt tính pháp lý của mối quan hệ (thường mất từ 1 đến 3 năm tùy diện).
*   **Chặng 2: Xếp hàng đằng đẵng (Chờ lịch Visa tại NVC - Mất từ 7 đến 15 năm):** Sau khi được duyệt, hồ sơ được chuyển sang NVC. Tại đây, hồ sơ của các diện F sẽ nằm chờ "ngủ đông" cho đến khi Ngày ưu tiên (Priority Date) đến lượt. Đây chính là giai đoạn kéo dài hàng chục năm khiến nhiều gia đình kiệt sức.
*   **Chặng 3: Chuẩn bị & Xét duyệt (Giai đoạn NVC mở):** Khi Lịch Visa mở đến Ngày ưu tiên, NVC mới "đánh thức" hồ sơ, cho phép đóng phí, khai đơn DS-260 và nộp giấy tờ dân sự để đạt trạng thái DQ.
*   **Chặng 4: Về đích (Lãnh sự quán phỏng vấn):** Hồ sơ chuyển về Việt Nam. Anh em đi khám sức khỏe và vào phỏng vấn trực tiếp tại Lãnh sự quán Mỹ để lấy visa.

Để giúp anh em hiểu rõ vì sao mình phải chờ đợi hàng chục năm, dưới đây là chi tiết về 3 cơ quan chịu trách nhiệm và **mốc thời gian thực tế tại Việt Nam**:

---

## II. Chi Tiết 3 Trạm Dừng Chân Và Thời Gian Chờ Đợi Thực Tế

### 1. Trạm số 1: Sở Di trú Mỹ (USCIS - U.S. Citizenship and Immigration Services)
*   **Họ là ai?** Cơ quan duyệt đơn bảo lãnh ban đầu để xác định mối quan hệ thân nhân là thật hay giả.
*   **Mã số quản lý:** Mã biên nhận **Receipt Number** (Ví dụ bắt đầu bằng: WAC, EAC, LIN, SRC...).
*   **Mốc thời gian thực tế:** Sau khi USCIS duyệt đơn (Approved), họ gửi thư I-797. USCIS cần từ **45 đến 90 ngày** để chuyển thông tin điện tử sang NVC.

### 2. Trạm số 2: Trung tâm Thị thực Quốc gia (NVC - National Visa Center)
*   **Họ là ai?** Nơi rà soát tài chính của người bảo lãnh và giấy tờ nhân thân của anh em.
*   **Cú lừa \"Chờ đợi hàng chục năm\" tại NVC:** Nhiều anh em thấy hồ sơ được USCIS Approved thì mừng rỡ tưởng sắp được đi Mỹ. Nhưng thực tế, khi sang đến NVC, hồ sơ của anh em sẽ bị giữ lại để xếp hàng chờ Lịch Visa Bulletin.
    *   *Diện trực hệ (Vợ/chồng, con độc thân dưới 21 tuổi của công dân Mỹ - IR1, CR1, IR2):* Không phải chờ Lịch Visa. NVC sẽ gửi thư **Welcome Letter** (chứa Case Number **HCMxxxxxxxxxx** và Invoice ID) ngay sau khi nhận hồ sơ từ USCIS.
    *   *Các diện ưu tiên (Diện F):* Phải xếp hàng chờ Lịch Visa Bulletin. Thời gian chờ đợi thực tế từ lúc nộp đơn đến khi NVC gửi thư Welcome Letter để làm thủ tục hiện nay là:
        *   **Diện F1 (Con độc thân trên 21 tuổi của công dân Mỹ):** Chờ khoảng **7 - 8 năm**.
        *   **Diện F2A (Vợ/chồng và con dưới 21 tuổi của Thường trú nhân):** Chờ khoảng **3 - 4 năm**.
        *   **Diện F2B (Con độc thân trên 21 tuổi của Thường trú nhân):** Chờ khoảng **8 - 9 năm**.
        *   **Diện F3 (Con đã kết hôn của công dân Mỹ):** Chờ khoảng **10 - 12 năm**.
        *   **Diện F4 (Anh chị em của công dân Mỹ):** Chờ đằng đẵng từ **14 đến 15 năm**.
*   **Khi hồ sơ được mở:** NVC cấp Welcome Letter để anh em đóng phí và tải giấy tờ lên cổng CEAC. Thời gian rà soát thực tế của NVC hiện nay mất khoảng **30 đến 45 ngày** cho mỗi lần xét duyệt để đạt trạng thái **DQ (Documentarily Qualified)**.

### 3. Trạm số 3: Lãnh sự quán Mỹ tại Việt Nam (U.S. Consulate General)
*   **Họ là ai?** Cơ quan phỏng vấn trực tiếp tại TP.HCM.
*   **Thực tế chờ đợi sau khi đạt DQ:**
    *   *Diện trực hệ (IR/CR):* Chờ từ **2 đến 4 tháng** sau khi DQ để nhận thư gọi phỏng vấn.
    *   *Các diện F:* Dù đã DQ và Lịch Visa Bulletin đã vượt qua Ngày ưu tiên của anh em, anh em vẫn phải xếp hàng chờ Lãnh sự quán TP.HCM xếp lịch phỏng vấn, thực tế mất thêm từ **3 đến 12 tháng** do quá tải hồ sơ.`,
    drip_day: 0,
    created_at: "2026-07-22"
  }
];

// Compile time slugs for dynamic paths
export async function generateStaticParams() {
  try {
    const { data } = await supabase.from("articles").select("slug");
    if (data && data.length > 0) {
      return data.map((art) => ({ slug: art.slug }));
    }
  } catch {
    console.warn("Failed static param extraction, using fallbacks.");
  }
  return FALLBACK_ARTICLES.map((art) => ({ slug: art.slug }));
}

function parseMarkdownToHtml(markdown: string) {
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(markdown) && !markdown.includes("![");
  if (isHtml) {
    return markdown;
  }
  let html = markdown;

  // Escape HTML entities to prevent XSS injection (but preserve safe structures)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Restore safe <img> tags that were escaped
  html = html.replace(/&lt;img\s+(.*?)\/?&gt;/g, (_, p1) => {
    const cleanAttrs = p1
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    return `<img ${cleanAttrs} class="w-full max-w-[650px] mx-auto rounded-card border border-obsidian/10 my-8 shadow-sm block" />`;
  });

  // 1. Process markdown tables
  html = html.replace(/((?:^\|[^\n]+\|\r?\n)+)/gm, (tableBlock) => {
    const lines = tableBlock.trim().split("\n");
    if (lines.length < 2) return tableBlock;

    const headers = lines[0]
      .split("|")
      .map(h => h.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    const rows = lines.slice(2).map(line => {
      return line
        .split("|")
        .map(cell => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    });

    const headerHtml = `<thead><tr class="border-b-2 border-obsidian bg-pale-slate/40 text-xs font-bold uppercase">${headers.map(h => `<th class="py-2.5 px-3 border-r border-obsidian/10">${h}</th>`).join("")}</tr></thead>`;
    const bodyHtml = `<tbody>${rows.map(row => `<tr class="border-b border-pale-slate/40 hover:bg-electric-blue/[0.02] transition-colors">${row.map(cell => `<td class="py-3 px-3 font-medium text-obsidian">${cell}</td>`).join("")}</tr>`).join("")}</tbody>`;

    return `<div class="overflow-x-auto my-6 border border-obsidian/10 rounded-card"><table class="w-full text-left border-collapse text-xs md:text-sm">${headerHtml}${bodyHtml}</table></div>`;
  });

  // 2. Process markdown images
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (_, p1, p2) => `<img src="${p2}" alt="${p1}" class="w-full max-w-[650px] mx-auto rounded-card border border-obsidian/10 my-8 shadow-sm block" />`);

  // 3. Process anchor links (after images to prevent regex collision)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, p1, p2) => `<a href="${p2}" target="_blank" rel="noopener noreferrer" class="text-electric-blue hover:underline font-bold inline-flex items-center gap-0.5">${p1}</a>`);

  // 4. Process headings
  html = html.replace(/^# (.*)$/gm, (_, p1) => `<h1 class="text-3xl md:text-4xl font-extrabold text-obsidian tracking-tight mb-8 mt-2 pb-4 border-b-2 border-obsidian">${p1}</h1>`);
  html = html.replace(/^## (.*)$/gm, (_, p1) => `<h2 class="text-xl md:text-2xl font-black text-obsidian tracking-tight mt-10 mb-4 border-b border-obsidian/10 pb-2">${p1}</h2>`);
  html = html.replace(/^### (.*)$/gm, (_, p1) => `<h3 class="text-lg font-bold text-obsidian mt-8 mb-3">${p1}</h3>`);

  // 5. Process list items (matches both - and * with optional whitespace)
  html = html.replace(/^[\*\-]\s+(.*)$/gm, (_, p1) => `<li-disc>${p1}</li-disc>`);
  html = html.replace(/^\d+\.\s+(.*)$/gm, (_, p1) => `<li-decimal>${p1}</li-decimal>`);

  // Wrap consecutive list items in <ul> and <ol> tags
  html = html.replace(/((?:<li-disc>[\s\S]*?<\/li-disc>\s*)+)/g, '<ul class="my-5 list-disc pl-6 space-y-2.5 text-obsidian/85">$1</ul>');
  html = html.replace(/((?:<li-decimal>[\s\S]*?<\/li-decimal>\s*)+)/g, '<ol class="my-5 list-decimal pl-6 space-y-2.5 text-obsidian/85">$1</ol>');

  // Rename list-disc and list-decimal to li
  html = html
    .replace(/<li-disc>/g, '<li class="text-sm md:text-base leading-relaxed">')
    .replace(/<\/li-disc>/g, '</li>')
    .replace(/<li-decimal>/g, '<li class="text-sm md:text-base leading-relaxed">')
    .replace(/<\/li-decimal>/g, '</li>');

  // 6. Process blockquotes
  html = html.replace(/^&gt;\s+(.*)$/gm, (_, p1) => `<blockquote class="bg-electric-blue/5 border-l-4 border-electric-blue p-5 my-6 rounded-r-card text-sm md:text-base font-medium italic text-obsidian/80 shadow-xs">${p1}</blockquote>`);

  // 7. Process bold text
  html = html.replace(/\*\*(.*?)\*\*/g, (_, p1) => `<strong class="font-black text-obsidian bg-electric-blue/5 px-1 py-0.5 rounded">${p1}</strong>`);

  // 8. Process inline code (backticks)
  html = html.replace(/`(.*?)`/g, (_, p1) => `<code class="font-mono bg-pale-slate border border-obsidian/10 px-1.5 py-0.5 rounded text-xs text-electric-blue font-semibold">${p1}</code>`);

  // 9. Process horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-10 border-t-2 border-dashed border-obsidian/10" />');

  // Paragraph splitting and tag formatting
  const sections = html.split(/\n\n+/);
  const formattedSections = sections.map((sec) => {
    const trimmed = sec.trim();
    if (!trimmed) return "";
    
    // Check if it's already a block tag
    if (
      trimmed.startsWith("<h1") || 
      trimmed.startsWith("<h2") || 
      trimmed.startsWith("<h3") || 
      trimmed.startsWith("<li") || 
      trimmed.startsWith("<ul") || 
      trimmed.startsWith("<ol") || 
      trimmed.startsWith("<hr") || 
      trimmed.startsWith("<blockquote") || 
      trimmed.startsWith("<img") || 
      trimmed.startsWith("<div")
    ) {
      return trimmed;
    }
    
    return `<p class="text-sm md:text-base text-obsidian/80 leading-relaxed mb-5">${trimmed.replace(/\n/g, "<br />")}</p>`;
  });

  return formattedSections.join("\n");
}

export default async function ArticleDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;
  let article: ArticleRecord | null = null;

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .single();

    if (data && !error) {
      article = data;
    }
  } catch (error) {
    console.error(`Error loading slug "${slug}":`, error);
  }

  // Check fallback data
  if (!article) {
    article = FALLBACK_ARTICLES.find((art) => art.slug === slug) || null;
  }

  if (!article) {
    return notFound();
  }

  const parsedHtmlContent = parseMarkdownToHtml(article.content);

  return (
    <div className="bg-[#f2f2f3] min-h-screen flex flex-col font-sans text-obsidian relative overflow-x-hidden">
      <div className="asterisk-bg select-none animate-spin" style={{ animationDuration: '60s' }}>*</div>
      
      <Header />

      <main className="flex-grow w-full max-w-[800px] mx-auto px-4 py-8 md:py-16 relative z-10">
        <Link 
          href="/articles" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-obsidian/60 hover:text-electric-blue transition-colors mb-8 bg-white border border-obsidian px-4 py-2 rounded-full neo-hover shadow-obsidian"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại kho bài viết
        </Link>

        <article className="bg-white border border-obsidian rounded-bento p-6 md:p-12 neo-hover transition-all">
          <header className="border-b border-obsidian/10 pb-6 mb-8">
            <div className="flex flex-wrap items-center gap-4 mb-4 text-xs font-semibold text-obsidian/50">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 19/06/2026
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 
                {article.drip_day !== null && article.drip_day <= 7 ? "5 phút đọc" : "10 phút đọc"}
              </span>
              {article.drip_day !== null && (
                <span className="bg-electric-blue/10 text-electric-blue px-2.5 py-0.5 rounded-full font-bold">
                  Lộ trình ngày {article.drip_day}
                </span>
              )}
            </div>
            
            <h1 className="text-2xl md:text-4xl font-extrabold text-obsidian leading-tight tracking-tight">
              {article.title}
            </h1>
          </header>

          {/* Render parsed HTML */}
          <div 
            className="prose prose-slate max-w-none prose-p:mb-4 prose-blockquote:my-6 prose-li:mb-2 prose-h2:mt-8"
            dangerouslySetInnerHTML={{ __html: parsedHtmlContent }} 
          />
          
          <div className="mt-12 pt-8 border-t border-obsidian/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-obsidian">Bạn muốn nhận lộ trình này tự động?</h4>
              <p className="text-xs text-obsidian/60">Đăng ký tài khoản và nhập thông tin hồ sơ để nhận bài viết gợi ý đúng thời điểm.</p>
            </div>
            <Link 
              href="/dashboard" 
              className="neo-pill neo-pill-primary text-xs px-6 py-2.5 shrink-0"
            >
              Đăng ký ngay
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;

  let article = null;
  try {
    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .single();
    if (data) {
      article = data;
    }
  } catch {}

  if (!article) {
    article = FALLBACK_ARTICLES.find((art) => art.slug === slug);
  }

  if (!article) {
    return {
      title: "Bài viết không tìm thấy | VisaTracker",
      description: "Không tìm thấy nội dung bài viết hướng dẫn di trú Mỹ."
    };
  }

  return {
    title: `${article.title} | VisaTracker Hướng dẫn`,
    description: article.seo_description || `Hướng dẫn chi tiết về di trú Mỹ: ${article.title}`,
    keywords: article.seo_keyword || "di tru my, dinh cu my, visa bulletin, nvc, ds-260"
  };
}

export const dynamic = "force-dynamic";
