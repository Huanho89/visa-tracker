"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";

import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import KineticGrid from "@/components/KineticGrid";
import TextScramble from "@/components/TextScramble";
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
  Calendar, 
  TrendingUp, 
  Compass, 
  Info, 
  ArrowRight,
  ShieldCheck,
  Loader2,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  BarChart2,
  BookOpen
} from "lucide-react";

import { calculateTimelineSteps } from "@/lib/visa_utils";

interface BulletinRecord {
  id: string;
  month: string;
  category: string;
  chargeability: string;
  final_action_date: string;
  filing_date: string;
}

interface HomeArticle {
  id: string;
  title: string;
  slug: string;
  drip_day: number | null;
  created_at: string;
}

interface HomeClientProps {
  initialBulletins: BulletinRecord[];
  initialArticles: HomeArticle[];
}

export default function HomeClient({ initialBulletins, initialArticles }: HomeClientProps) {
  // 1. Sandbox Form State
  const [category, setCategory] = useState("F1");
  const [priorityDateStr, setPriorityDateStr] = useState("");
  const [chargeability, setChargeability] = useState("All Areas");

  // 2. Check result state (only updates when user clicks the button)
  const [isChecking, setIsChecking] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [submittedSteps, setSubmittedSteps] = useState<ReturnType<typeof calculateTimelineSteps>>([]);
  const [appliedMonth, setAppliedMonth] = useState("");
  const [appliedCategory, setAppliedCategory] = useState("");
  const [appliedPriorityDate, setAppliedPriorityDate] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  
  // Security honeypot and mobile responsive states
  const [honeypot, setHoneypot] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      const timer = setTimeout(handleResize, 0);
      window.addEventListener("resize", handleResize);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  // Categories list for select
  const categories = [
    { code: "F1", desc: "F1 - Con độc thân của công dân Mỹ" },
    { code: "F2A", desc: "F2A - Vợ/chồng & Con nhỏ của Thường trú nhân" },
    { code: "F2B", desc: "F2B - Con độc thân trên 21 tuổi của Thường trú nhân" },
    { code: "F3", desc: "F3 - Con đã kết hôn của công dân Mỹ" },
    { code: "F4", desc: "F4 - Anh chị em của công dân Mỹ" },
  ];

  // Get latest bulletins for the table (for bulletin table display only)
  const latestMonthForTable = useMemo(() => {
    const months = [...new Set(initialBulletins.map(b => b.month))];
    return months.sort((a, b) => {
      const [mA, yA] = a.split("/").map(Number);
      const [mB, yB] = b.split("/").map(Number);
      return (yB * 12 + mB) - (yA * 12 + mA);
    })[0] || "08/2026";
  }, [initialBulletins]);

  const latestBulletins = useMemo(() => {
    return initialBulletins.filter(b => b.month === latestMonthForTable);
  }, [initialBulletins, latestMonthForTable]);

  // Comparison data calculation between 2 latest months (e.g. 07/2026 vs 08/2026)
  const comparisonData = useMemo(() => {
    const categoryDescriptions: Record<string, string> = {
      F1: "Con độc thân của công dân Mỹ",
      F2A: "Vợ/chồng & Con nhỏ của Thường trú nhân",
      F2B: "Con độc thân trên 21 tuổi của Thường trú nhân",
      F3: "Con đã kết hôn của công dân Mỹ",
      F4: "Anh chị em của công dân Mỹ",
    };

    const formatVisaDate = (dateStr: string | undefined): string => {
      if (!dateStr) return "-";
      if (dateStr === "9999-12-31") return "Current";
      if (dateStr === "1900-01-01") return "N/A";
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d.padStart(2, "0")}.${m.padStart(2, "0")}.${y}`;
      }
      return dateStr;
    };

    const calculateDiffDetails = (dateNew?: string, dateOld?: string) => {
      if (!dateNew || !dateOld) {
        return { text: "-", direction: "none", style: "bg-slate-100/80 text-slate-500 border-slate-200" };
      }

      if (dateNew === "9999-12-31" && dateOld === "9999-12-31") {
        return { text: "Current", direction: "current", style: "bg-electric-blue/10 text-electric-blue border-electric-blue/20 font-bold" };
      }
      if (dateNew === "9999-12-31" && dateOld !== "9999-12-31") {
        return { text: "Mở (Current)", direction: "up", style: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-bold" };
      }
      if (dateOld === "9999-12-31" && dateNew !== "9999-12-31") {
        return { text: "Đóng (Not Current)", direction: "down", style: "bg-rose-500/10 text-rose-700 border-rose-500/30 font-bold" };
      }

      const dNew = new Date(dateNew).getTime();
      const dOld = new Date(dateOld).getTime();

      if (isNaN(dNew) || isNaN(dOld)) {
        return { text: "-", direction: "none", style: "bg-slate-100/80 text-slate-500 border-slate-200" };
      }

      const diffDays = Math.round((dNew - dOld) / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.round(diffDays / 7);

      if (diffWeeks > 0) {
        return { 
          text: `+${diffWeeks} tuần`, 
          direction: "up",
          style: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-bold shadow-xs" 
        };
      } else if (diffWeeks < 0) {
        return { 
          text: `-${Math.abs(diffWeeks)} tuần`, 
          direction: "down",
          style: "bg-rose-500/10 text-rose-700 border-rose-500/30 font-bold shadow-xs" 
        };
      } else if (diffDays > 0) {
        return { 
          text: `+${diffDays} ngày`, 
          direction: "up",
          style: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-bold shadow-xs" 
        };
      } else if (diffDays < 0) {
        return { 
          text: `-${Math.abs(diffDays)} ngày`, 
          direction: "down",
          style: "bg-rose-500/10 text-rose-700 border-rose-500/30 font-bold shadow-xs" 
        };
      } else {
        return { 
          text: "Giữ nguyên", 
          direction: "neutral",
          style: "bg-slate-100 text-slate-600 border-slate-200 font-normal" 
        };
      }
    };

    const months = [...new Set(initialBulletins.map(b => b.month))];
    const sorted = months.sort((a, b) => {
      const [mA, yA] = a.split("/").map(Number);
      const [mB, yB] = b.split("/").map(Number);
      return (yB * 12 + mB) - (yA * 12 + mA);
    });

    const latestM = sorted[0] || "08/2026";
    const previousM = sorted[1] || "07/2026";

    const latestData = initialBulletins.filter(b => b.month === latestM);
    const previousData = initialBulletins.filter(b => b.month === previousM);

    const categoriesOrder = ["F1", "F2A", "F2B", "F3", "F4"];

    const list = categoriesOrder.map((cat) => {
      const bNew = latestData.find(b => b.category === cat);
      const bOld = previousData.find(b => b.category === cat);

      const finalOldFormatted = formatVisaDate(bOld?.final_action_date);
      const finalNewFormatted = formatVisaDate(bNew?.final_action_date);
      const finalDiff = calculateDiffDetails(bNew?.final_action_date, bOld?.final_action_date);

      const filingOldFormatted = formatVisaDate(bOld?.filing_date);
      const filingNewFormatted = formatVisaDate(bNew?.filing_date);
      const filingDiff = calculateDiffDetails(bNew?.filing_date, bOld?.filing_date);

      return {
        category: cat,
        description: categoryDescriptions[cat] || "",
        finalOldFormatted,
        finalNewFormatted,
        finalDiff,
        filingOldFormatted,
        filingNewFormatted,
        filingDiff,
      };
    });

    return {
      latestMonth: latestM,
      previousMonth: previousM,
      list
    };
  }, [initialBulletins]);

  // Handle check button click: fetch latest bulletin data, compute steps
  const handleCheck = useCallback(async () => {
    if (!priorityDateStr) return;
    
    // Honeypot bot detection
    if (honeypot) {
      setIsChecking(true);
      setTimeout(() => {
        setIsChecking(false);
        setResultVisible(false);
      }, 1000);
      return;
    }

    setIsChecking(true);
    setResultVisible(false);

    try {
      // Fetch latest bulletins from API
      const res = await fetch("/api/bulletins/latest");
      const json = await res.json();
      const freshBulletins: BulletinRecord[] = json.bulletins || [];
      const month: string = json.month || latestMonthForTable;

      const bulletin = freshBulletins.find(b => b.category === category) || null;
      const newSteps = calculateTimelineSteps(
        { priority_date: priorityDateStr, category },
        bulletin,
        true
      );

      setSubmittedSteps(newSteps);
      setAppliedMonth(month);
      setAppliedCategory(category);
      setAppliedPriorityDate(priorityDateStr);

      // Small delay for animation
      setTimeout(() => {
        setResultVisible(true);
        // Scroll to result on mobile
        if (window.innerWidth < 1024) {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 200);
    } catch {
      // Fallback to initial data
      const bulletin = latestBulletins.find(b => b.category === category) || null;
      const newSteps = calculateTimelineSteps(
        { priority_date: priorityDateStr, category },
        bulletin,
        true
      );
      setSubmittedSteps(newSteps);
      setAppliedMonth(latestMonthForTable);
      setAppliedCategory(category);
      setAppliedPriorityDate(priorityDateStr);
      setTimeout(() => setResultVisible(true), 200);
    } finally {
      setIsChecking(false);
    }
  }, [priorityDateStr, category, latestBulletins, latestMonthForTable, honeypot]);


  // Chart Data preparation
  const chartData = useMemo(() => {
    // Filter by selected category, sort chronologically
    // In mock data: month format is MM/YYYY (05/2026, 06/2026, 07/2026)
    const filtered = initialBulletins.filter(b => b.category === category);
    
    // Simple chronological sort for mock months
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
  }, [initialBulletins, category]);

  // Chart formatter for tooltip
  const formatTooltipValue = (value: any, name: any, props: any) => {
    if (name === "Bảng A (Phỏng vấn)") {
      return props.payload.final_action_date_str;
    }
    return props.payload.filing_date_str;
  };

  // Chart Y-axis tick formatter
  const formatYAxis = (tick: number) => {
    return new Date(tick).toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit" });
  };

  return (
    <div className="text-obsidian bg-pale-slate font-sans min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Asterisk Decoration */}
      <div className="asterisk-bg select-none animate-spin" style={{ animationDuration: '60s' }}>*</div>
      
      <Header />
      
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-16 flex flex-col gap-12 relative z-10">
        {/* Hero Section */}
        <section className="bg-white border-2 border-obsidian rounded-bento overflow-hidden p-8 md:p-16 flex flex-col items-center text-center relative shadow-flat select-none">
          {/* Interactive grid background */}
          <div className="absolute inset-0 z-0 opacity-85 pointer-events-none">
            <KineticGrid 
              spacing={35} 
              radius={240} 
              strength={4.5} 
              dotColor="rgba(24, 24, 27, 0.25)"
              lineColor="rgba(24, 24, 27, 0.08)"
              trailColor="rgba(33, 112, 228, 0.25)"
              trail={true}
            />
          </div>

          <div className="asterisk-bg z-0" style={{ top: "10%", left: "5%", right: "auto", fontSize: "120px" }}>*</div>
          
          <div className="relative z-10 flex flex-col items-center">
            <h1 className="font-sans text-4xl md:text-6xl font-extrabold max-w-4xl mb-6 leading-tight text-obsidian tracking-tight">
              Kiểm tra &amp; <span className="neo-pill neo-pill-outline mx-2 inline-flex translate-y-[-4px] select-none min-w-[130px] justify-center"><TextScramble text="Theo dõi" triggerOn="both" /></span> Hồ sơ Định cư Mỹ <span className="neo-pill neo-pill-outline mx-2 inline-flex translate-y-[-4px] select-none min-w-[130px] justify-center"><TextScramble text="tự động" triggerOn="both" /></span> của bạn
            </h1>
            <p className="font-sans text-lg md:text-xl max-w-2xl mb-8 text-obsidian/70">
              Hỗ trợ tracking trực quan, tự động quét Visa Bulletin hàng tháng và gửi thông báo trực tiếp qua Email.
            </p>
            <a href="#sandbox-check" className="neo-pill neo-pill-primary text-base md:text-lg px-8 py-4 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 min-w-[220px] inline-flex justify-center items-center">
              <TextScramble text="Bắt đầu tra cứu →" triggerOn="hover" />
            </a>
          </div>
        </section>

        {/* Illustration Row (Cards) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-black-card text-white rounded-bento p-6 flex flex-col gap-4 relative overflow-hidden neo-hover-card border border-obsidian transition-all group">
            <div className="w-full h-48 bg-obsidian rounded-card mb-4 overflow-hidden relative border border-obsidian/20">
              <Image 
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                alt="Giai đoạn Sở Di Trú Mỹ (USCIS Approved)" 
                src="/images/visa_uscis_approved.png"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
            </div>
            <h3 className="text-xl font-bold leading-tight text-white">
              Sở Di Trú Chấp Thuận<br/>
              <span className="text-white/50 text-sm font-normal">(USCIS Approved)</span>
            </h3>
            <p className="text-sm text-white/70 mt-auto">Hồ sơ được thông qua tại Mỹ, chuẩn bị chuyển qua trung tâm lưu trữ.</p>
          </div>
          {/* Card 2 */}
          <div className="bg-black-card text-white rounded-bento p-6 flex flex-col gap-4 relative overflow-hidden neo-hover-card border border-obsidian transition-all group">
            <div className="w-full h-48 bg-obsidian rounded-card mb-4 overflow-hidden relative border border-obsidian/20">
              <Image 
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                alt="Giai đoạn NVC Tiếp Nhận (NVC Stage)" 
                src="/images/visa_nvc_stage.png"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
            </div>
            <h3 className="text-xl font-bold leading-tight text-white">
              NVC Tiếp Nhận &amp; Thu Phí<br/>
              <span className="text-white/50 text-sm font-normal">(NVC Stage)</span>
            </h3>
            <p className="text-sm text-white/70 mt-auto">Cấp số Case Number &amp; Invoice ID để đóng phí và nộp đơn dân sự DS-260.</p>
          </div>
          {/* Card 3 */}
          <div className="bg-black-card text-white rounded-bento p-6 flex flex-col gap-4 relative overflow-hidden neo-hover-card border border-obsidian transition-all group">
            <div className="w-full h-48 bg-obsidian rounded-card mb-4 overflow-hidden relative border border-obsidian/20">
              <Image 
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                alt="Giai đoạn Phỏng vấn &amp; Cấp Visa (Visa Issued)" 
                src="/images/visa_issued_stage.png"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
            </div>
            <h3 className="text-xl font-bold leading-tight text-white">
              Phỏng Vấn &amp; Cấp Visa<br/>
              <span className="text-white/50 text-sm font-normal">(Visa Issued)</span>
            </h3>
            <p className="text-sm text-white/70 mt-auto">Khám sức khỏe, chích ngừa và hoàn tất phỏng vấn nhận visa định cư Mỹ.</p>
          </div>
        </section>

        {/* Visa Bulletin Table */}
        <section id="visa-bulletin" className="bg-white rounded-bento border border-obsidian p-6 md:p-8 relative neo-hover transition-all">
          <div className="absolute top-4 right-6 text-4xl text-obsidian opacity-10 font-sans leading-none">*</div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
            <div>
              <h2 className="text-2xl font-bold text-obsidian flex items-center gap-2">
                <Calendar className="w-6 h-6 text-electric-blue" />
                Lịch Visa Bulletin &amp; Lịch mở hồ sơ NVC
              </h2>
              <p className="text-sm text-obsidian/60 mt-1">Bản cập nhật mới nhất (Áp dụng cho tháng {latestMonthForTable})</p>
            </div>
            <span className="neo-pill neo-pill-outline text-xs px-3 py-1 font-bold select-none">Tháng {latestMonthForTable}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-obsidian">
                  <th className="py-4 px-2 text-xs font-bold text-obsidian/60 uppercase tracking-wider">Diện bảo lãnh (Visa Category)</th>
                  <th className="py-4 px-2 text-xs font-bold text-obsidian/60 uppercase tracking-wider">Ngày Hành Động Cuối (Final Action Date - Bảng A)</th>
                  <th className="py-4 px-2 text-xs font-bold text-obsidian/60 uppercase tracking-wider">Ngày Nộp Hồ Sơ (Dates for Filing - Bảng B)</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm md:text-base">
                {latestBulletins.length > 0 ? (
                  latestBulletins.map((b) => {
                    const isSelected = b.category === category;
                    return (
                      <tr 
                        key={b.id} 
                        onClick={() => setCategory(b.category)}
                        className={`border-b border-pale-slate cursor-pointer hover:bg-pale-slate transition-colors ${
                          isSelected ? "bg-electric-blue/5 border-l-4 border-l-electric-blue pl-2" : ""
                        }`}
                      >
                        <td className="py-4 px-2 font-sans font-bold text-obsidian">
                          {b.category} 
                          {b.category === "F1" && <span className="font-normal text-xs text-obsidian/60 block md:inline md:ml-2">(Con độc thân của công dân Mỹ)</span>}
                          {b.category === "F2A" && <span className="font-normal text-xs text-obsidian/60 block md:inline md:ml-2">(Vợ/chồng &amp; Con nhỏ của Thường trú nhân)</span>}
                          {b.category === "F2B" && <span className="font-normal text-xs text-obsidian/60 block md:inline md:ml-2">(Con độc thân trên 21 tuổi của Thường trú nhân)</span>}
                          {b.category === "F3" && <span className="font-normal text-xs text-obsidian/60 block md:inline md:ml-2">(Con đã kết hôn của công dân Mỹ)</span>}
                          {b.category === "F4" && <span className="font-normal text-xs text-obsidian/60 block md:inline md:ml-2">(Anh chị em của công dân Mỹ)</span>}
                        </td>
                        <td className="py-4 px-2 font-bold">{new Date(b.final_action_date).toLocaleDateString("vi-VN")}</td>
                        <td className="py-4 px-2 font-bold">{new Date(b.filing_date).toLocaleDateString("vi-VN")}</td>
                      </tr>
                    );
                  })
                ) : (
                  // Fallback statically if table is empty
                  <>
                    <tr className="border-b border-pale-slate cursor-pointer hover:bg-pale-slate transition-colors" onClick={() => setCategory("F1")}>
                      <td className="py-4 px-2 font-sans font-bold text-obsidian">F1 <span className="font-normal text-xs text-obsidian/60 block md:inline md:ml-2">(Con độc thân của công dân Mỹ)</span></td>
                      <td className="py-4 px-2 font-bold">22/10/2015</td>
                      <td className="py-4 px-2 font-bold">01/09/2017</td>
                    </tr>
                    <tr className="border-b border-pale-slate cursor-pointer hover:bg-pale-slate transition-colors bg-electric-blue/5 border-l-4 border-l-electric-blue pl-2" onClick={() => setCategory("F2B")}>
                      <td className="py-4 px-2 font-sans font-bold text-obsidian">F2B <span className="font-normal text-xs text-obsidian/60 block md:inline md:ml-2">(Con độc thân trên 21 tuổi của Thường trú nhân)</span></td>
                      <td className="py-4 px-2 font-bold">22/09/2017</td>
                      <td className="py-4 px-2 font-bold">08/06/2018</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Section Footer Note */}
          <div className="mt-6 pt-6 border-t border-obsidian/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs select-none">
            <div className="flex items-center gap-2 text-obsidian/60">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-mint opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success-mint"></span>
              </span>
              <span>Dữ liệu được tự động đồng bộ hàng tháng từ nguồn chính thức của Bộ Ngoại giao Hoa Kỳ.</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-obsidian/50 font-medium">Nguồn chính thức:</span>
              <a 
                href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pale-slate hover:bg-obsidian hover:text-white border border-obsidian rounded-card transition-all duration-300 font-bold group shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                <TextScramble 
                  text="travel.state.gov" 
                  className="font-mono text-xs" 
                  triggerOn="hover" 
                  speed={20}
                />
                <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
              </a>
            </div>
          </div>
        </section>

        {/* Section: Biến động tăng/giảm giữa 2 đợt cập nhật */}
        <section className="bg-white rounded-bento border-2 border-obsidian p-5 md:p-8 neo-hover transition-all relative overflow-hidden">
          {/* Top subtle gradient line accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-electric-blue via-violet-500 to-emerald-400" />

          {/* Section Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-obsidian/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-card border border-obsidian/20 bg-pale-slate shrink-0">
                <BarChart2 className="w-5 h-5 text-electric-blue animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-black text-obsidian tracking-tight">
                    Biến Động Lịch Visa
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-electric-blue/10 text-electric-blue border border-electric-blue/20">
                    <Sparkles className="w-3 h-3" /> Đối chiếu 2 kỳ
                  </span>
                </div>
                <p className="text-xs text-obsidian/60 mt-0.5">
                  Chi tiết số tuần tăng / giảm giữa đợt cập nhật <strong className="text-obsidian">{comparisonData.previousMonth}</strong> và <strong className="text-electric-blue">{comparisonData.latestMonth}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="neo-pill neo-pill-outline text-xs px-3 py-1.5 font-bold font-mono">
                Tháng {comparisonData.previousMonth} ➔ Tháng {comparisonData.latestMonth}
              </span>
            </div>
          </div>

          {/* Desktop & Tablet Table (Fits 100% width cleanly without horizontal scrolling) */}
          <div className="hidden md:block w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                {/* Group Header Row */}
                <tr className="border-b border-obsidian/20 text-xs font-bold text-obsidian">
                  <th className="py-2.5 px-3 w-[22%] bg-pale-slate/80 rounded-tl-card border-r border-obsidian/10">Diện Visa</th>
                  <th colSpan={3} className="py-2.5 px-3 text-center bg-blue-50/50 border-r border-obsidian/10 uppercase tracking-wider text-[11px] font-black text-electric-blue">
                    Bảng A: Ngày Hành Động Cuối (Phỏng vấn)
                  </th>
                  <th colSpan={3} className="py-2.5 px-3 text-center bg-emerald-50/50 rounded-tr-card uppercase tracking-wider text-[11px] font-black text-emerald-700">
                    Bảng B: Ngày Nộp Hồ Sơ (NVC)
                  </th>
                </tr>
                {/* Subheader Row */}
                <tr className="border-b-2 border-obsidian bg-pale-slate/40 text-[11px] font-bold text-obsidian/70 uppercase">
                  <th className="py-2 px-3 border-r border-obsidian/10">Loại hồ sơ</th>
                  <th className="py-2 px-2 text-center w-[12%]">T{comparisonData.previousMonth}</th>
                  <th className="py-2 px-2 text-center w-[12%] font-black text-obsidian">T{comparisonData.latestMonth}</th>
                  <th className="py-2 px-2 text-center w-[15%] border-r border-obsidian/10">Biến động</th>
                  <th className="py-2 px-2 text-center w-[12%]">T{comparisonData.previousMonth}</th>
                  <th className="py-2 px-2 text-center w-[12%] font-black text-obsidian">T{comparisonData.latestMonth}</th>
                  <th className="py-2 px-2 text-center w-[15%]">Biến động</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs divide-y divide-pale-slate">
                {comparisonData.list.map((row) => (
                  <tr key={row.category} className="hover:bg-electric-blue/[0.03] transition-colors group">
                    <td className="py-3 px-3 font-sans font-bold text-obsidian border-r border-obsidian/10">
                      <span className="text-sm font-black text-electric-blue mr-1.5">{row.category}</span>
                      <span className="font-normal text-[11px] text-obsidian/60 block truncate">{row.description}</span>
                    </td>
                    {/* Final Action Old */}
                    <td className="py-3 px-2 text-center text-obsidian/70">
                      {row.finalOldFormatted}
                    </td>
                    {/* Final Action New */}
                    <td className="py-3 px-2 text-center font-black text-obsidian bg-blue-50/20">
                      {row.finalNewFormatted}
                    </td>
                    {/* Final Action Diff */}
                    <td className="py-3 px-2 text-center border-r border-obsidian/10">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] border ${row.finalDiff.style}`}>
                        {row.finalDiff.direction === "up" && <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0" />}
                        {row.finalDiff.direction === "down" && <ArrowDownRight className="w-3 h-3 text-rose-600 shrink-0" />}
                        {row.finalDiff.direction === "neutral" && <Minus className="w-3 h-3 text-slate-400 shrink-0" />}
                        {row.finalDiff.text}
                      </span>
                    </td>
                    {/* Filing Date Old */}
                    <td className="py-3 px-2 text-center text-obsidian/70">
                      {row.filingOldFormatted}
                    </td>
                    {/* Filing Date New */}
                    <td className="py-3 px-2 text-center font-black text-obsidian bg-emerald-50/20">
                      {row.filingNewFormatted}
                    </td>
                    {/* Filing Date Diff */}
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] border ${row.filingDiff.style}`}>
                        {row.filingDiff.direction === "up" && <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0" />}
                        {row.filingDiff.direction === "down" && <ArrowDownRight className="w-3 h-3 text-rose-600 shrink-0" />}
                        {row.filingDiff.direction === "neutral" && <Minus className="w-3 h-3 text-slate-400 shrink-0" />}
                        {row.filingDiff.text}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid Cards (Rendered cleanly on mobile devices without any horizontal scrollbars) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {comparisonData.list.map((row) => (
              <div key={row.category} className="bg-pale-slate/30 border border-obsidian/20 rounded-card p-3.5 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-obsidian/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-electric-blue text-white rounded font-black text-xs">{row.category}</span>
                    <span className="text-xs font-bold text-obsidian">{row.description}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Bảng A */}
                  <div className="bg-white border border-obsidian/10 rounded p-2.5 flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-electric-blue">Bảng A (Phỏng vấn)</span>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-obsidian/50">T{comparisonData.previousMonth}:</span>
                      <span>{row.finalOldFormatted}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono font-bold">
                      <span className="text-obsidian/70">T{comparisonData.latestMonth}:</span>
                      <span className="text-obsidian">{row.finalNewFormatted}</span>
                    </div>
                    <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-[10px] text-obsidian/50 uppercase">Biến động:</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border ${row.finalDiff.style}`}>
                        {row.finalDiff.direction === "up" && <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0" />}
                        {row.finalDiff.direction === "down" && <ArrowDownRight className="w-3 h-3 text-rose-600 shrink-0" />}
                        {row.finalDiff.text}
                      </span>
                    </div>
                  </div>

                  {/* Bảng B */}
                  <div className="bg-white border border-obsidian/10 rounded p-2.5 flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Bảng B (Nộp NVC)</span>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-obsidian/50">T{comparisonData.previousMonth}:</span>
                      <span>{row.filingOldFormatted}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono font-bold">
                      <span className="text-obsidian/70">T{comparisonData.latestMonth}:</span>
                      <span className="text-obsidian">{row.filingNewFormatted}</span>
                    </div>
                    <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-[10px] text-obsidian/50 uppercase">Biến động:</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border ${row.filingDiff.style}`}>
                        {row.filingDiff.direction === "up" && <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0" />}
                        {row.filingDiff.direction === "down" && <ArrowDownRight className="w-3 h-3 text-rose-600 shrink-0" />}
                        {row.filingDiff.text}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Functionality Box (Form & Results) */}
        <section id="sandbox-check" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-6 neo-hover transition-all">
            <h2 className="text-2xl font-bold text-obsidian flex items-center gap-2">
              <Compass className="w-6 h-6 text-electric-blue" />
              Kiểm tra trạng thái hồ sơ (Tra cứu nhanh)
            </h2>
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleCheck(); }}>
              {/* Honeypot field for spam bot protection */}
              <div className="hidden" aria-hidden="true">
                <input 
                  type="text" 
                  name="website_name" 
                  value={honeypot} 
                  onChange={(e) => setHoneypot(e.target.value)} 
                  tabIndex={-1} 
                  autoComplete="off" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="category" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Diện bảo lãnh (Visa Category)</label>
                <select 
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-pale-slate rounded-card border border-obsidian px-4 py-3 font-medium text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full appearance-none"
                >
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>{c.desc}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="priorityDate" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Ngày ưu tiên (Priority Date)</label>
                <input 
                  id="priorityDate"
                  type="date"
                  value={priorityDateStr}
                  onChange={(e) => setPriorityDateStr(e.target.value)}
                  className="bg-pale-slate rounded-card border border-obsidian px-4 py-3 font-mono font-medium text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="chargeability" className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Khu vực quốc gia (Chargeability Area)</label>
                <select 
                  id="chargeability"
                  value={chargeability}
                  onChange={(e) => setChargeability(e.target.value)}
                  className="bg-pale-slate rounded-card border border-obsidian px-4 py-3 font-medium text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full appearance-none"
                >
                  <option value="All Areas">Vietnam (Tất cả khu vực ngoại trừ các quốc gia đặc thù)</option>
                </select>
              </div>
              <div className="bg-pale-slate rounded-card p-4 border border-dashed border-obsidian/30 flex items-start gap-2.5">
                <Info className="w-5 h-5 text-electric-blue shrink-0 mt-0.5" />
                <p className="text-xs text-obsidian/70 leading-relaxed">
                  Công cụ tra cứu nhanh cho phép kiểm tra mà không cần tạo tài khoản. Kết quả sẽ được đối chiếu với dữ liệu Visa Bulletin mới nhất hiện tại.
                </p>
              </div>
              {/* Check Button */}
              <button
                id="sandbox-check-btn"
                type="submit"
                disabled={isChecking || !priorityDateStr}
                className="w-full py-3.5 px-6 rounded-card font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 border-2 border-obsidian"
                style={{
                  backgroundColor: isChecking ? "#f1f5f9" : "#18181b",
                  color: isChecking ? "#94a3b8" : "#ffffff",
                  cursor: isChecking || !priorityDateStr ? "not-allowed" : "pointer",
                  boxShadow: isChecking ? "none" : "3px 3px 0px #2170e4",
                  transform: isChecking ? "none" : undefined
                }}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Kiểm tra trạng thái
                  </>
                )}
              </button>
            </form>
          </div>
          
          {/* Right: Results */}
          <div ref={resultRef} className="bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-6 neo-hover transition-all relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
              <ShieldCheck className="w-64 h-64 text-obsidian" />
            </div>
            <h2 className="text-2xl font-bold text-obsidian flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-success-mint" />
              Kết quả tiến trình hồ sơ của bạn
            </h2>

            {/* Empty state: prompt user to click check */}
            {!resultVisible && !isChecking && (
              <div className="flex-grow flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-pale-slate border-2 border-dashed border-obsidian/20 flex items-center justify-center">
                  <RefreshCw className="w-7 h-7 text-obsidian/30" />
                </div>
                <div>
                  <p className="font-bold text-obsidian/50 text-sm">Chưa có kết quả</p>
                  <p className="text-xs text-obsidian/40 mt-1">Điền thông tin và bấm <strong>&ldquo;Kiểm tra trạng thái&rdquo;</strong> để bắt đầu</p>
                </div>
              </div>
            )}

            {/* Loading state */}
            {isChecking && (
              <div className="flex-grow flex flex-col items-center justify-center gap-4 py-12">
                <Loader2 className="w-10 h-10 text-electric-blue animate-spin" />
                <p className="text-sm text-obsidian/60 font-medium">Đang đối chiếu với Visa Bulletin mới nhất...</p>
              </div>
            )}

            {/* Result */}
            {resultVisible && submittedSteps.length > 0 && (
              <>
                {/* Applied bulletin info badge */}
                <div className="flex items-center gap-2 flex-wrap -mt-2">
                  <span className="text-xs text-obsidian/50 font-medium">Đối chiếu với:</span>
                  <span className="neo-pill neo-pill-outline text-xs px-2.5 py-1 font-bold">
                    Tháng {appliedMonth}
                  </span>
                  <span className="text-xs text-obsidian/50">·</span>
                  <span className="text-xs text-obsidian/60 font-mono">
                    {new Date(appliedPriorityDate + "T00:00:00").toLocaleDateString("vi-VN")} · {appliedCategory}
                  </span>
                </div>

                {/* Sandbox Highlight Disclaimer */}
                <div className="bg-warning-amber/10 border-2 border-warning-amber rounded-card p-4 text-xs text-obsidian leading-relaxed flex items-start gap-2.5 my-2 relative z-10">
                  <span className="text-base shrink-0 select-none">💡</span>
                  <div>
                    <span className="font-bold">Lưu ý tra cứu nhanh:</span> Bạn đang kiểm tra ở chế độ ẩn danh (không cần tài khoản). Hệ thống mặc định tích xanh 2 bước đầu tiên (<span className="font-bold">Sở Di Trú Chấp Thuận</span> &amp; <span className="font-bold">NVC Tiếp Nhận</span>) và chỉ đối chiếu Ngày ưu tiên của bạn với lịch Visa Bulletin. Để cập nhật và theo dõi chính xác thực tế tiến trình 9 bước hồ sơ cá nhân của mình, vui lòng <Link href="/dashboard" className="text-electric-blue font-bold hover:underline">Đăng ký / Đăng nhập thành viên</Link>.
                  </div>
                </div>

                <div
                  className="flex-grow flex flex-col gap-4 relative z-10"
                  style={{
                    animation: "fadeSlideIn 0.4s ease forwards"
                  }}
                >
                  <style>{`
                    @keyframes fadeSlideIn {
                      from { opacity: 0; transform: translateY(12px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>
                  {submittedSteps.map((step, idx) => {
                    const isCompleted = step.status === "completed";
                    const isCurrent = step.status === "active";
                    
                    return (
                      <div key={idx} className="flex flex-col">
                        <div className={`flex items-start gap-4 p-3 rounded-card transition-all ${
                          isCurrent ? "bg-success-mint/10 border border-success-mint" : ""
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-obsidian ${
                            isCompleted ? "bg-success-mint text-white" : 
                            isCurrent ? "bg-success-mint text-white animate-pulse" : "bg-pale-slate text-obsidian/40"
                          }`}>
                            {isCompleted || isCurrent ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <span className="text-xs font-bold font-mono">{idx + 1}</span>
                            )}
                          </div>
                          <div className="flex-grow">
                            <h4 className={`font-bold text-sm md:text-base ${
                              isCurrent ? "text-success-mint-dark font-black" : "text-obsidian"
                            }`}>
                              {step.title}
                            </h4>
                            <p className="text-xs md:text-sm text-obsidian/60 mt-0.5">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                        {idx < submittedSteps.length - 1 && (
                          <div className={`w-0.5 h-6 ml-7 my-1 border-l-2 ${
                            isCompleted ? "border-success-mint border-solid" : "border-obsidian/20 border-dashed"
                          }`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            
            <div className="mt-auto pt-6 border-t border-obsidian/10 flex flex-col items-center gap-4 relative z-10">
              <p className="text-xs text-center text-obsidian/60">
                Lưu hồ sơ để tự động theo dõi và nhận thông báo email trực tiếp mỗi khi ngày hành động cuối của diện {appliedCategory || category} tiến triển.
              </p>
              <Link 
                href="/dashboard" 
                className="neo-pill neo-pill-secondary w-full py-3 flex items-center justify-center gap-2"
              >
                Tạo tài khoản theo dõi tự động <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Recharts Bulletin Trend Chart */}
        <section className="bg-white rounded-bento border border-obsidian p-6 md:p-8 neo-hover transition-all">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
            <div>
              <h2 className="text-2xl font-bold text-obsidian flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-electric-blue" />
                Biểu đồ xu hướng dịch chuyển Visa Bulletin
              </h2>
              <p className="text-sm text-obsidian/60 mt-1">
                Theo dõi sự tiến triển hoặc thụt lùi ngày xét duyệt của diện <span className="font-bold text-electric-blue">{category}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-obsidian/60 font-semibold uppercase tracking-wider">Diện đang xem:</span>
              <span className="neo-pill neo-pill-outline text-xs px-3 py-1 font-bold select-none">{category}</span>
            </div>
          </div>

          <div className="w-full h-80 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f5" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(val) => isMobile ? val.replace("Tháng ", "") : val}
                  tick={{ fill: '#18181b', fontSize: isMobile ? 10 : 12, fontFamily: 'sans-serif' }}
                  axisLine={{ stroke: '#18181b' }}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tickFormatter={formatYAxis}
                  tick={{ fill: '#18181b', fontSize: isMobile ? 9 : 11, fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#18181b' }}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  trigger={isMobile ? "click" : "hover"}
                  wrapperStyle={{ zIndex: 40 }}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #18181b', 
                    borderRadius: '12px',
                    fontFamily: 'sans-serif',
                    boxShadow: '2px 2px 0px 0px #18181b'
                  }}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '10px', 
                    fontFamily: 'sans-serif',
                    fontSize: '13px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Bảng A (Phỏng vấn)" 
                  stroke="#2170e4" 
                  strokeWidth={3}
                  activeDot={{ r: 8, stroke: '#18181b', strokeWidth: 1 }}
                  dot={{ stroke: '#2170e4', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Bảng B (Nộp đơn)" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  activeDot={{ r: 8, stroke: '#18181b', strokeWidth: 1 }}
                  dot={{ stroke: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Guides & Instructions Section */}
        <section className="bg-white rounded-bento border border-obsidian p-6 md:p-8 neo-hover transition-all">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-obsidian/10 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-obsidian flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-electric-blue" />
                Cẩm nang Hướng dẫn Định cư Mỹ
              </h2>
              <p className="text-sm text-obsidian/60 mt-1">
                Các bài viết chia sẻ kinh nghiệm thực tế, quy trình làm hồ sơ NVC và phỏng vấn từ con số 0.
              </p>
            </div>
            <Link 
              href="/articles" 
              className="neo-pill neo-pill-secondary text-xs px-5 py-2 inline-flex items-center gap-1.5 font-bold self-end sm:self-auto shrink-0 transition-transform hover:scale-105 active:scale-95 duration-200"
            >
              Xem tất cả bài viết <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {initialArticles.map((art) => (
              <div 
                key={art.id} 
                className="bg-pale-slate/30 border border-obsidian/10 rounded-card p-5 flex flex-col gap-4 hover:border-obsidian hover:bg-white hover:shadow-xs transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <span className="bg-electric-blue/10 text-electric-blue text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                    Lộ trình ngày {art.drip_day ?? 0}
                  </span>
                  <span className="text-[10px] text-obsidian/40 font-mono font-bold">
                    {art.created_at ? new Date(art.created_at).toLocaleDateString("vi-VN") : "Mới cập nhật"}
                  </span>
                </div>
                
                <h3 className="text-base font-bold leading-snug text-obsidian group-hover:text-electric-blue transition-colors line-clamp-2">
                  {art.title}
                </h3>
                
                <Link 
                  href={`/articles/${art.slug}`} 
                  className="mt-auto pt-3 border-t border-obsidian/5 flex items-center gap-1 text-xs font-black text-obsidian/60 group-hover:text-electric-blue transition-colors"
                >
                  Đọc hướng dẫn <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
