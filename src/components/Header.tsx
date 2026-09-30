"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Compass, Menu, X, LogOut, LayoutDashboard, Home, BookOpen, TrendingUp, User as UserIcon } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleHashChange = () => setActiveHash(window.location.hash);
      const timer = setTimeout(handleHashChange, 0);
      window.addEventListener("hashchange", handleHashChange);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("hashchange", handleHashChange);
      };
    }
  }, []);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="bg-white border-b border-obsidian w-full sticky top-0 z-50">
      <div className="flex justify-between items-center px-4 md:px-8 w-full max-w-[1200px] mx-auto h-20">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center">
          <img 
            src="/logo.png" 
            alt="Visa Auto Tracking Logo" 
            className="h-12 md:h-14 w-auto object-contain"
          />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center h-full gap-8">
          <Link 
            href="/articles" 
            className="h-full flex items-center text-obsidian/70 hover:text-electric-blue font-medium transition-colors duration-200"
          >
            Kho hướng dẫn
          </Link>
          <Link 
            href="/#visa-bulletin" 
            className="h-full flex items-center text-obsidian/70 hover:text-electric-blue font-medium transition-colors duration-200"
          >
            Visa Bulletin
          </Link>
        </nav>

        {/* Trailing Action */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-obsidian/60 max-w-[150px] truncate" title={user.email}>
                {user.email}
              </span>
              <Link 
                href="/dashboard" 
                className="neo-pill neo-pill-secondary text-sm px-4 py-2 flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button 
                onClick={handleSignOut}
                className="neo-pill neo-pill-primary text-sm px-4 py-2 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="hidden md:block">
              <Link className="neo-pill neo-pill-primary text-sm px-6 py-2" href="/dashboard">
                Đăng nhập →
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-obsidian hover:bg-pale-slate rounded-lg border border-transparent hover:border-obsidian transition-all"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-obsidian p-6 flex flex-col gap-4 z-40">
          <Link 
            href="/articles" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold text-obsidian hover:text-electric-blue transition-colors py-2 border-b border-pale-slate"
          >
            Kho hướng dẫn
          </Link>
          <Link 
            href="/#visa-bulletin" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold text-obsidian hover:text-electric-blue transition-colors py-2 border-b border-pale-slate"
          >
            Visa Bulletin
          </Link>
          {user ? (
            <div className="flex flex-col gap-3 pt-2">
              <div className="text-sm text-obsidian/60 truncate">{user.email}</div>
              <Link 
                href="/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className="neo-pill neo-pill-secondary w-full py-3 flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-5 h-5" />
                Bảng điều khiển
              </Link>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="neo-pill neo-pill-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <Link 
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="neo-pill neo-pill-primary w-full py-3 flex items-center justify-center"
              >
                Đăng nhập →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden mobile-bottom-nav">
        <Link 
          href="/" 
          className={`mobile-bottom-nav-item ${pathname === "/" && activeHash !== "#visa-bulletin" ? "active" : ""}`}
        >
          <Home className="w-5 h-5" />
          <span>Trang chủ</span>
        </Link>
        <Link 
          href="/#visa-bulletin" 
          className={`mobile-bottom-nav-item ${pathname === "/" && activeHash === "#visa-bulletin" ? "active" : ""}`}
        >
          <TrendingUp className="w-5 h-5" />
          <span>Lịch Visa</span>
        </Link>
        <Link 
          href="/articles" 
          className={`mobile-bottom-nav-item ${pathname.startsWith("/articles") ? "active" : ""}`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Hướng dẫn</span>
        </Link>
        <Link 
          href="/dashboard" 
          className={`mobile-bottom-nav-item ${pathname.startsWith("/dashboard") ? "active" : ""}`}
        >
          <UserIcon className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>
      </div>
    </header>
  );
}
