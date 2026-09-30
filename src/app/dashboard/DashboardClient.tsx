"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import KineticGrid from "@/components/KineticGrid";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  Check, 
  TrendingUp, 
  User as UserIcon, 
  LogOut, 
  Info, 
  Settings, 
  FolderPlus, 
  Layers, 
  ChevronRight, 
  MapPin, 
  ExternalLink,
  Edit2,
  Lock,
  Loader2,
  Compass,
  Eye,
  EyeOff
} from "lucide-react";
import { logAuthAttemptAction } from "@/app/admin/actions";


interface CaseRecord {
  id: string;
  user_id: string;
  name: string;
  category: string;
  chargeability: string;
  priority_date: string;
  nvc_case?: string;
  invoice_id?: string;
  consulate?: string;
  petitioner?: string;
  created_at: string;
  completed_steps?: number[];
}

interface ProfileRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  allow_multiple_cases: boolean;
  enable_drip_emails: boolean;
}

interface BulletinRecord {
  id: string;
  month: string;
  category: string;
  chargeability: string;
  final_action_date: string;
  filing_date: string;
}

interface DashboardClientProps {
  initialBulletins: BulletinRecord[];
}

import { calculateTimelineSteps } from "@/lib/visa_utils";

export default function DashboardClient({ initialBulletins }: DashboardClientProps) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth forms state
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Edit forms state
  const [isEditingCase, setIsEditingCase] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [caseCategory, setCaseCategory] = useState("F2B");
  const [casePriorityDate, setCasePriorityDate] = useState("");
  const [caseNvcCase, setCaseNvcCase] = useState("");
  const [caseInvoiceId, setCaseInvoiceId] = useState("");
  const [caseConsulate, setCaseConsulate] = useState("Ho Chi Minh City, Vietnam");
  const [casePetitioner, setCasePetitioner] = useState("");
  const [caseSubmitting, setCaseSubmitting] = useState(false);

  // Profile Settings state
  const [enableDrip, setEnableDrip] = useState(true);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  // Mobile-first timeline accordion state
  const [userExpandedStepIndex, setUserExpandedStepIndex] = useState<number | null>(null);

  // Toggle completed step (user manual confirmation)
  const toggleStepCompleted = async (stepIndex: number) => {
    if (!activeCase || !user) return;
    const current = activeCase.completed_steps || [];
    const updated = current.includes(stepIndex)
      ? current.filter((i: number) => i !== stepIndex)
      : [...current, stepIndex].sort((a, b) => a - b);

    // Optimistic update
    setCases(prev => prev.map(c =>
      c.id === activeCase.id ? { ...c, completed_steps: updated } : c
    ));

    const { error } = await supabase
      .from("cases")
      .update({ completed_steps: updated, updated_at: new Date().toISOString() })
      .eq("id", activeCase.id);

    if (error) {
      // Rollback on error
      setCases(prev => prev.map(c =>
        c.id === activeCase.id ? { ...c, completed_steps: current } : c
      ));
    }
  };

  const loadUserData = async (userId: string) => {
    setLoading(true);
    try {
      // 1. Load Profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileData && !profileError) {
        setProfile(profileData);
        setEnableDrip(profileData.enable_drip_emails);
      } else {
        console.error("Profile load error:", profileError);
      }

      // 2. Load Cases
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (casesData && !casesError) {
        setCases(casesData);
        if (casesData.length > 0) {
          setActiveCaseId(casesData[0].id);
        }
      } else {
        console.error("Cases load error:", casesError);
      }
    } catch (err) {
      console.error("Error loading user data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load session and data
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setProfile(null);
        setCases([]);
        setActiveCaseId(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auth operations
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");

    // Honeypot bot protection
    if (honeypot) {
      setAuthSubmitting(true);
      setTimeout(() => {
        setAuthSubmitting(false);
        if (isSignUp) {
          setAuthMessage("Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác nhận tài khoản.");
        } else {
          setAuthError("Email hoặc mật khẩu không hợp lệ.");
        }
      }, 1000);
      return;
    }

    setAuthSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
          },
        });
        const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : "";
        await logAuthAttemptAction(authEmail, error ? "failed" : "success", userAgent);

        if (error) throw error;
        setAuthMessage("Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác nhận tài khoản.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : "";
        const logRes = await logAuthAttemptAction(authEmail, error ? "failed" : "success", userAgent);

        if (error) {
          if (logRes && logRes.blocked) {
            throw new Error(logRes.message || "Tài khoản hoặc IP của bạn đã bị khóa tạm thời.");
          }
          throw error;
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Đã xảy ra lỗi khi xác thực.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || "Lỗi đăng nhập Google.");
    }
  };



  // Find active case
  const activeCase = useMemo(() => {
    if (!activeCaseId) return null;
    return cases.find(c => c.id === activeCaseId) || null;
  }, [cases, activeCaseId]);

  // Open edit case modal/form
  const startEditCase = () => {
    if (activeCase) {
      setCaseName(activeCase.name || "");
      setCaseCategory(activeCase.category || "F2B");
      setCasePriorityDate(activeCase.priority_date || "");
      setCaseNvcCase(activeCase.nvc_case || "");
      setCaseInvoiceId(activeCase.invoice_id || "");
      setCaseConsulate(activeCase.consulate || "Ho Chi Minh City, Vietnam");
      setCasePetitioner(activeCase.petitioner || "");
    } else {
      setCaseName("Hồ sơ của tôi");
      setCaseCategory("F2B");
      setCasePriorityDate("");
      setCaseNvcCase("");
      setCaseInvoiceId("");
      setCaseConsulate("Ho Chi Minh City, Vietnam");
      setCasePetitioner("");
    }
    setIsEditingCase(true);
  };

  // Save case details
  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCaseSubmitting(true);

    try {
      const caseData = {
        user_id: user.id,
        name: caseName,
        category: caseCategory,
        chargeability: "All Areas",
        priority_date: casePriorityDate,
        nvc_case: caseNvcCase || null,
        invoice_id: caseInvoiceId || null,
        consulate: caseConsulate,
        petitioner: casePetitioner || null,
        updated_at: new Date().toISOString(),
      };

      if (activeCaseId) {
        // Update
        const { error } = await supabase
          .from("cases")
          .update(caseData)
          .eq("id", activeCaseId);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("cases")
          .insert([caseData])
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          setActiveCaseId(data[0].id);
        }
      }

      // Reload
      await loadUserData(user.id);
      setIsEditingCase(false);
    } catch (err: any) {
      alert(err.message || "Không thể lưu hồ sơ.");
    } finally {
      setCaseSubmitting(false);
    }
  };

  // Save general settings
  const handleSaveSettings = async () => {
    if (!user || !profile) return;
    setSettingsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ enable_drip_emails: enableDrip })
        .eq("id", user.id);
      if (error) throw error;
      
      setProfile({
        ...profile,
        enable_drip_emails: enableDrip
      });
      alert("Đã lưu cấu hình email thành công!");
    } catch (err: any) {
      alert(err.message || "Không thể lưu cài đặt.");
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // Add new case (for multi-case accounts)
  const handleAddNewCase = () => {
    setActiveCaseId(null);
    setCaseName("Hồ sơ mới");
    setCaseCategory("F2B");
    setCasePriorityDate("");
    setCaseNvcCase("");
    setCaseInvoiceId("");
    setCaseConsulate("Ho Chi Minh City, Vietnam");
    setCasePetitioner("");
    setIsEditingCase(true);
  };

  // Find the latest month in initialBulletins dynamically
  const latestMonth = useMemo(() => {
    const months = [...new Set(initialBulletins.map(b => b.month))];
    if (months.length === 0) return "07/2026";
    return months.sort((a, b) => {
      const [mA, yA] = a.split("/").map(Number);
      const [mB, yB] = b.split("/").map(Number);
      return (yB * 12 + mB) - (yA * 12 + mA);
    })[0];
  }, [initialBulletins]);

  const latestBulletins = useMemo(() => {
    return initialBulletins.filter(b => b.month === latestMonth);
  }, [initialBulletins, latestMonth]);

  // Find latest bulletin date for active case category
  const activeBulletin = useMemo(() => {
    if (!activeCase) return null;
    return latestBulletins.find(b => b.category === activeCase.category) || null;
  }, [latestBulletins, activeCase]);

  // Calculate dynamic steps
  const steps = useMemo(() => {
    if (!activeCase || !activeBulletin) return [];

    return calculateTimelineSteps(
      {
        priority_date: activeCase.priority_date,
        nvc_case: activeCase.nvc_case,
        invoice_id: activeCase.invoice_id,
        petitioner: activeCase.petitioner,
        consulate: activeCase.consulate,
        category: activeCase.category
      },
      activeBulletin,
      false
    );
  }, [activeCase, activeBulletin]);

  // Automatically expand active step dynamically
  const expandedStepIndex = useMemo(() => {
    if (userExpandedStepIndex !== null) return userExpandedStepIndex;
    const activeIdx = steps.findIndex(s => s.status === "active");
    return activeIdx !== -1 ? activeIdx : 0;
  }, [userExpandedStepIndex, steps]);


  // Is case current?
  const isCaseCurrent = useMemo(() => {
    if (!activeCase || !activeBulletin) return false;
    return new Date(activeCase.priority_date) <= new Date(activeBulletin.filing_date);
  }, [activeCase, activeBulletin]);

  // Chart trend data for active case
  const chartData = useMemo(() => {
    if (!activeCase) return [];
    
    const filtered = initialBulletins.filter(b => b.category === activeCase.category);
    const sorted = [...filtered].sort((a, b) => {
      const [mA, yA] = a.month.split("/").map(Number);
      const [mB, yB] = b.month.split("/").map(Number);
      return (yA * 12 + mA) - (yB * 12 + mB);
    });

    return sorted.map(item => ({
      month: `Tháng ${item.month}`,
      "Bảng A (Phỏng vấn)": new Date(item.final_action_date).getTime(),
      "Bảng B (Nộp đơn)": new Date(item.filing_date).getTime(),
      final_action_date_str: new Date(item.final_action_date).toLocaleDateString("vi-VN"),
      filing_date_str: new Date(item.filing_date).toLocaleDateString("vi-VN"),
    }));
  }, [initialBulletins, activeCase]);

  // Loading spinner during data fetching
  if (loading) {
    return (
      <div className="min-h-screen bg-pale-slate flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-12 h-12 text-electric-blue animate-spin mb-4" />
        <p className="text-obsidian font-bold">Đang tải dữ liệu hồ sơ...</p>
      </div>
    );
  }

  // Not logged in -> Show Auth UI
  if (!user) {
    return (
      <div className="min-h-screen bg-pale-slate flex flex-col relative overflow-hidden font-sans">
        <div className="absolute inset-0 z-0 opacity-70 pointer-events-none">
          <KineticGrid 
            spacing={45} 
            radius={200} 
            strength={3.5} 
            dotColor="rgba(24, 24, 27, 0.22)"
            lineColor="rgba(24, 24, 27, 0.08)"
            trailColor="rgba(33, 112, 228, 0.25)"
          />
        </div>
        <div className="asterisk-bg select-none animate-spin" style={{ animationDuration: '60s' }}>*</div>
        
        <header className="bg-white border-b border-obsidian w-full h-20 flex items-center px-4 md:px-8 relative z-10">
          <Link href="/" className="flex items-center max-w-[1200px] mx-auto w-full">
            <img 
              src="/logo.png" 
              alt="Visa Auto Tracking Logo" 
              className="h-12 w-auto object-contain"
            />
          </Link>
        </header>

        <main className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
          <div className="bg-white rounded-bento border border-obsidian p-8 max-w-md w-full neo-hover shadow-obsidian transition-all">
            <h2 className="text-2xl font-extrabold text-obsidian mb-2 text-center tracking-tight">
              {isSignUp ? "Tạo tài khoản mới" : "Đăng nhập hệ thống"}
            </h2>
            <p className="text-xs text-obsidian/60 text-center mb-6 leading-relaxed">
              Theo dõi tự động tiến trình hồ sơ của bạn, tự động quét Visa Bulletin hàng tháng và gửi thông báo trực tiếp qua Email.
            </p>

            {authError && (
              <div className="bg-red-50 border border-red-500 rounded-card p-4 text-sm text-red-600 mb-4 font-medium">
                ⚠️ {authError}
              </div>
            )}

            {authMessage && (
              <div className="bg-green-50 border border-green-500 rounded-card p-4 text-sm text-green-700 mb-4 font-medium">
                ✅ {authMessage}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              {/* Honeypot field for spam bot protection */}
              <div className="hidden" aria-hidden="true">
                <input 
                  type="text" 
                  name="user_confirm_field" 
                  value={honeypot} 
                  onChange={(e) => setHoneypot(e.target.value)} 
                  tabIndex={-1} 
                  autoComplete="off" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Email</label>
                <input 
                  type="email" 
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-pale-slate rounded-card border border-obsidian px-4 py-3 text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Mật khẩu</label>
                <div className="relative w-full">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-3 pr-12 text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-obsidian/50 hover:text-obsidian focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={authSubmitting}
                className="neo-pill neo-pill-primary w-full py-3.5 mt-2 font-bold cursor-pointer flex items-center justify-center gap-2"
              >
                {authSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {isSignUp ? "Đăng ký ngay →" : "Đăng nhập ngay →"}
              </button>
            </form>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-obsidian/10"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-obsidian/40 uppercase">Hoặc</span>
              <div className="flex-grow border-t border-obsidian/10"></div>
            </div>

            <button 
              onClick={handleGoogleSignIn}
              className="neo-pill neo-pill-secondary w-full py-3 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="font-extrabold border px-2 py-0.5 rounded border-obsidian">G</span>
              Đăng nhập bằng Google
            </button>

            <p className="text-sm text-center text-obsidian/70 mt-6">
              {isSignUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError("");
                  setAuthMessage("");
                }}
                className="font-bold text-electric-blue hover:underline cursor-pointer focus:outline-none"
              >
                {isSignUp ? "Đăng nhập tại đây" : "Đăng ký tại đây"}
              </button>
            </p>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  // User is logged in, but profile is deactivated/locked
  if (profile && profile.status === "inactive") {
    return (
      <div className="min-h-screen bg-pale-slate flex flex-col relative overflow-hidden font-sans">
        <div className="absolute inset-0 z-0 opacity-70 pointer-events-none">
          <KineticGrid 
            spacing={45} 
            radius={200} 
            strength={3.5} 
            dotColor="rgba(24, 24, 27, 0.22)"
            lineColor="rgba(24, 24, 27, 0.08)"
            trailColor="rgba(33, 112, 228, 0.25)"
          />
        </div>
        <div className="asterisk-bg select-none animate-spin" style={{ animationDuration: '60s' }}>*</div>
        
        <header className="bg-white border-b border-obsidian w-full h-20 flex items-center px-4 md:px-8 relative z-10">
          <div className="flex items-center max-w-[1200px] mx-auto w-full">
            <img 
              src="/logo.png" 
              alt="Visa Auto Tracking Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
          <div className="bg-white rounded-bento border border-obsidian p-8 max-w-md w-full text-center flex flex-col items-center gap-4 shadow-obsidian">
            <Lock className="w-16 h-16 text-red-500" />
            <h2 className="text-2xl font-black text-obsidian uppercase tracking-tight">Tài khoản bị tạm khóa</h2>
            <p className="text-sm text-obsidian/60 leading-relaxed">
              Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa đăng nhập bởi quản trị viên hệ thống. 
              Mọi dữ liệu theo dõi hồ sơ của bạn vẫn được lưu trữ an toàn. 
              Vui lòng liên hệ với ban quản trị qua email hỗ trợ để được hỗ trợ mở khóa.
            </p>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
                setProfile(null);
              }}
              className="w-full neo-pill neo-pill-primary py-3.5 mt-2 font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Đăng xuất tài khoản
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Logged in -> Show Dashboard UI
  return (
    <div className="min-h-screen bg-pale-slate flex flex-col relative overflow-hidden font-sans">
      <div className="asterisk-bg select-none animate-spin" style={{ animationDuration: '60s' }}>*</div>
      
      <Header />

      <main className="flex-grow w-full max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Left Column: Profile, Case Switcher, Settings */}
        <aside className="w-full md:w-[35%] flex flex-col gap-8">
          
          {/* Active Case Selector / Switcher */}
          {profile?.allow_multiple_cases && (
            <section className="bg-white rounded-bento border border-obsidian p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-obsidian pb-3">
                <Layers className="w-5 h-5 text-electric-blue" />
                <h3 className="text-lg font-bold text-obsidian">Danh sách Hồ sơ</h3>
              </div>
              <div className="flex flex-col gap-2">
                {cases.map((c) => (
                  <button 
                    key={c.id}
                    onClick={() => {
                      setActiveCaseId(c.id);
                      setIsEditingCase(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-card border font-bold flex justify-between items-center transition-all ${
                      c.id === activeCaseId 
                        ? "bg-electric-blue/10 border-electric-blue text-electric-blue border-2" 
                        : "bg-pale-slate border-obsidian hover:bg-white text-obsidian"
                    }`}
                  >
                    <span className="truncate">{c.name} ({c.category})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
                <button 
                  onClick={handleAddNewCase}
                  className="w-full mt-2 neo-pill neo-pill-secondary py-2.5 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <FolderPlus className="w-4 h-4" />
                  Thêm hồ sơ mới
                </button>
              </div>
            </section>
          )}

          {/* Profile Card */}
          <section className="bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-4 relative overflow-hidden neo-hover transition-all">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-pale-slate rounded-full opacity-20 pointer-events-none"></div>
            
            <div className="flex items-center gap-3 border-b border-obsidian pb-4">
              <div className="w-10 h-10 rounded-full bg-obsidian flex items-center justify-center text-white">
                <UserIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Hồ sơ của tôi</h2>
              {profile?.role === "admin" && (
                <Link href="/admin" className="ml-auto neo-pill neo-pill-outline text-[10px] px-2 py-0.5 font-bold">
                  ADMIN
                </Link>
              )}
            </div>

            {/* Active Case Details Display */}
            {activeCase ? (
              <div className="flex flex-col gap-4 mt-2">
                <div>
                  <span className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider block mb-1">TÊN GHI NHỚ</span>
                  <div className="font-bold text-base">{activeCase.name}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider block mb-1">DIỆN BẢO LÃNH</span>
                  <div className="text-xs bg-pale-slate p-2.5 rounded-card border border-obsidian inline-block font-bold">
                    {activeCase.category} 
                    {activeCase.category === "F1" && " - Con độc thân của CD Mỹ"}
                    {activeCase.category === "F2A" && " - Vợ/chồng & con nhỏ thường trú nhân"}
                    {activeCase.category === "F2B" && " - Con độc thân > 21 tuổi thường trú nhân"}
                    {activeCase.category === "F3" && " - Con đã kết hôn của CD Mỹ"}
                    {activeCase.category === "F4" && " - Anh chị em của CD Mỹ"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider block mb-1">NGÀY ƯU TIÊN</span>
                    <div className="font-mono text-sm font-bold bg-pale-slate px-2 py-1.5 border border-obsidian rounded">
                      {new Date(activeCase.priority_date).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider block mb-1">MÃ SỐ NVC CASE</span>
                    <div className="font-mono text-sm font-bold bg-pale-slate px-2 py-1.5 border border-obsidian rounded truncate" title={activeCase.nvc_case || "Chưa cập nhật"}>
                      {activeCase.nvc_case || "Chưa nhập"}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider block mb-1">MÃ SỐ INVOICE ID</span>
                  <div className="font-mono text-sm font-medium bg-pale-slate px-2 py-1.5 border border-obsidian rounded truncate" title={activeCase.invoice_id || "Chưa cập nhật"}>
                    {activeCase.invoice_id || "Chưa nhập"}
                  </div>
                </div>
                {activeCase.petitioner && (
                  <div>
                    <span className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider block mb-1">NGƯỜI BẢO LÃNH (PETITIONER)</span>
                    <div className="text-sm font-bold">{activeCase.petitioner}</div>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider block mb-1">LÃNH SỰ QUÁN</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-obsidian/60" />
                    <span>{activeCase.consulate || "Ho Chi Minh City, Vietnam"}</span>
                  </div>
                </div>

                <button 
                  onClick={startEditCase}
                  className="mt-4 w-full bg-white text-obsidian border-2 border-obsidian rounded-full py-3 px-6 font-bold hover:bg-pale-slate transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                  Chỉnh sửa hồ sơ
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center py-6">
                <Info className="w-12 h-12 text-electric-blue" />
                <div>
                  <h4 className="font-bold text-base">Bạn chưa tạo hồ sơ theo dõi</h4>
                  <p className="text-xs text-obsidian/60 mt-1">Vui lòng cung cấp ngày ưu tiên và diện bảo lãnh để theo dõi.</p>
                </div>
                <button 
                  onClick={startEditCase}
                  className="w-full neo-pill neo-pill-primary py-3 cursor-pointer"
                >
                  Tạo hồ sơ ngay +
                </button>
              </div>
            )}
          </section>

          {/* Notification settings */}
          <section className="bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-obsidian pb-4">
              <div className="w-10 h-10 rounded-full bg-pale-slate border border-obsidian flex items-center justify-center text-obsidian">
                <Settings className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Cài đặt Email</h2>
            </div>
            
            <div className="flex flex-col gap-5 mt-2">
              <div className="flex items-start justify-between gap-4">
                <label className="text-sm text-obsidian/80 flex-grow cursor-pointer font-medium" htmlFor="toggle-drip">
                  Nhận email bài viết hướng dẫn theo lộ trình hồ sơ (DS-260, I-864...)
                </label>
                <div className="relative inline-block w-12 flex-shrink-0 align-middle select-none transition duration-200 ease-in mt-1">
                  <input 
                    type="checkbox"
                    id="toggle-drip"
                    checked={enableDrip}
                    onChange={(e) => setEnableDrip(e.target.checked)}
                    className="absolute block w-6 h-6 rounded-full bg-white border border-obsidian appearance-none cursor-pointer checked:right-0 checked:bg-obsidian transition-all focus:outline-none"
                    style={{ right: enableDrip ? '0' : '24px' }}
                  />
                  <label 
                    htmlFor="toggle-drip"
                    className={`block overflow-hidden h-6 rounded-full border border-obsidian cursor-pointer transition-all ${
                      enableDrip ? "bg-success-mint" : "bg-pale-slate"
                    }`}
                  ></label>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              disabled={settingsSubmitting}
              className="mt-4 w-full neo-pill neo-pill-primary py-3 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {settingsSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu cấu hình email
            </button>
          </section>
        </aside>

        {/* Right Column: Case Progress, Timeline, Chart */}
        <div className="w-full md:w-[65%] flex flex-col gap-8">
          
          {/* Edit / Create Case Form Container */}
          {isEditingCase && (
            <section className="bg-white rounded-bento border-2 border-electric-blue p-6 md:p-8 shadow-obsidian flex flex-col gap-6">
              <h2 className="text-xl font-black text-electric-blue border-b border-pale-slate pb-3">
                {activeCaseId ? "CẬP NHẬT THÔNG TIN HỒ SƠ" : "KHỞI TẠO HỒ SƠ VISA MỚI"}
              </h2>
              
              <form onSubmit={handleSaveCase} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label htmlFor="caseName" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Tên ghi nhớ hồ sơ</label>
                  <input 
                    id="caseName"
                    type="text"
                    required
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    placeholder="Ví dụ: Hồ sơ bảo lãnh của Huân"
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-2.5 text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="caseCategory" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Diện bảo lãnh (Visa Category)</label>
                  <select 
                    id="caseCategory"
                    value={caseCategory}
                    onChange={(e) => setCaseCategory(e.target.value)}
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-2.5 text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full appearance-none font-bold"
                  >
                    <option value="F1">F1 - Con độc thân của công dân Mỹ</option>
                    <option value="F2A">F2A - Vợ/chồng & Con nhỏ thường trú nhân</option>
                    <option value="F2B">F2B - Con độc thân trên 21 tuổi thường trú nhân</option>
                    <option value="F3">F3 - Con đã kết hôn của công dân Mỹ</option>
                    <option value="F4">F4 - Anh chị em của công dân Mỹ</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="casePriorityDate" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Ngày ưu tiên (Priority Date)</label>
                  <input 
                    id="casePriorityDate"
                    type="date"
                    required
                    value={casePriorityDate}
                    onChange={(e) => setCasePriorityDate(e.target.value)}
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-2.5 text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="caseNvcCase" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Mã số NVC Case Number (Nếu có)</label>
                  <input 
                    id="caseNvcCase"
                    type="text"
                    value={caseNvcCase}
                    onChange={(e) => setCaseNvcCase(e.target.value)}
                    placeholder="Ví dụ: HCM2021526022"
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-2.5 text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full font-mono uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="caseInvoiceId" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Mã số Invoice ID (Nếu có)</label>
                  <input 
                    id="caseInvoiceId"
                    type="text"
                    value={caseInvoiceId}
                    onChange={(e) => setCaseInvoiceId(e.target.value)}
                    placeholder="Ví dụ: IVSCA00001821415"
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-2.5 text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full font-mono uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="casePetitioner" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Tên người bảo lãnh chính</label>
                  <input 
                    id="casePetitioner"
                    type="text"
                    value={casePetitioner}
                    onChange={(e) => setCasePetitioner(e.target.value)}
                    placeholder="Ví dụ: John Doe"
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-2.5 text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="caseConsulate" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Lãnh sự quán giải quyết phỏng vấn</label>
                  <input 
                    id="caseConsulate"
                    type="text"
                    value={caseConsulate}
                    onChange={(e) => setCaseConsulate(e.target.value)}
                    placeholder="Ho Chi Minh City, Vietnam"
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-2.5 text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full"
                  />
                </div>

                <div className="flex justify-end gap-3 md:col-span-2 pt-4 border-t border-pale-slate">
                  <button 
                    type="button"
                    onClick={() => setIsEditingCase(false)}
                    className="neo-pill neo-pill-secondary py-2.5 px-6 cursor-pointer text-sm"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    disabled={caseSubmitting}
                    className="neo-pill neo-pill-primary py-2.5 px-8 cursor-pointer text-sm flex items-center gap-2"
                  >
                    {caseSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Lưu hồ sơ →
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Success Banner if Case is Current */}
          {activeCase && isCaseCurrent && (
            <section className="bg-success-mint rounded-bento border-2 border-obsidian p-6 md:p-8 shadow-obsidian text-obsidian relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
              <div className="relative z-10 flex flex-col gap-2">
                <h2 className="text-xl md:text-2xl font-black flex items-center gap-2 uppercase tracking-tight">
                  🎉 HỒ SƠ ĐÃ ĐẾN HẠN (CURRENT!)
                </h2>
                <div className="text-sm bg-white/80 p-4 rounded-card border border-obsidian mt-2 font-medium leading-relaxed">
                  Ngày nộp hồ sơ của bạn đã vượt qua mốc Ngày nộp đơn (Dates for Filing). Bạn đã đủ điều kiện đóng phí và nộp các giấy tờ dân sự cho trung tâm thị thực NVC.
                  <br/><br/>
                  <span className="font-bold">Ngày ưu tiên:</span> <span className="font-mono bg-pale-slate px-1.5 py-0.5 rounded border border-obsidian">{new Date(activeCase.priority_date).toLocaleDateString("vi-VN")}</span>
                  {" - "}
                  <span className="font-bold">Hạn nộp hồ sơ hiện hành (Bảng B):</span> <span className="font-mono bg-pale-slate px-1.5 py-0.5 rounded border border-obsidian">{activeBulletin ? new Date(activeBulletin.filing_date).toLocaleDateString("vi-VN") : "08/06/2018"}</span>
                </div>
              </div>
            </section>
          )}

          {/* Dynamic Progress Timeline */}
          {activeCase ? (
            <section className="bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-6 neo-hover transition-all">
              <div className="flex items-center justify-between border-b border-obsidian pb-4">
                <h2 className="text-xl md:text-2xl font-bold text-obsidian">Tiến trình hồ sơ của tôi</h2>
                <span className="text-xs bg-pale-slate p-2 border border-obsidian rounded-full font-bold">LỘ TRÌNH CHI TIẾT</span>
              </div>
              <div className="relative mt-2 pl-2 md:pl-8">
                {/* Vertical Timeline Bar */}
                <div className="absolute left-6 md:left-12 top-2 bottom-8 w-1.5 bg-pale-slate rounded-full border border-obsidian/10"></div>
                
                {/* Steps mapping */}
                <div className="flex flex-col gap-6 relative">
                  {steps.map((step, idx) => {
                    const isCompleted = step.status === "completed";
                    const isActive = step.status === "active";
                    const isManuallyCompleted = (activeCase?.completed_steps || []).includes(idx);
                    const showCompleted = isCompleted || isManuallyCompleted;
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setUserExpandedStepIndex(expandedStepIndex === idx ? -1 : idx)}
                        className="flex items-start gap-4 md:gap-6 relative z-10 transition-all cursor-pointer group"
                      >
                        <div className={`w-8 h-8 rounded-full border border-obsidian flex items-center justify-center shrink-0 mt-1 transition-all ${
                          showCompleted ? "bg-success-mint text-white" : 
                          isActive ? "bg-white border-2 border-electric-blue text-electric-blue font-black scale-110 shadow-sm" : "bg-pale-slate text-obsidian/30 group-hover:bg-obsidian/5"
                        }`}>
                          {showCompleted ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <span className="text-xs font-bold font-mono">{idx + 1}</span>
                          )}
                        </div>
                        <div className={`flex-grow p-3 rounded-card border transition-all ${
                          isActive && !isManuallyCompleted
                            ? "bg-electric-blue/5 border-2 border-electric-blue shadow-obsidian mr-2" 
                            : "border-transparent hover:bg-pale-slate/30"
                        }`}>
                          <div className="flex justify-between items-center">
                            <h3 className={`font-bold text-sm md:text-base ${
                              showCompleted ? "line-through text-obsidian/40" : 
                              isActive ? "text-electric-blue font-black" : "text-obsidian"
                            }`}>
                              {step.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              {/* Manual completion checkbox */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStepCompleted(idx);
                                }}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                                  isManuallyCompleted
                                    ? "bg-success-mint border-success-mint text-white"
                                    : isCompleted
                                      ? "bg-success-mint/30 border-success-mint/50 text-success-mint cursor-default"
                                      : "border-obsidian/50 hover:border-electric-blue hover:bg-electric-blue/5"
                                }`}
                                title={isManuallyCompleted ? "Bỏ đánh dấu hoàn thành" : "Đánh dấu đã hoàn thành"}
                              >
                                {(isManuallyCompleted || isCompleted) && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>
                              <span className="text-xs text-obsidian/40 font-mono transition-transform duration-200">
                                {expandedStepIndex === idx ? "▼" : "▶"}
                              </span>
                            </div>
                          </div>
                          <div className={`transition-all duration-300 overflow-hidden ${
                            expandedStepIndex === idx ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"
                          }`}>
                            <p className="text-xs md:text-sm text-obsidian/60 leading-relaxed">
                              {step.desc}
                            </p>
                             {step.link && (
                              <a 
                                href={step.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-xs font-bold text-electric-blue bg-white border border-electric-blue px-3 py-1 rounded-full mt-2 hover:bg-electric-blue/5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {step.title.includes("DS-260") ? "Tải mẫu đơn DS-260" : "Truy cập CEAC"}{" "}
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : (
            <div className="bg-white rounded-bento border border-obsidian p-8 text-center flex flex-col items-center gap-4">
              <Info className="w-12 h-12 text-electric-blue" />
              <h3 className="text-xl font-bold">Vui lòng tạo hồ sơ để xem lộ trình chi tiết</h3>
              <p className="text-sm text-obsidian/60 max-w-md">Chúng tôi sẽ tự động phân tích lộ trình di trú 9 bước sau khi bạn cung cấp diện bảo lãnh và ngày ưu tiên.</p>
              <button onClick={startEditCase} className="neo-pill neo-pill-primary py-3.5 px-8 font-bold cursor-pointer">
                Tạo hồ sơ ngay +
              </button>
            </div>
          )}

          {/* Chart Section */}
          {activeCase && chartData.length > 0 && (
            <section className="bg-white rounded-bento border border-obsidian p-6 md:p-8 neo-hover transition-all">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3 border-b border-pale-slate pb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-obsidian flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-electric-blue" />
                    Biểu đồ lịch sử Visa Bulletin diện {activeCase.category}
                  </h2>
                  <p className="text-sm text-obsidian/60 mt-0.5">
                    Theo dõi sự thay đổi ngày xét duyệt visa của bạn qua các tháng.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm bg-pale-slate px-3 py-1.5 border border-obsidian rounded-card font-mono font-bold">
                  PD: {new Date(activeCase.priority_date).toLocaleDateString("vi-VN")}
                </div>
              </div>

              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f5" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#18181b', fontSize: 11, fontFamily: 'sans-serif' }}
                      axisLine={{ stroke: '#18181b' }}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tickFormatter={(t) => new Date(t).toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit" })}
                      tick={{ fill: '#18181b', fontSize: 10, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#18181b' }}
                    />
                    <Tooltip 
                      formatter={(val: any, name: any, props: any) => {
                        return name === "Bảng A (Phỏng vấn)" ? props.payload.final_action_date_str : props.payload.filing_date_str;
                      }}
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #18181b', 
                        borderRadius: '12px',
                        boxShadow: '2px 2px 0px 0px #18181b'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'sans-serif' }} />
                    <Line 
                      type="monotone" 
                      dataKey="Bảng A (Phỏng vấn)" 
                      stroke="#2170e4" 
                      strokeWidth={3}
                      activeDot={{ r: 7 }}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Bảng B (Nộp đơn)" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      activeDot={{ r: 7 }}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
