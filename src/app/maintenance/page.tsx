import Link from "next/link";
import { ShieldAlert, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Hệ thống đang bảo trì | VisaTracker",
  description: "Trang web đang được bảo trì định kỳ. Vui lòng quay lại sau.",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-pale-slate flex flex-col items-center justify-center font-sans text-obsidian px-4">
      <div className="bg-white rounded-bento border-2 border-obsidian p-8 md:p-12 max-w-lg w-full text-center shadow-obsidian flex flex-col items-center gap-6 relative overflow-hidden">
        {/* Asterisk decoration */}
        <div className="absolute -top-10 -right-10 text-[120px] font-sans text-obsidian/5 select-none pointer-events-none">*</div>
        
        <div className="w-16 h-16 rounded-full bg-warning-amber/10 border-2 border-obsidian flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-warning-amber" />
        </div>
        
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Hệ thống đang bảo trì</h1>
          <p className="text-sm text-obsidian/60 mt-3 leading-relaxed">
            Chúng tôi đang tiến hành cập nhật dữ liệu Visa Bulletin mới nhất và nâng cấp hệ thống để mang lại trải nghiệm tốt nhất.
          </p>
        </div>

        <div className="bg-pale-slate rounded-card border border-obsidian/10 p-4 w-full flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 text-electric-blue animate-spin" />
          <span className="text-xs font-bold text-obsidian/75">Dự kiến hoàn thành trong vài giờ tới.</span>
        </div>

        <div className="flex flex-col gap-2 w-full mt-2">
          <p className="text-xs text-obsidian/40">Nếu bạn là Quản trị viên hệ thống, vui lòng đăng nhập để tiếp tục làm việc.</p>
          <Link href="/admin" className="neo-pill neo-pill-primary w-full py-3 text-xs md:text-sm font-bold">
            Đăng nhập Quản trị viên
          </Link>
        </div>
      </div>
    </div>
  );
}
