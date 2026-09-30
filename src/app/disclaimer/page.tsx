import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AlertOctagon, HelpCircle, FileText, CheckCircle2, Clock } from "lucide-react";

export const metadata = {
  title: "Tuyên bố Miễn trừ | VisaTracker",
  description: "Tuyên bố miễn trừ trách nhiệm pháp lý và các nguồn thông tin tham khảo độc lập của VisaTracker.",
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen flex flex-col bg-pale-slate">
      <Header />
      
      <main className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12 md:py-16">
        {/* Breadcrumb */}
        <div className="flex gap-2 text-xs font-bold uppercase text-obsidian/50 mb-4">
          <Link href="/" className="hover:text-electric-blue transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-obsidian">Tuyên bố miễn trừ</span>
        </div>

        {/* Page Title */}
        <div className="bg-yellow-50 border-2 border-obsidian p-8 rounded-card shadow-flat mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full translate-x-12 -translate-y-12"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-yellow-500/10 border border-obsidian rounded-card text-yellow-600">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-sans text-3xl font-extrabold text-obsidian tracking-tighter">
                Tuyên bố Miễn trừ Trách nhiệm
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-obsidian/60 mt-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                Cập nhật lần cuối: 17 tháng 07, 2026
              </div>
            </div>
          </div>
          <p className="text-sm text-obsidian/70 leading-relaxed max-w-[700px]">
            VisaTracker cung cấp dịch vụ tra cứu thông tin lịch Visa Bulletin phục vụ mục đích thông tin tham khảo. Vui lòng đọc kỹ các điều khoản miễn trừ trách nhiệm dưới đây để hiểu rõ phạm vi dịch vụ của chúng tôi.
          </p>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-8">
          {/* Section 1 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-yellow-500 text-white font-mono text-sm rounded-full border border-obsidian">1</span>
              Không liên kết với Chính phủ Mỹ
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p className="font-bold text-obsidian">
                VisaTracker là một hệ thống cung cấp thông tin tra cứu độc lập, được phát triển và vận hành bởi một đội ngũ tư nhân. Chúng tôi hoàn toàn KHÔNG có bất kỳ liên kết, đại diện, ủy quyền hoặc tài trợ nào từ:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-obsidian/80">
                <li>Bộ Ngoại giao Hoa Kỳ (U.S. Department of State - DOS)</li>
                <li>Sở Di trú và Nhập tịch Hoa Kỳ (U.S. Citizenship and Immigration Services - USCIS)</li>
                <li>Trung tâm Thị thực Quốc gia (National Visa Center - NVC)</li>
                <li>Đại sứ quán/Lãnh sự quán Hoa Kỳ tại Việt Nam hoặc bất kỳ quốc gia nào khác.</li>
              </ul>
              <p>
                Trang web chính thức duy nhất của chính phủ Hoa Kỳ cung cấp Bản tin thị thực là <a href="https://travel.state.gov" target="_blank" rel="noopener noreferrer" className="text-electric-blue underline font-bold">travel.state.gov</a>.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-yellow-500 text-white font-mono text-sm rounded-full border border-obsidian">2</span>
              Nguồn dữ liệu & Tính chính xác của Thông tin
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Dữ liệu lịch Visa Bulletin hiển thị trên website VisaTracker được thu thập tự động từ trang web chính phủ Mỹ <code className="bg-pale-slate border border-obsidian/10 px-1 py-0.5 rounded font-mono text-xs">travel.state.gov</code>.
              </p>
              <p>
                Mặc dù hệ thống kỹ thuật của chúng tôi luôn nỗ lực cào dữ liệu nhanh chóng và kiểm tra nghiêm ngặt tính toàn vẹn của dữ liệu:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-obsidian/80">
                <li>Chúng tôi <strong className="text-obsidian">không đảm bảo tuyệt đối</strong> rằng thông tin không xảy ra lỗi kỹ thuật hiển thị, lỗi đánh máy hoặc chậm trễ do lỗi đồng bộ hệ thống.</li>
                <li>Tất cả thông tin, số liệu, ngày tháng trên website này chỉ có giá trị <strong className="text-obsidian">tham khảo học thuật</strong>.</li>
                <li>Trong mọi trường hợp, dữ liệu gốc tại trang web của Bộ Ngoại giao Mỹ (<a href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" target="_blank" rel="noopener noreferrer" className="text-electric-blue underline font-bold">DOS Visa Bulletin</a>) luôn là nguồn thông tin chính thức có giá trị pháp lý cuối cùng.</li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-yellow-500 text-white font-mono text-sm rounded-full border border-obsidian">3</span>
              Không phải Lời khuyên Pháp lý hay Di trú
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Các bài viết hướng dẫn, cẩm nang tiến trình 9 bước di trú, và các email thông báo lộ trình được cung cấp trên VisaTracker được biên soạn dựa trên các tài liệu công khai hướng dẫn chung.
              </p>
              <p className="font-semibold text-obsidian">
                Các nội dung này KHÔNG phải là lời khuyên pháp lý hay lời khuyên di trú chuyên nghiệp dành riêng cho trường hợp hồ sơ cụ thể của bạn.
              </p>
              <p>
                Hồ sơ di trú của mỗi gia đình có thể phát sinh các vấn đề phức tạp riêng (quá tuổi CSPA, bảo trợ tài chính, tiền án tiền sự, thay đổi người bảo lãnh...). Bạn nên tham khảo ý kiến chính thức từ các luật sư di trú có giấy phép hành nghề hợp pháp trước khi thực hiện bất kỳ hành động pháp lý nào.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-yellow-500 text-white font-mono text-sm rounded-full border border-obsidian">4</span>
              Giới hạn Trách nhiệm Pháp lý
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Trong phạm vi tối đa được pháp luật cho phép, VisaTracker và đội ngũ vận hành sẽ không chịu trách nhiệm pháp lý đối với bất kỳ thiệt hại trực tiếp, gián tiếp, ngẫu nhiên hoặc đặc biệt nào phát sinh từ:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-obsidian/80">
                <li>Việc sử dụng hoặc không thể sử dụng các dịch vụ tra cứu của website.</li>
                <li>Mọi quyết định của bạn dựa trên thông tin tra cứu lịch hoặc email cảnh báo nhận được từ hệ thống.</li>
                <li>Mọi sự chậm trễ hồ sơ, lỡ hạn đóng phí di trú, hoặc lỡ thời hạn nộp đơn DS-260 phát sinh từ việc phụ thuộc hoàn toàn vào dịch vụ thông báo tự động của chúng tôi.</li>
              </ul>
              <p>
                Bạn có trách nhiệm tự kiểm tra chéo lịch Visa Bulletin hàng tháng trên trang web chính thức của chính phủ Hoa Kỳ để đảm bảo không bỏ lỡ thông tin quan trọng.
              </p>
            </div>
          </div>

          {/* Verification Tip */}
          <div className="bg-green-50 border-2 border-obsidian p-6 rounded-card flex gap-4">
            <div className="text-green-600 self-start p-1.5 bg-white border border-obsidian rounded-card">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-obsidian mb-1 text-sm uppercase tracking-wider">
                Cách xác minh thông tin chính chủ
              </h4>
              <p className="text-xs text-obsidian/70 leading-relaxed">
                Để kiểm tra độ tin cậy của thông tin hiển thị trên VisaTracker, bạn có thể đối chiếu trực tiếp dữ liệu Ngày hành động cuối cùng (Final Action Dates) và Ngày nộp đơn (Dates for Filing) của chúng tôi với bảng dữ liệu gốc tại mục <strong>"A. FINAL ACTION DATES FOR FAMILY-SPONSORED PREFERENCE CASES"</strong> và <strong>"B. DATES FOR FILING FAMILY-SPONSORED VISA APPLICATIONS"</strong> trên trang <a href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" target="_blank" rel="noopener noreferrer" className="text-green-700 underline font-bold">travel.state.gov</a>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
