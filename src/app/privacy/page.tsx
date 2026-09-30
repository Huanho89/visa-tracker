import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Eye, Lock, RefreshCw, Clock } from "lucide-react";

export const metadata = {
  title: "Chính sách Bảo mật | VisaTracker",
  description: "Chính sách bảo mật thông tin cá nhân, lưu trữ và xử lý dữ liệu hồ sơ người dùng trên hệ thống VisaTracker.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-pale-slate">
      <Header />
      
      <main className="flex-1 w-full max-w-[900px] mx-auto px-4 py-12 md:py-16">
        {/* Breadcrumb */}
        <div className="flex gap-2 text-xs font-bold uppercase text-obsidian/50 mb-4">
          <Link href="/" className="hover:text-electric-blue transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-obsidian">Chính sách bảo mật</span>
        </div>

        {/* Page Title */}
        <div className="bg-white border-2 border-obsidian p-8 rounded-card shadow-flat mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full translate-x-12 -translate-y-12"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-electric-blue/10 border border-obsidian rounded-card text-electric-blue">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-sans text-3xl font-extrabold text-obsidian tracking-tighter">
                Chính sách Bảo mật
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-obsidian/60 mt-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                Cập nhật lần cuối: 17 tháng 07, 2026
              </div>
            </div>
          </div>
          <p className="text-sm text-obsidian/70 leading-relaxed max-w-[700px]">
            Sự tin tưởng và an toàn dữ liệu di trú của bạn là ưu tiên hàng đầu của chúng tôi. VisaTracker cam kết bảo vệ tuyệt đối quyền riêng tư và thông tin cá nhân của bạn theo đúng các quy định trong chính sách dưới đây.
          </p>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-8">
          {/* Section 1 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">1</span>
              Thông tin Chúng tôi Thu thập
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Để cung cấp đầy đủ tính năng theo dõi tiến trình và gửi email cảnh báo thông báo, VisaTracker thu thập một số thông tin tối giản sau:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-obsidian/80">
                <li>
                  <strong className="text-obsidian">Thông tin tài khoản:</strong> Địa chỉ email cá nhân và mật khẩu (được mã hóa mật mã an toàn qua hệ thống Supabase Auth).
                </li>
                <li>
                  <strong className="text-obsidian">Thông tin hồ sơ di trú:</strong> Tên gọi gợi nhớ của hồ sơ, Diện bảo lãnh gia đình (F1, F2A, F2B, F3, F4) và Ngày ưu tiên (Priority Date) của bạn. Chúng tôi <strong className="text-obsidian">không yêu cầu và không lưu trữ</strong> số hồ sơ NVC (Case Number) hay bất kỳ tài liệu mật nào khác.
                </li>
                <li>
                  <strong className="text-obsidian">Thông tin kỹ thuật ẩn danh:</strong> Địa chỉ IP (dành cho mục đích chống spam/rate limit), loại trình duyệt, hệ điều hành và dữ liệu cookie để duy trì trạng thái đăng nhập.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">2</span>
              Mục đích Sử dụng Thông tin
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Chúng tôi chỉ sử dụng thông tin thu thập được cho các mục đích cụ thể dưới đây:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 font-medium text-obsidian/90">
                <li>Hiển thị biểu đồ tiến trình ước tính thời gian chờ phỏng vấn của riêng bạn trên trang Dashboard.</li>
                <li>Gửi email thông báo tự động ngay khi lịch Visa Bulletin mới hàng tháng được công bố và hồ sơ của bạn đến hạn nộp hồ sơ (Filing Date Current) hoặc đến lượt duyệt visa (Final Action Date Current).</li>
                <li>Gửi các chuỗi bài viết hướng dẫn chuẩn bị giấy tờ di trú theo lộ trình 9 bước (Drip Campaigns).</li>
                <li>Nâng cấp tính năng và tối ưu hóa giao diện dựa trên số liệu phân tích ẩn danh.</li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">3</span>
              Cam kết Không chia sẻ dữ liệu
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p className="font-bold text-obsidian">
                VisaTracker cam kết tuyệt đối không bán, trao đổi, cho thuê hoặc chia sẻ dữ liệu thông tin cá nhân hay thông tin hồ sơ di trú của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại hoặc tiếp thị quảng cáo.
              </p>
              <p>
                Thông tin của bạn chỉ được truyền qua các kênh dịch vụ thiết yếu phục vụ cho việc vận hành website:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-obsidian/80">
                <li>Hạ tầng cơ sở dữ liệu lưu trữ đám mây của <strong className="text-obsidian">Supabase</strong> (được bảo vệ bảo mật đa lớp mã hóa).</li>
                <li>Dịch vụ gửi email tự động đáng tin cậy (Gmail SMTP hoặc Resend API) nhằm mục đích gửi email thông báo di trú đến chính bạn.</li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">4</span>
              Quyền kiểm soát của Người dùng
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Bạn có toàn quyền kiểm soát dữ liệu cá nhân của mình trên hệ thống:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-obsidian/80">
                <li>
                  <strong className="text-obsidian">Chỉnh sửa hồ sơ:</strong> Bạn có thể đăng nhập vào Dashboard bất kỳ lúc nào để sửa đổi Tên hồ sơ, Diện bảo lãnh và Ngày ưu tiên.
                </li>
                <li>
                  <strong className="text-obsidian">Hủy nhận thông báo:</strong> Bạn có thể tắt tùy chọn nhận email tự động tại mục Cài đặt trên Dashboard để ngừng nhận các email thông báo Visa Bulletin.
                </li>
                <li>
                  <strong className="text-obsidian">Xóa tài khoản:</strong> Bạn có quyền yêu cầu xóa bỏ vĩnh viễn tài khoản và toàn bộ hồ sơ đi kèm ra khỏi hệ thống. Khi tài khoản bị xóa, mọi thông tin email, ngày ưu tiên sẽ bị hủy bỏ vĩnh viễn và không thể khôi phục.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-white border-2 border-obsidian p-6 md:p-8 rounded-card shadow-flat">
            <h2 className="font-sans text-xl font-bold text-obsidian flex items-center gap-2 border-b-2 border-pale-slate pb-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-electric-blue text-white font-mono text-sm rounded-full border border-obsidian">5</span>
              Lưu trữ & Bảo mật dữ liệu
            </h2>
            <div className="text-sm text-obsidian/80 space-y-3 leading-relaxed">
              <p>
                Chúng tôi áp dụng các tiêu chuẩn công nghệ bảo mật cao để lưu trữ thông tin:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-obsidian/80">
                <li>Mã hóa SSL/TLS 256-bit toàn bộ đường truyền dữ liệu giữa trình duyệt của bạn và máy chủ VPS.</li>
                <li>Mật khẩu tài khoản được mã hóa một chiều (hashing) thông qua thuật toán bảo mật của Supabase, đội ngũ quản trị của VisaTracker cũng không thể nhìn thấy mật khẩu thực tế của bạn.</li>
                <li>Hệ thống lưu trữ cơ sở dữ liệu được phân quyền chặt chẽ thông qua chính sách RLS (Row Level Security) của PostgreSQL, ngăn chặn tuyệt đối việc người dùng này nhìn thấy thông tin hồ sơ của người dùng khác.</li>
              </ul>
            </div>
          </div>

          {/* Security Alert box */}
          <div className="bg-blue-50 border-2 border-obsidian p-6 rounded-card flex gap-4">
            <div className="text-electric-blue self-start p-1.5 bg-white border border-obsidian rounded-card">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-obsidian mb-1 text-sm uppercase tracking-wider">
                Khuyến nghị An toàn thông tin
              </h4>
              <p className="text-xs text-obsidian/70 leading-relaxed">
                Xin hãy ghi nhớ: VisaTracker <strong>không bao giờ chủ động gọi điện thoại hoặc gửi email yêu cầu bạn cung cấp mật khẩu tài khoản, số An sinh Xã hội (SSN), hay Case Number hồ sơ NVC</strong>. Không chia sẻ các thông tin nhạy cảm này với bất kỳ ai để phòng tránh lừa đảo giả mạo.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
