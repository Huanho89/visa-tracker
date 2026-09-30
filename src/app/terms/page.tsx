import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, Shield, Scale, Clock } from "lucide-react";

export const metadata = {
  title: "Điều khoản Sử dụng | VisaTracker",
  description: "Quy định, điều khoản sử dụng dịch vụ tra cứu tiến trình hồ sơ di trú và lịch Visa Bulletin của VisaTracker.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-pale-slate">
      <Header />
      
      <main className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12 md:py-16">
        {/* Breadcrumb */}
        <div className="flex gap-2 text-xs font-bold uppercase text-obsidian/50 mb-4">
          <Link href="/" className="hover:text-electric-blue transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-obsidian">Điều khoản sử dụng</span>
        </div>

        {/* Page Title */}
        <div className="bg-white border-2 border-obsidian p-8 rounded-card shadow-flat mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full translate-x-12 -translate-y-12"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-electric-blue/10 border border-obsidian rounded-card text-electric-blue">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-sans text-3xl font-extrabold text-obsidian tracking-tighter">
                Điều khoản Sử dụng
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-obsidian/60 mt-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                Cập nhật lần cuối: 17 tháng 07, 2026
              </div>
            </div>
          </div>
          <p className="text-sm text-obsidian/70 leading-relaxed max-w-[700px]">
            Chào mừng bạn đến với VisaTracker. Vui lòng đọc kỹ các Điều khoản Sử dụng dưới đây trước khi trải nghiệm dịch vụ tra cứu, theo dõi tiến trình hồ sơ di trú Mỹ của chúng tôi.
          </p>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-8">
          {/* Section 1 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">1</span>
              Chấp thuận Điều khoản
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Bằng việc truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ dịch vụ nào trên website <strong>VisaTracker</strong>, bạn đồng ý chịu sự ràng buộc bởi các điều khoản sử dụng này, tất cả các luật và quy định hiện hành.
              </p>
              <p>
                Nếu bạn không đồng ý với bất kỳ điều khoản nào trong văn bản này, vui lòng ngừng sử dụng website ngay lập tức.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">2</span>
              Mô tả Dịch vụ
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                VisaTracker cung cấp công cụ hỗ trợ theo dõi tiến trình hồ sơ định cư Mỹ (các diện bảo lãnh gia đình F1, F2A, F2B, F3, F4) thông qua việc tự động cào dữ liệu từ Bản tin thị thực (Visa Bulletin) chính thức của Bộ Ngoại giao Hoa Kỳ.
              </p>
              <p>
                Dịch vụ bao gồm:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 font-medium text-obsidian/90">
                <li>Tra cứu lịch Visa Bulletin hàng tháng dưới dạng biểu đồ trực quan.</li>
                <li>Hệ thống gửi Email thông báo tự động (Drip & Alert) khi ngày ưu tiên (Priority Date) của bạn đến hạn nộp hồ sơ (Filing Date Current) hoặc phỏng vấn (Final Action Date Current).</li>
                <li>Cung cấp cẩm nang và hướng dẫn từng bước của tiến trình 9 bước di trú Mỹ.</li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">3</span>
              Tài khoản & Bảo mật của Thành viên
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Khi tạo tài khoản để sử dụng chức năng Dashboard theo dõi hồ sơ, bạn có trách nhiệm cung cấp thông tin chính xác về: Diện bảo lãnh, Ngày ưu tiên (Priority Date) và Email nhận thông báo.
              </p>
              <p>
                Bạn hoàn toàn chịu trách nhiệm về việc bảo mật thông tin đăng nhập tài khoản của mình. Mọi hoạt động xảy ra dưới tên tài khoản của bạn sẽ được xem là trách nhiệm của bạn.
              </p>
              <p>
                Hệ thống có quyền tạm khóa hoặc xóa bỏ tài khoản của bạn mà không cần báo trước nếu phát hiện hành vi cung cấp thông tin sai lệch gây nhiễu dữ liệu hệ thống.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">4</span>
              Chính sách Chống Spam, Bot & Lạm dụng
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Nhằm duy trì môi trường trải nghiệm mượt mà, công bằng cho tất cả mọi người và bảo vệ tài nguyên hệ thống, chúng tôi áp dụng các quy định nghiêm ngặt:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-obsidian/80">
                <li>
                  <strong className="text-obsidian">Giới hạn Tần suất API (Rate Limiting):</strong> Hệ thống giới hạn mỗi địa chỉ IP chỉ được gửi tối đa 30 yêu cầu (requests) mỗi phút đối với các API endpoints công khai. Mọi hành vi vượt quá giới hạn này sẽ bị chặn tạm thời với lỗi <code className="bg-pale-slate border border-obsidian/10 px-1 py-0.5 rounded font-mono text-xs text-red-600">429 Too Many Requests</code>.
                </li>
                <li>
                  <strong className="text-obsidian">Cấm cào dữ liệu tự động (Anti-Scraping):</strong> Nghiêm cấm sử dụng các loại bot, phần mềm tự động quét dữ liệu hoặc script tự động để spam các form đăng ký hồ sơ hoặc cố gắng truy cập trái phép cơ sở dữ liệu.
                </li>
                <li>
                  <strong className="text-obsidian">Bảo vệ bằng Captcha:</strong> Các form đăng ký và đăng nhập được giám sát bởi hệ thống Cloudflare Turnstile để xác minh người dùng thực và ngăn chặn bot tự động.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">5</span>
              Sở hữu Trí tuệ
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Toàn bộ mã nguồn, cấu trúc giao diện, thiết kế đồ họa, biểu đồ phân tích, và các nội dung hướng dẫn độc quyền trên website <strong>VisaTracker</strong> đều thuộc sở hữu trí tuệ của đội ngũ phát triển VisaTracker và được bảo vệ bởi luật bản quyền quốc tế.
              </p>
              <p>
                Bạn không được phép sao chép, phân phối, sửa đổi hoặc sử dụng bất kỳ phần nào của website cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản từ chúng tôi.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">6</span>
              Thay đổi Điều khoản
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                VisaTracker có quyền sửa đổi hoặc thay thế các điều khoản sử dụng này bất cứ lúc nào để phù hợp với các cải tiến tính năng mới và quy định pháp luật. 
              </p>
              <p>
                Mọi thay đổi sẽ có hiệu lực ngay khi được đăng tải lên trang này. Việc bạn tiếp tục sử dụng dịch vụ sau khi có các thay đổi đồng nghĩa với việc bạn đồng ý với các điều khoản mới.
              </p>
            </div>
          </div>

          {/* Quick Disclaimer box inside Terms */}
          <div className="bg-yellow-50 border-2 border-obsidian p-6 rounded-card flex gap-4">
            <div className="text-yellow-600 self-start p-1.5 bg-white border border-obsidian rounded-card">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-obsidian mb-1 text-sm uppercase tracking-wider">
                Lưu ý quan trọng về tính pháp lý
              </h4>
              <p className="text-xs text-obsidian/70 leading-relaxed">
                VisaTracker là một hệ thống cung cấp thông tin tra cứu độc lập, <strong>không phải là văn phòng luật và không cung cấp lời khuyên pháp lý di trú</strong>. Việc sử dụng công cụ của chúng tôi không tạo ra mối quan hệ luật sư - khách hàng. Vui lòng đọc thêm <Link href="/disclaimer" className="text-electric-blue underline font-bold">Tuyên bố miễn trừ trách nhiệm</Link> để hiểu rõ hơn.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
