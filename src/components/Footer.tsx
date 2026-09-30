import Link from "next/link";
import TextScramble from "./TextScramble";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-obsidian py-8 mt-auto relative z-10 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-4 md:px-8 py-4 max-w-[1200px] mx-auto gap-4">
        <div className="flex items-center">
          <img 
            src="/logo.png" 
            alt="Visa Auto Tracking Logo" 
            className="h-10 md:h-12 w-auto object-contain"
          />
        </div>
        <div className="font-sans text-sm text-obsidian/60 text-center md:text-left flex flex-col gap-1">
          <div>© {new Date().getFullYear()} Visa Auto Tracking. Bảo lưu mọi quyền.</div>
          <div className="text-xs">
            Tác giả:{" "}
            <a 
              href="mailto:hqhuan@gmail.com" 
              className="text-electric-blue font-bold hover:underline inline-flex items-center gap-1 group"
              title="Gửi email cho tác giả"
            >
              <TextScramble text="Hồ Quốc Huân" triggerOn="both" className="font-sans font-bold" />
              <span className="opacity-75 group-hover:translate-x-0.5 transition-transform text-[10px] font-mono">(hqhuan@gmail.com)</span>
            </a>
          </div>
        </div>
        <div className="flex gap-6 font-sans text-sm text-obsidian/60">
          <Link className="hover:text-electric-blue transition-colors font-medium" href="/terms">
            Điều khoản sử dụng
          </Link>
          <Link className="hover:text-electric-blue transition-colors font-medium" href="/privacy">
            Chính sách bảo mật
          </Link>
          <Link className="hover:text-electric-blue transition-colors font-medium" href="/disclaimer">
            Tuyên bố miễn trừ
          </Link>
        </div>
      </div>
    </footer>
  );
}
