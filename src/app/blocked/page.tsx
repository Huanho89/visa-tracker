import React from "react";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Access Denied | VisaTracker",
  description: "Your IP address has been blocked due to suspicious activity.",
};

export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-red-500 selection:text-white">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl" />

        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-red-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            403 - TRUY CẬP BỊ TỪ CHỐI
          </h1>
          <p className="text-slate-400 text-sm">
            Hệ thống phát hiện hoạt động bất thường từ địa chỉ IP của bạn.
          </p>
        </div>

        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-left text-xs text-slate-400 space-y-3 relative z-10">
          <p>
            Nhằm đảm bảo an ninh và chống lại các cuộc tấn công tự động (spam, brute-force), địa chỉ IP của bạn đã bị đưa vào danh sách hạn chế truy cập.
          </p>
          <div className="border-t border-slate-800 my-2 pt-2">
            <span className="font-semibold text-slate-300">Lưu ý:</span> Nếu đây là sự nhầm lẫn (ví dụ: bạn lỡ nhập sai mật khẩu quá 5 lần), IP của bạn sẽ tự động được mở khóa sau 30 phút.
          </div>
        </div>

        <div className="space-y-4 pt-2 relative z-10">
          <p className="text-slate-500 text-xs">
            Nếu cần hỗ trợ khẩn cấp, vui lòng liên hệ ban quản trị tại:{" "}
            <a
              href="mailto:hqhuan@gmail.com"
              className="text-red-400 hover:text-red-300 underline font-medium transition-colors"
            >
              hqhuan@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
