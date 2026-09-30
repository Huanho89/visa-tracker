import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BookOpen, Clock, ArrowRight, ShieldCheck, Mail } from "lucide-react";

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

const FALLBACK_ARTICLES: ArticleRecord[] = [
  {
    id: "art-1",
    title: "Bản đồ vỡ lòng định cư Mỹ: Phân biệt USCIS, NVC và Lãnh sự quán từ con số 0",
    slug: "ban-do-vo-long-dinh-cu-my-phan-biet-uscis-nvc-va-lanh-su-quan",
    content: "Bản đồ vỡ lòng định cư Mỹ: Phân biệt USCIS, NVC và Lãnh sự quán...",
    drip_day: 0,
    seo_description: null,
    seo_keyword: null,
    created_at: "2026-07-22"
  }
];

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  let articles = FALLBACK_ARTICLES;

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("drip_day", { ascending: true, nullsFirst: false });

    if (data && data.length > 0 && !error) {
      articles = data;
    }
  } catch (error) {
    console.error("Error fetching articles, using fallback data:", error);
  }

  return (
    <div className="bg-[#f2f2f3] min-h-screen flex flex-col font-sans text-obsidian relative overflow-x-hidden">
      <div className="asterisk-bg select-none animate-spin" style={{ animationDuration: '60s' }}>*</div>
      
      <Header />

      <main className="flex-grow w-full max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Article Feed */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-obsidian rounded-bento p-6 md:p-8 neo-hover transition-all">
              <h1 className="text-3xl font-extrabold mb-8 tracking-tight flex items-center gap-2">
                <BookOpen className="text-electric-blue w-8 h-8" />
                Tất cả bài viết hướng dẫn định cư
              </h1>
              
              <div className="flex flex-col gap-1">
                {articles.map((art) => (
                  <article 
                    key={art.id} 
                    className="py-6 border-b border-obsidian/10 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-pale-slate transition-colors -mx-4 px-4 rounded-card"
                  >
                    <div className="flex-1 min-w-0">
                      <Link href={`/articles/${art.slug}`}>
                        <h2 className="text-lg font-bold mb-2 text-obsidian hover:text-electric-blue transition-colors truncate">
                          {art.title}
                        </h2>
                      </Link>
                      <p className="text-obsidian/60 text-xs md:text-sm mb-3">
                        {art.drip_day !== null 
                          ? `Bài viết gợi ý gửi vào ngày thứ ${art.drip_day} trong lộ trình xử lý hồ sơ di trú của thành viên.`
                          : "Bài viết chia sẻ thông tin tổng hợp hữu ích dành cho người định cư Mỹ."}
                      </p>
                      
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex px-3 py-1 border rounded-full text-xs font-bold ${
                          art.drip_day === 0 ? "border-electric-blue text-electric-blue bg-blue-50" :
                          art.drip_day === 7 ? "border-success-mint text-success-mint bg-green-50" :
                          "border-obsidian text-obsidian bg-pale-slate"
                        }`}>
                          {art.drip_day !== null ? `Lộ trình ngày ${art.drip_day}` : "Cẩm nang chung"}
                        </span>
                        <span className="text-xs text-obsidian/60 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> 
                          {art.drip_day !== null && art.drip_day <= 7 ? "5 phút đọc" : "10 phút đọc"}
                        </span>
                      </div>
                    </div>
                    
                    <Link 
                      href={`/articles/${art.slug}`}
                      className="inline-flex items-center justify-center p-2.5 rounded-full border border-obsidian hover:bg-obsidian hover:text-white transition-all shrink-0 self-end md:self-center"
                      aria-label={`Đọc bài viết: ${art.title}`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Column: Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Focus Guide Card */}
            <div className="bg-white border border-obsidian rounded-bento p-6 neo-hover transition-all">
              <h3 className="text-xs font-bold text-obsidian/60 uppercase tracking-wider mb-4 font-mono">Cẩm nang tiêu điểm</h3>
              <div className="bg-pale-slate rounded-card p-6 border border-obsidian/10">
                <div className="flex justify-between items-start mb-4">
                  <ShieldCheck className="w-8 h-8 text-electric-blue" />
                </div>
                <h4 className="text-lg font-extrabold mb-4 leading-tight">Lộ trình 9 bước định cư Mỹ diện bảo lãnh gia đình</h4>
                <p className="text-xs text-obsidian/60 mb-4 leading-relaxed">
                  Xem toàn bộ sơ đồ các bước từ lúc nhận hồ sơ cho tới khi cầm visa trên tay.
                </p>
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center font-bold text-xs text-obsidian border-b-2 border-obsidian hover:text-electric-blue hover:border-electric-blue transition-colors pb-1"
                >
                  Xem chi tiết lộ trình <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>

            {/* Email Subscribe Card */}
            <div className="bg-white border border-obsidian rounded-bento p-6 neo-hover transition-all">
              <h3 className="text-xs font-bold text-obsidian/60 uppercase tracking-wider mb-4 font-mono">Nhận bài viết qua Email</h3>
              <p className="text-xs text-obsidian/60 mb-6 leading-relaxed">
                Nhận tự động các bài hướng dẫn chi tiết theo lộ trình thời gian thực tế phù hợp với tình trạng hồ sơ của bạn.
              </p>
              <Link 
                href="/dashboard"
                className="w-full flex items-center justify-center px-4 py-3 bg-white text-obsidian border border-obsidian rounded-full font-bold text-xs hover:bg-pale-slate transition-all gap-2"
              >
                <Mail className="w-4 h-4 text-electric-blue" />
                Đăng ký nhận lộ trình qua Email
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
