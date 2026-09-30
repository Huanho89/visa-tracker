"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import * as XLSX from "xlsx";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from "recharts";
import { 
  sendNewsletterAction, 
  getEmailConfigAction, 
  saveEmailConfigAction, 
  sendTestEmailAction,
  toggleUserStatusAction,
  deleteUserAction,
  saveBulletinOverrideAction,
  createArticleAction,
  updateArticleAction,
  deleteArticleAction,
  toggleUserRoleAction,
  getSystemSettingsAction,
  saveSystemSettingsAction,
  getAnalyticsStatsAction,
  getScraperLogsAction,
  getAnalyticsReportConfigAction,
  saveAnalyticsReportConfigAction,
  triggerAnalyticsReportEmailAction,
  getSecurityLogsAction,
  blacklistIpAction,
  removeBlacklistIpAction
} from "./actions";

import { 
  LayoutDashboard,
  Users, 
  Calendar,
  Mail, 
  History, 
  ShieldAlert, 
  ChevronDown,
  ChevronUp,
  Database,
  Lock,
  Loader2,
  Compass,
  Info,
  Search,
  Send,
  RefreshCw,
  BookOpen,
  FileSpreadsheet,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  Code,
  Eye,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Settings,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  Monitor,
  Tablet,
  Download,
  Globe
} from "lucide-react";

interface ProfileRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  allow_multiple_cases: boolean;
  enable_drip_emails: boolean;
  created_at: string;
}

interface ArticleRecord {
  id: string;
  title: string;
  slug: string;
  content: string;
  drip_day: number | null;
  seo_description?: string | null;
  seo_keyword?: string | null;
}

interface DripQueueRecord {
  id: string;
  user_id: string;
  article_id: string;
  scheduled_for: string;
  sent_at: string | null;
  status: string;
  created_at: string;
  profiles?: { email: string };
  articles?: { title: string };
}

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
}

interface AdminClientProps {
  initialArticles: ArticleRecord[];
}

export default function AdminClient({ initialArticles }: AdminClientProps) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "members" | "bulletin" | "email" | "articles" | "settings" | "analytics" | "security">("dashboard");

  // States for Security Tab
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [ipBlacklist, setIpBlacklist] = useState<any[]>([]);
  const [securityStats, setSecurityStats] = useState<any>({
    totalAttempts: 0,
    failedAttempts: 0,
    successAttempts: 0,
    activeBlockedCount: 0
  });
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState("");

  // Block IP Form States
  const [blockIp, setBlockIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockDuration, setBlockDuration] = useState(30);
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockError, setBlockError] = useState("");


  // Auth & Admin check
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin dashboard data state
  const [members, setMembers] = useState<ProfileRecord[]>([]);
  const [dripQueues, setDripQueues] = useState<DripQueueRecord[]>([]);
  const [allCases, setAllCases] = useState<CaseRecord[]>([]);
  const [articles, setArticles] = useState<ArticleRecord[]>(initialArticles);
  const [syncingBulletin, setSyncingBulletin] = useState(false);
  const [syncResult, setSyncResult] = useState("");

  // Search & Pagination & Accordion states for Members
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const [systemSettings, setSystemSettings] = useState({
    siteTitle: "Visa Auto Tracking | Theo dõi Tiến trình Hồ sơ Định cư Mỹ",
    siteDescription: "Hệ thống tự động tra cứu, theo dõi tiến trình hồ sơ Visa và nhận thông báo email tự động khi có lịch Visa Bulletin mới hàng tháng.",
    maintenanceMode: false,
    allowGuestSandbox: true,
    turnstileSiteKey: "",
    turnstileSecretKey: "",
    scraperApiKey: "",
    scraperUsePremium: false,
    scraperUseRender: false,
    scraperUrlTemplate: "",
    cronCheckIntervalNormal: 24,
    cronCheckIntervalPeak: 6,
    cronPeakStartDay: 10,
    cronPeakEndDay: 20
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  // Web Analytics states
  const [analyticsDays, setAnalyticsDays] = useState<number>(30);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string>("");
  const [sendingReport, setSendingReport] = useState<boolean>(false);
  const [reportMessage, setReportMessage] = useState<string>("");

  // Analytics Report Email Config states
  const [reportTo, setReportTo] = useState<string>("hqhuan@gmail.com");
  const [reportCc, setReportCc] = useState<string>("");
  const [reportFrequency, setReportFrequency] = useState<"daily" | "3days" | "weekly" | "monthly">("weekly");
  const [reportEnabled, setReportEnabled] = useState<boolean>(true);
  const [savingReportConfig, setSavingReportConfig] = useState<boolean>(false);
  const [reportConfigMessage, setReportConfigMessage] = useState<string>("");

  // Scraper logs and automatic status states
  const [scraperLogs, setScraperLogs] = useState<any[]>([]);
  const [cronStatus, setCronStatus] = useState<any>(null);
  const [loadingScraperLogs, setLoadingScraperLogs] = useState<boolean>(false);

  // Custom alerts and confirms states
  const [modalQueue, setModalQueue] = useState<{
    id: string;
    title: string;
    message: string;
    isConfirm: boolean;
    isWarning: boolean;
    resolve: (value: boolean) => void;
  } | null>(null);

  const customAlert = (message: string, title = "Thông báo"): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalQueue({
        id: Math.random().toString(),
        title,
        message,
        isConfirm: false,
        isWarning: false,
        resolve
      });
    });
  };

  const customConfirm = (message: string, title = "Xác nhận", isWarning = false): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalQueue({
        id: Math.random().toString(),
        title,
        message,
        isConfirm: true,
        isWarning,
        resolve
      });
    });
  };

  const loadScraperLogs = async () => {
    setLoadingScraperLogs(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      const data = await getScraperLogsAction(token);
      setScraperLogs(data.logs);
      setCronStatus(data.cronStatus);
    } catch (e) {
      console.error("Error loading scraper logs:", e);
    } finally {
      setLoadingScraperLogs(false);
    }
  };

  const loadAnalyticsData = async (days: number) => {
    setLoadingAnalytics(true);
    setAnalyticsError("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      const data = await getAnalyticsStatsAction(token, days);
      setAnalyticsData(data);
    } catch (e: any) {
      setAnalyticsError(e.message || "Không thể tải dữ liệu thống kê.");
      console.error("Error loading analytics data:", e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadAnalyticsReportConfig = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      const config = await getAnalyticsReportConfigAction(token);
      setReportTo(config.to);
      setReportCc(config.cc);
      setReportFrequency(config.frequency);
      setReportEnabled(config.enabled);
    } catch (e: any) {
      console.error("Error loading analytics report config:", e);
    }
  };

  const handleSaveAnalyticsReportConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingReportConfig(true);
    setReportConfigMessage("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await saveAnalyticsReportConfigAction(token, {
        to: reportTo,
        cc: reportCc,
        frequency: reportFrequency,
        enabled: reportEnabled
      });
      setReportConfigMessage("Đã lưu cấu hình gửi email báo cáo thành công!");
    } catch (e: any) {
      setReportConfigMessage(`Lỗi lưu: ${e.message}`);
    } finally {
      setSavingReportConfig(false);
    }
  };

  const sendPeriodicReportEmail = async () => {
    setSendingReport(true);
    setReportMessage("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      const result = await triggerAnalyticsReportEmailAction(token);
      setReportMessage(result.message || "Đã gửi email báo cáo thống kê thành công!");
    } catch (e: any) {
      setReportMessage(`Lỗi gửi: ${e.message}`);
    } finally {
      setSendingReport(false);
    }
  };

  const exportAnalyticsToExcel = () => {
    if (!analyticsData) return;

    // 1. Summary sheet
    const summaryData = [
      { "Chỉ số": "Tổng lượt xem (Pageviews)", "Giá trị": analyticsData.summary.pageviews.value, "Tăng trưởng so chu kỳ trước": `${analyticsData.summary.pageviews.growth}%` },
      { "Chỉ số": "Khách truy cập độc bản (Unique Visitors)", "Giá trị": analyticsData.summary.visitors.value, "Tăng trưởng so chu kỳ trước": `${analyticsData.summary.visitors.growth}%` },
      { "Chỉ số": "Số phiên truy cập (Sessions)", "Giá trị": analyticsData.summary.sessions.value, "Tăng trưởng so chu kỳ trước": `${analyticsData.summary.sessions.growth}%` },
      { "Chỉ số": "Lượt xem trung bình / Phiên (Avg Pageviews/Session)", "Giá trị": analyticsData.summary.viewsPerSession.value, "Tăng trưởng so chu kỳ trước": `${analyticsData.summary.viewsPerSession.growth}%` }
    ];

    // 2. Daily views sheet
    const dailyViews = analyticsData.chartData.map((d: any) => ({
      "Ngày": d.date,
      "Lượt xem (Pageviews)": d.views,
      "Khách độc bản (Visitors)": d.visitors
    }));

    // 3. Top pages sheet
    const topPages = analyticsData.topPages.map((p: any) => ({
      "Đường dẫn": p.url,
      "Tiêu đề trang": p.title,
      "Tổng lượt xem": p.views,
      "Khách độc bản": p.visitors
    }));

    // 4. Referrers sheet
    const referrers = analyticsData.topReferrers.map((r: any) => ({
      "Nguồn giới thiệu": r.name,
      "Lượt xem": r.views
    }));

    // 5. Devices sheet
    const devices = analyticsData.devices.map((d: any) => ({
      "Thiết bị": d.name,
      "Số lượt xem": d.value
    }));

    // 6. Countries & Cities sheet
    const countries = analyticsData.countries.map((c: any) => ({
      "Quốc gia": c.name,
      "Số lượt xem": c.value
    }));

    const cities = analyticsData.cities.map((c: any) => ({
      "Thành phố": c.name,
      "Số lượt xem": c.value
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add sheets
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Tổng quan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyViews), "Truy cập theo ngày");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topPages), "Top trang");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(referrers), "Nguồn truy cập");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(devices), "Thiết bị");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(countries), "Quốc gia");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cities), "Thành phố");

    // Write file
    XLSX.writeFile(wb, `Bao_cao_truy_cap_VisaAutoTracking_${analyticsDays}_ngay.xlsx`);
  };

  // Trigger loading analytics when tab is clicked
  useEffect(() => {
    if (activeTab === "analytics" && isAdmin) {
      loadAnalyticsData(analyticsDays);
      loadAnalyticsReportConfig();
    }
  }, [activeTab, analyticsDays, isAdmin]);

  const loadSecurityData = async () => {
    setSecurityLoading(true);
    setSecurityError("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      const data = await getSecurityLogsAction(token);
      setSecurityLogs(data.logs);
      setIpBlacklist(data.blacklist);
      setSecurityStats(data.stats);
    } catch (e: any) {
      setSecurityError(e.message || "Không thể tải dữ liệu bảo mật.");
      console.error("Error loading security data:", e);
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleBlockIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockIp.trim()) return;
    setBlockSubmitting(true);
    setBlockError("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await blacklistIpAction(token, blockIp.trim(), blockReason.trim(), blockDuration);
      setBlockIp("");
      setBlockReason("");
      setBlockDuration(30);
      await loadSecurityData();
    } catch (e: any) {
      setBlockError(e.message || "Không thể chặn IP.");
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    if (!(await customConfirm(`Bạn có chắc chắn muốn gỡ chặn IP ${ip}?`, "Gỡ chặn IP"))) return;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await removeBlacklistIpAction(token, ip);
      await loadSecurityData();
    } catch (e: any) {
      await customAlert(e.message || "Không thể gỡ chặn IP.", "Lỗi");
    }
  };

  // Trigger loading security data when tab is clicked
  useEffect(() => {
    if (activeTab === "security" && isAdmin) {
      loadSecurityData();
    }
  }, [activeTab, isAdmin]);


  const loadSystemSettings = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      const settings = await getSystemSettingsAction(token);
      setSystemSettings(settings);
    } catch (e: any) {
      console.error("Error loading system settings:", e);
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await saveSystemSettingsAction(token, systemSettings);
      setSettingsMessage("Đã lưu cấu hình hệ thống thành công!");
    } catch (err: any) {
      setSettingsMessage(`Lỗi lưu cấu hình: ${err.message || err}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // Article CRUD Form State
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleSlug, setArticleSlug] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [articleDripDay, setArticleDripDay] = useState<number | "">("");
  const [articleSubmitting, setArticleSubmitting] = useState(false);
  const [articleMessage, setArticleMessage] = useState("");

  // SEO & WYSIWYG Editor State
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeyword, setSeoKeyword] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageUploadMode, setImageUploadMode] = useState<"url" | "file">("url");
  const [tableRowsInput, setTableRowsInput] = useState(3);
  const [tableColsInput, setTableColsInput] = useState(3);

  // New states for Layout Redesign and Preview
  const [activeArticleView, setActiveArticleView] = useState<"list" | "form">("list");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const editorRef = useRef<HTMLDivElement>(null);

  // Sync editor html to state when user types or changes content
  const handleEditorChange = () => {
    if (editorRef.current) {
      setArticleContent(editorRef.current.innerHTML);
    }
  };

  // Load content into contentEditable editor
  useEffect(() => {
    if (editorRef.current && !isHtmlMode) {
      // Fix cursor jumping: only sync if the editor is not currently focused
      if (document.activeElement !== editorRef.current && editorRef.current.innerHTML !== articleContent) {
        editorRef.current.innerHTML = articleContent;
      }
    }
  }, [articleContent, isHtmlMode]);


  // Manual Override Form State
  const [overrideMonth, setOverrideMonth] = useState("");
  const [overrideCategory, setOverrideCategory] = useState("F2B");
  const [overrideFinalAction, setOverrideFinalAction] = useState("");
  const [overrideFiling, setOverrideFiling] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState("");

  // Newsletter form state
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [newsletterSubject, setNewsletterSubject] = useState("");
  const [sendingNewsletter, setSendingNewsletter] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState("");

  // Email Configuration state
  const [emailConfig, setEmailConfig] = useState({
    provider: "smtp",
    smtpHost: "",
    smtpPort: "465",
    smtpSecure: true,
    smtpUser: "",
    smtpPass: "",
    resendApiKey: "",
    resendFrom: "onboarding@resend.dev"
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  const [testRecipient, setTestRecipient] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  const loadEmailConfig = async () => {
    setLoadingConfig(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      const conf = await getEmailConfigAction(token);
      setEmailConfig(conf);
    } catch (e: any) {
      console.error("Error loading email config:", e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigMessage("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await saveEmailConfigAction(token, emailConfig);
      setConfigMessage("Đã cập nhật cấu hình email hệ thống thành công!");
      const conf = await getEmailConfigAction(token);
      setEmailConfig(conf);
    } catch (err: any) {
      setConfigMessage(`Lỗi lưu cấu hình: ${err.message || err}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setTestMessage("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      const res = await sendTestEmailAction(token, testRecipient);
      setTestMessage(`Đã gửi mail test thành công qua ${res.provider}! MsgID: ${res.messageId}`);
    } catch (err: any) {
      setTestMessage(`Lỗi gửi mail test: ${err.message || err}`);
    } finally {
      setSendingTest(false);
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesData && !profilesError) {
        setMembers(profilesData);
      }

      // 2. Fetch all cases
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });

      if (casesData && !casesError) {
        setAllCases(casesData);
      }

      // 3. Fetch drip queues with joins
      const { data: queuesData, error: queuesError } = await supabase
        .from("drip_queues")
        .select(`
          id,
          user_id,
          article_id,
          scheduled_for,
          sent_at,
          status,
          created_at,
          profiles:user_id ( email ),
          articles:article_id ( title )
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (queuesData && !queuesError) {
        const mapped = (queuesData as any[]).map(q => ({
          ...q,
          profiles: Array.isArray(q.profiles) ? q.profiles[0] : q.profiles,
          articles: Array.isArray(q.articles) ? q.articles[0] : q.articles,
        }));
        setDripQueues(mapped);
      }

      // 4. Fetch articles
      const { data: articlesData, error: articlesError } = await supabase
        .from("articles")
        .select("*")
        .order("drip_day", { ascending: true, nullsFirst: false });

      if (articlesData && !articlesError) {
        setArticles(articlesData);
      }
    } catch (e) {
      console.error("Error loading admin lists:", e);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminRole = async (user: User | null) => {
    setCurrentUser(user);
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (data && !error && data.role === "admin") {
        setIsAdmin(true);
        loadAdminData();
        loadEmailConfig();
        loadSystemSettings();
        loadScraperLogs();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdminRole(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAdminRole(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle allow_multiple_cases for member
  const handleToggleMultiCase = async (memberId: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ allow_multiple_cases: !currentVal })
        .eq("id", memberId);

      if (error) throw error;
      setMembers(members.map(m => m.id === memberId ? { ...m, allow_multiple_cases: !currentVal } : m));
    } catch (err: any) {
      await customAlert(err.message || "Không thể thay đổi phân quyền hồ sơ.", "Lỗi");
    }
  };

  // Toggle user role between admin and user
  const handleToggleUserRole = async (memberId: string, currentRole: string) => {
    const confirmMsg = currentRole === "admin" 
      ? "Bạn có chắc chắn muốn hạ quyền tài khoản này xuống Thành viên (User)?"
      : "Bạn có chắc chắn muốn nâng quyền tài khoản này lên Quản trị viên (Admin)?";
    
    if (!(await customConfirm(confirmMsg, "Thay đổi vai trò"))) return;

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await toggleUserRoleAction(token, memberId, currentRole);
      setMembers(members.map(m => m.id === memberId ? { ...m, role: currentRole === "admin" ? "user" : "admin" } : m));
    } catch (err: any) {
      await customAlert(err.message || "Không thể thay đổi vai trò thành viên.", "Lỗi");
    }
  };

  // Toggle User Status Active/Inactive (Lock/Unlock)
  const handleToggleUserStatus = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === "inactive" ? "active" : "inactive";
    const confirmMsg = newStatus === "inactive"
      ? "Bạn có chắc chắn muốn khóa (vô hiệu hóa) tài khoản của thành viên này? Họ sẽ không thể truy cập dashboard."
      : "Bạn có chắc chắn muốn mở khóa tài khoản của thành viên này?";
    
    if (!(await customConfirm(confirmMsg, "Khóa/Mở tài khoản", true))) return;

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await toggleUserStatusAction(token, memberId, newStatus);
      setMembers(members.map(m => m.id === memberId ? { ...m, status: newStatus } : m));
    } catch (err: any) {
      await customAlert(err.message || "Không thể thay đổi trạng thái hoạt động của thành viên.", "Lỗi");
    }
  };

  // Delete User Completely (Auth + Database Profiles)
  const handleDeleteUser = async (memberId: string, email: string) => {
    const confirmMsg = `CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn XÓA HOÀN TOÀN thành viên "${email}" khỏi hệ thống?

Thao tác này sẽ xóa vĩnh viễn:
1. Tài khoản đăng nhập (Auth).
2. Thông tin hồ sơ theo dõi di trú của họ.
3. Nhật ký và hàng chờ drip email.

Hành động này KHÔNG THỂ KHÔI PHỤC. Bạn có chắc chắn muốn tiếp tục?`;

    if (!(await customConfirm(confirmMsg, "Xóa tài khoản vĩnh viễn", true))) return;
    if (!(await customConfirm("Xác nhận lần thứ hai: Bạn thực sự muốn xóa tài khoản này?", "Xóa tài khoản vĩnh viễn", true))) return;

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await deleteUserAction(token, memberId);
      setMembers(members.filter(m => m.id !== memberId));
      await customAlert("Đã xóa thành viên khỏi hệ thống thành công!", "Thành công");
    } catch (err: any) {
      await customAlert(err.message || "Không thể xóa thành viên.", "Lỗi");
    }
  };

  // Sync Visa Bulletin manual trigger (with ?force=true)
  const handleSyncBulletin = async () => {
    setSyncingBulletin(true);
    setSyncResult("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      
      const response = await fetch("/api/cron/bulletin?force=true", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gặp lỗi trong quá trình quét");
      
      setSyncResult(`Đồng bộ thành công! ${data.message || ""}`);
      loadAdminData();
      loadScraperLogs();
    } catch (err: any) {
      setSyncResult(`Lỗi đồng bộ: ${err.message || err}`);
    } finally {
      setSyncingBulletin(false);
    }
  };

  // Manual Override Form Submit
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideMonth || !overrideCategory || !overrideFinalAction || !overrideFiling) {
      await customAlert("Vui lòng nhập đầy đủ thông tin để ghi đè.", "Thông báo");
      return;
    }
    setOverrideSubmitting(true);
    setOverrideMessage("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await saveBulletinOverrideAction(
        token,
        overrideMonth,
        overrideCategory,
        "All Areas",
        overrideFinalAction,
        overrideFiling
      );
      setOverrideMessage(`Đã ghi đè lịch Visa Bulletin tháng ${overrideMonth} cho diện ${overrideCategory} thành công!`);
      setOverrideMonth("");
      setOverrideFinalAction("");
      setOverrideFiling("");
      loadAdminData();
      loadScraperLogs();
    } catch (err: any) {
      setOverrideMessage(`Lỗi ghi đè: ${err.message || err}`);
    } finally {
      setOverrideSubmitting(false);
    }
  };

  // Export Members to Excel file
  const handleExportExcel = () => {
    try {
      const dataToExport = members.map((m) => ({
        "Email": m.email,
        "Vai trò": m.role === "admin" ? "Quản trị viên" : "Thành viên",
        "Trạng thái": m.status === "inactive" ? "Đã khóa" : "Hoạt động",
        "Cho phép nhiều hồ sơ": m.allow_multiple_cases ? "Bật" : "Tắt",
        "Nhận Drip Email": m.enable_drip_emails ? "Bật" : "Tắt",
        "Ngày đăng ký": new Date(m.created_at).toLocaleDateString("vi-VN")
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Thành viên");

      // Set column widths for better visual formatting
      ws["!cols"] = [
        { wch: 30 }, // Email
        { wch: 15 }, // Vai trò
        { wch: 15 }, // Trạng thái
        { wch: 20 }, // Cho phép nhiều hồ sơ
        { wch: 20 }, // Nhận Drip Email
        { wch: 15 }  // Ngày đăng ký
      ];

      XLSX.writeFile(wb, "Danh_sach_thanh_vien.xlsx");
    } catch (err: any) {
      alert("Lỗi xuất file Excel: " + (err.message || err));
    }
  };

  // Helper function to convert text to URL slug
  const convertToSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "") // remove special chars
      .trim()
      .replace(/\s+/g, "-") // replace spaces with hyphens
      .replace(/-+/g, "-"); // clean double hyphens
  };

  const handleTitleChange = (val: string) => {
    setArticleTitle(val);
    if (!isEditingArticle) {
      setArticleSlug(convertToSlug(val));
    }
  };

  // Helper function to convert legacy Markdown to HTML for WYSIWYG editor
  const convertMarkdownToHtml = (markdown: string) => {
    if (!markdown) return "";
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(markdown);
    if (isHtml) return markdown;

    let html = markdown;
    
    // Escape HTML special tags to avoid syntax issues during translation
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headings
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Bullet lists
    html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
    
    // Blockquotes
    html = html.replace(/^&gt;\s+(.*)$/gm, '<blockquote>$1</blockquote>');
    
    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    
    // Images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');
    
    // Wrap paragraphs
    const paragraphs = html.split(/\n\n+/);
    return paragraphs.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith('<h1>') || 
        trimmed.startsWith('<h2>') || 
        trimmed.startsWith('<h3>') || 
        trimmed.startsWith('<li>') || 
        trimmed.startsWith('<blockquote>') || 
        trimmed.startsWith('<img') || 
        trimmed.startsWith('<table')
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");
  };

  interface SEOResult {
    score: number;
    checks: {
      id: string;
      label: string;
      status: "pass" | "warn" | "fail";
      feedback: string;
    }[];
  }

  // SEO Analyzer
  const analyzeSEO = (
    title: string,
    slug: string,
    content: string,
    keyword: string,
    description: string
  ): SEOResult => {
    const checks: SEOResult['checks'] = [];
    let score = 0;
    
    const cleanKeyword = (keyword || "").trim().toLowerCase();
    const cleanTitle = (title || "").trim().toLowerCase();
    const cleanSlug = (slug || "").trim().toLowerCase();
    const cleanDesc = (description || "").trim().toLowerCase();
    
    // Create text content representation from HTML content
    let textContent = "";
    if (typeof window !== "undefined") {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content || "";
      textContent = tempDiv.textContent || tempDiv.innerText || "";
    } else {
      textContent = (content || "").replace(/<[^>]*>/g, " ");
    }
    const cleanContentText = textContent.trim().toLowerCase();
    const wordCount = cleanContentText.split(/\s+/).filter(Boolean).length;
    
    if (!cleanKeyword) {
      return {
        score: 0,
        checks: [{
          id: "keyword-missing",
          label: "Từ khóa chính (Focus Keyword)",
          status: "fail",
          feedback: "Vui lòng nhập từ khóa chính để bắt đầu phân tích SEO."
        }]
      };
    }

    // 1. Keyword in Title (15 points)
    const kwInTitle = cleanTitle.includes(cleanKeyword);
    if (kwInTitle) {
      score += 15;
      checks.push({
        id: "kw-title",
        label: "Từ khóa trong tiêu đề bài viết",
        status: "pass",
        feedback: "Từ khóa chính đã xuất hiện trong tiêu đề."
      });
    } else {
      checks.push({
        id: "kw-title",
        label: "Từ khóa trong tiêu đề bài viết",
        status: "fail",
        feedback: "Cần bổ sung từ khóa chính vào tiêu đề bài viết để tăng thứ hạng."
      });
    }

    // 2. Keyword in Meta Description (15 points)
    const kwInDesc = cleanDesc.includes(cleanKeyword);
    if (kwInDesc) {
      score += 15;
      checks.push({
        id: "kw-desc",
        label: "Từ khóa trong Mô tả Meta",
        status: "pass",
        feedback: "Từ khóa chính đã xuất hiện trong mô tả Meta."
      });
    } else {
      checks.push({
        id: "kw-desc",
        label: "Từ khóa trong Mô tả Meta",
        status: "fail",
        feedback: "Mô tả Meta chưa chứa từ khóa chính."
      });
    }

    // 3. Keyword in Slug (10 points)
    const normalizedKeywordForSlug = cleanKeyword
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const kwInSlug = cleanSlug.includes(normalizedKeywordForSlug);
    if (kwInSlug) {
      score += 10;
      checks.push({
        id: "kw-slug",
        label: "Từ khóa trong đường dẫn (Slug)",
        status: "pass",
        feedback: "Đường dẫn (Slug) chứa từ khóa chính."
      });
    } else {
      checks.push({
        id: "kw-slug",
        label: "Từ khóa trong đường dẫn (Slug)",
        status: "warn",
        feedback: "Nên điều chỉnh Slug để chứa từ khóa chính."
      });
    }

    // 4. Title Length (10 points)
    const titleLen = (title || "").length;
    if (titleLen >= 40 && titleLen <= 60) {
      score += 10;
      checks.push({
        id: "title-len",
        label: "Độ dài tiêu đề bài viết",
        status: "pass",
        feedback: `Độ dài tiêu đề tốt (${titleLen} ký tự). Khuyến nghị: 40-60 ký tự.`
      });
    } else if (titleLen > 0) {
      checks.push({
        id: "title-len",
        label: "Độ dài tiêu đề bài viết",
        status: "warn",
        feedback: `Độ dài tiêu đề là ${titleLen} ký tự. Khuyến nghị: 40-60 ký tự.`
      });
    } else {
      checks.push({
        id: "title-len",
        label: "Độ dài tiêu đề bài viết",
        status: "fail",
        feedback: "Vui lòng nhập tiêu đề bài viết."
      });
    }

    // 5. Meta Description Length (15 points)
    const descLen = (description || "").length;
    if (descLen >= 120 && descLen <= 160) {
      score += 15;
      checks.push({
        id: "desc-len",
        label: "Độ dài Mô tả Meta",
        status: "pass",
        feedback: `Độ dài mô tả tốt (${descLen} ký tự). Khuyến nghị: 120-160 ký tự.`
      });
    } else if (descLen > 0) {
      checks.push({
        id: "desc-len",
        label: "Độ dài Mô tả Meta",
        status: "warn",
        feedback: `Độ dài mô tả là ${descLen} ký tự. Khuyến nghị: 120-160 ký tự.`
      });
    } else {
      checks.push({
        id: "desc-len",
        label: "Độ dài Mô tả Meta",
        status: "fail",
        feedback: "Vui lòng viết Mô tả Meta bài viết."
      });
    }

    // 6. Word Count (15 points)
    if (wordCount >= 300) {
      score += 15;
      checks.push({
        id: "word-count",
        label: "Độ dài nội dung bài viết",
        status: "pass",
        feedback: `Bài viết có ${wordCount} từ (đạt chuẩn tối thiểu 300 từ).`
      });
    } else {
      checks.push({
        id: "word-count",
        label: "Độ dài nội dung bài viết",
        status: "warn",
        feedback: `Nội dung có ${wordCount} từ. Đạt tối thiểu 300 từ để tối ưu SEO.`
      });
    }

    // 7. Keyword Density (10 points)
    if (wordCount > 0) {
      const escapedKeyword = cleanKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedKeyword, 'g');
      const matches = cleanContentText.match(regex);
      const count = matches ? matches.length : 0;
      const density = (count / wordCount) * 100;
      
      if (density >= 0.5 && density <= 2.5) {
        score += 10;
        checks.push({
          id: "kw-density",
          label: "Mật độ từ khóa trong nội dung",
          status: "pass",
          feedback: `Mật độ từ khóa tốt: ${density.toFixed(2)}% (${count} lần xuất hiện). Khuyến nghị: 0.5% - 2.5%.`
        });
      } else if (density > 2.5) {
        checks.push({
          id: "kw-density",
          label: "Mật độ từ khóa trong nội dung",
          status: "warn",
          feedback: `Mật độ quá cao: ${density.toFixed(2)}% (${count} lần). Hãy giảm bớt từ khóa.`
        });
      } else if (count > 0) {
        checks.push({
          id: "kw-density",
          label: "Mật độ từ khóa trong nội dung",
          status: "warn",
          feedback: `Mật độ hơi thấp: ${density.toFixed(2)}% (${count} lần). Cố gắng dùng thêm một cách tự nhiên.`
        });
      } else {
        checks.push({
          id: "kw-density",
          label: "Mật độ từ khóa trong nội dung",
          status: "fail",
          feedback: "Từ khóa chính không có trong nội dung bài viết."
        });
      }
    } else {
      checks.push({
        id: "kw-density",
        label: "Mật độ từ khóa trong nội dung",
        status: "fail",
        feedback: "Nội dung bài viết đang trống."
      });
    }

    // 8. Headings check (10 points)
    const hasH2 = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.test(content);
    const hasH3 = /<h3\b[^>]*>([\s\S]*?)<\/h3>/i.test(content);
    if (hasH2 || hasH3) {
      score += 10;
      checks.push({
        id: "headings",
        label: "Thẻ tiêu đề phụ (H2/H3)",
        status: "pass",
        feedback: "Đã sử dụng thẻ tiêu đề phụ (H2/H3) phân chia bố cục."
      });
    } else {
      checks.push({
        id: "headings",
        label: "Thẻ tiêu đề phụ (H2/H3)",
        status: "warn",
        feedback: "Nên sử dụng thêm tiêu đề H2 hoặc H3 để cải thiện trải nghiệm người dùng."
      });
    }

    return {
      score,
      checks
    };
  };

  const executeCommand = (command: string, value: string = '') => {
    if (typeof document !== 'undefined') {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleEditorChange();
    }
  };

  const insertTable = (rows: number, cols: number) => {
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; border: 1.5px solid var(--obsidian); margin: 12px 0;">';
    tableHtml += '<thead><tr style="border-bottom: 1.5px solid var(--obsidian); bg-pale-slate;">';
    for (let j = 0; j < cols; j++) {
      tableHtml += `<th style="border: 1px solid var(--obsidian); padding: 8px; font-weight: bold; background-color: #f1f5f9;">Tiêu đề ${j+1}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    for (let i = 0; i < rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHtml += '<td style="border: 1px solid var(--obsidian); padding: 8px;">Dữ liệu</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p></p>';
    
    if (typeof document !== 'undefined') {
      editorRef.current?.focus();
      document.execCommand('insertHTML', false, tableHtml);
      handleEditorChange();
    }
  };

  // Submit Article Create/Update Form
  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleTitle || !articleSlug || !articleContent) {
      await customAlert("Vui lòng nhập đầy đủ Tiêu đề, Slug và Nội dung.", "Thông báo");
      return;
    }
    setArticleSubmitting(true);
    setArticleMessage("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      const dripVal = articleDripDay === "" ? null : Number(articleDripDay);

      if (isEditingArticle && editingArticleId) {
        await updateArticleAction(token, editingArticleId, {
          title: articleTitle,
          slug: articleSlug,
          content: articleContent,
          drip_day: dripVal,
          seo_description: seoDescription || null,
          seo_keyword: seoKeyword || null
        });
        setArticleMessage("Đã cập nhật bài viết thành công!");
      } else {
        await createArticleAction(token, {
          title: articleTitle,
          slug: articleSlug,
          content: articleContent,
          drip_day: dripVal,
          seo_description: seoDescription || null,
          seo_keyword: seoKeyword || null
        });
        setArticleMessage("Đã thêm bài viết mới thành công!");
      }

      // Reset form
      setArticleTitle("");
      setArticleSlug("");
      setArticleContent("");
      setArticleDripDay("");
      setSeoDescription("");
      setSeoKeyword("");
      setIsHtmlMode(false);
      setIsEditingArticle(false);
      setEditingArticleId(null);
      setActiveArticleView("list");

      // Reload data
      loadAdminData();
    } catch (err: any) {
      setArticleMessage(`Lỗi lưu bài viết: ${err.message || err}`);
    } finally {
      setArticleSubmitting(false);
    }
  };

  // Delete Article Action
  const handleDeleteArticle = async (id: string, title: string) => {
    if (!(await customConfirm(`Bạn có chắc chắn muốn XÓA bài viết "${title}"? Thao tác này không thể hoàn tác.`, "Xóa bài viết", true))) {
      return;
    }
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      await deleteArticleAction(token, id);
      await customAlert("Đã xóa bài viết thành công!", "Thành công");
      loadAdminData();
    } catch (err: any) {
      await customAlert("Lỗi xóa bài viết: " + (err.message || err), "Lỗi");
    }
  };

  // Send Bulk Newsletter Manual Dispatch
  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticleId) {
      await customAlert("Vui lòng chọn bài viết bản tin.", "Thông báo");
      return;
    }
    setSendingNewsletter(true);
    setNewsletterMessage("");

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || "";
      
      const data = await sendNewsletterAction(token, selectedArticleId, newsletterSubject);
      setNewsletterMessage(`Bản tin đã gửi thành công tới ${data.recipientCount || 0} thành viên.`);
      setSelectedArticleId("");
      setNewsletterSubject("");
    } catch (err: any) {
      setNewsletterMessage(`Lỗi gửi bản tin: ${err.message || err}`);
    } finally {
      setSendingNewsletter(false);
    }
  };

  // Filter and paginated members logic
  const filteredMembers = members.filter(m => {
    const matchesSearch = m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    
    let matchesCategory = true;
    if (categoryFilter !== "all") {
      const memberCases = allCases.filter(c => c.user_id === m.id);
      matchesCategory = memberCases.some(c => c.category === categoryFilter);
    }
    
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Compute category statistics for dashboard
  const catStats = {
    F1: allCases.filter(c => c.category === "F1").length,
    F2A: allCases.filter(c => c.category === "F2A").length,
    F2B: allCases.filter(c => c.category === "F2B").length,
    F3: allCases.filter(c => c.category === "F3").length,
    F4: allCases.filter(c => c.category === "F4").length,
  };

  // Render Loading spinner
  if (loading && members.length === 0) {
    return (
      <div className="min-h-screen bg-pale-slate flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-12 h-12 text-electric-blue animate-spin mb-4" />
        <p className="text-obsidian font-bold">Xác thực quyền quản trị viên...</p>
      </div>
    );
  }

  // Access Denied screen
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-pale-slate flex flex-col relative overflow-hidden font-sans">
        <div className="asterisk-bg select-none animate-spin" style={{ animationDuration: '60s' }}>*</div>
        <header className="bg-white border-b border-obsidian w-full h-20 flex items-center px-4">
          <Link href="/" className="flex items-center max-w-[1200px] mx-auto w-full">
            <img 
              src="/logo.png" 
              alt="Visa Auto Tracking Logo" 
              className="h-12 w-auto object-contain"
            />
          </Link>
        </header>
        <main className="flex-grow flex items-center justify-center p-6 relative z-10">
          <div className="bg-white rounded-bento border border-obsidian p-8 max-w-md w-full text-center flex flex-col items-center gap-4 shadow-obsidian">
            <ShieldAlert className="w-16 h-16 text-red-500" />
            <h2 className="text-2xl font-black text-obsidian uppercase tracking-tight">Từ chối truy cập</h2>
            <p className="text-sm text-obsidian/60">
              Tài khoản của bạn không được phân quyền Quản trị viên (Admin). Vui lòng liên hệ quản trị viên hệ thống để bật chế độ Admin hoặc quay lại Bảng điều khiển thành viên.
            </p>
            <Link 
              href="/dashboard" 
              className="w-full neo-pill neo-pill-primary py-3.5 mt-2 font-bold cursor-pointer text-center"
            >
              Quay lại Bảng điều khiển
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pale-slate flex flex-col md:flex-row relative overflow-hidden font-sans">
      <div className="asterisk-bg select-none animate-spin" style={{ animationDuration: '60s' }}>*</div>

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-obsidian flex flex-col z-20 shrink-0 relative">
        <div className="p-6 border-b border-obsidian flex flex-col gap-1 bg-white">
          <img 
            src="/logo.png" 
            alt="Visa Auto Tracking Logo" 
            className="h-10 w-auto object-contain self-start"
          />
          <div className="text-[9px] uppercase font-bold tracking-wider text-obsidian/40 mt-1">Bảng quản trị</div>
        </div>
        
        {/* Nav Links */}
        <nav className="p-4 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible">
          <button
            onClick={() => { setActiveTab("dashboard"); setSyncResult(""); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap md:w-full border ${
              activeTab === "dashboard"
                ? "bg-electric-blue text-white shadow-obsidian-sm border-obsidian translate-y-[-1px]"
                : "text-obsidian/75 border-transparent hover:bg-pale-slate hover:text-obsidian"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Tổng quan thống kê
          </button>

          <button
            onClick={() => { setActiveTab("members"); setSyncResult(""); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap md:w-full border ${
              activeTab === "members"
                ? "bg-electric-blue text-white shadow-obsidian-sm border-obsidian translate-y-[-1px]"
                : "text-obsidian/75 border-transparent hover:bg-pale-slate hover:text-obsidian"
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Quản lý thành viên
          </button>

          <button
            onClick={() => { setActiveTab("bulletin"); setSyncResult(""); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap md:w-full border ${
              activeTab === "bulletin"
                ? "bg-electric-blue text-white shadow-obsidian-sm border-obsidian translate-y-[-1px]"
                : "text-obsidian/75 border-transparent hover:bg-pale-slate hover:text-obsidian"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Lịch Visa Bulletin
          </button>

          <button
            onClick={() => { setActiveTab("email"); setSyncResult(""); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap md:w-full border ${
              activeTab === "email"
                ? "bg-electric-blue text-white shadow-obsidian-sm border-obsidian translate-y-[-1px]"
                : "text-obsidian/75 border-transparent hover:bg-pale-slate hover:text-obsidian"
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" />
            Cấu hình & Bản tin
          </button>

          <button
            onClick={() => { setActiveTab("articles"); setSyncResult(""); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap md:w-full border ${
              activeTab === "articles"
                ? "bg-electric-blue text-white shadow-obsidian-sm border-obsidian translate-y-[-1px]"
                : "text-obsidian/75 border-transparent hover:bg-pale-slate hover:text-obsidian"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Bài viết hướng dẫn
          </button>

          <button
            onClick={() => { setActiveTab("analytics"); setSyncResult(""); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap md:w-full border ${
              activeTab === "analytics"
                ? "bg-electric-blue text-white shadow-obsidian-sm border-obsidian translate-y-[-1px]"
                : "text-obsidian/75 border-transparent hover:bg-pale-slate hover:text-obsidian"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            Thống kê truy cập
          </button>

          <button
            onClick={() => { setActiveTab("security"); setSyncResult(""); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap md:w-full border ${
              activeTab === "security"
                ? "bg-electric-blue text-white shadow-obsidian-sm border-obsidian translate-y-[-1px]"
                : "text-obsidian/75 border-transparent hover:bg-pale-slate hover:text-obsidian"
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Nhật ký & Bảo mật
          </button>

          <button
            onClick={() => { setActiveTab("settings"); setSyncResult(""); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-card text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap md:w-full border ${
              activeTab === "settings"
                ? "bg-electric-blue text-white shadow-obsidian-sm border-obsidian translate-y-[-1px]"
                : "text-obsidian/75 border-transparent hover:bg-pale-slate hover:text-obsidian"
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            Cấu hình hệ thống
          </button>
        </nav>
        
        {/* Sidebar Footer details */}
        <div className="mt-auto p-4 border-t border-obsidian hidden md:flex flex-col gap-3 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-electric-blue text-white flex items-center justify-center font-bold text-sm border border-obsidian">
              A
            </div>
            <div className="min-w-0 flex-grow">
              <div className="text-xs font-bold truncate text-obsidian">{currentUser?.email}</div>
              <span className="text-[9px] font-bold text-electric-blue uppercase">Admin Active</span>
            </div>
          </div>
          <Link href="/dashboard" className="text-center text-xs font-bold text-obsidian/60 hover:text-electric-blue transition-colors hover:underline">
            Vào Dashboard thành viên →
          </Link>
        </div>
      </aside>

      {/* RIGHT CONTENT PANE */}
      <div className="flex-grow flex flex-col min-w-0">
        <Header />

        <main className="flex-grow p-6 md:p-8 overflow-y-auto max-w-[1200px] w-full mx-auto relative z-10 flex flex-col gap-6">
          
          {/* Header Title with Sync Alert */}
          {syncResult && (
            <div className="bg-white border border-obsidian rounded-card p-4 text-sm font-bold text-electric-blue shadow-obsidian animate-bounce">
              💡 {syncResult}
            </div>
          )}

          {/* TAB CONTENT: 1. DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="border-b border-obsidian pb-3">
                <h1 className="text-2xl font-black text-obsidian tracking-tight">Tổng quan hệ thống</h1>
                <p className="text-xs text-obsidian/60 mt-1">Số liệu thời gian thực được trích xuất từ database.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white rounded-bento border border-obsidian p-6 shadow-obsidian flex flex-col">
                  <span className="text-xs font-bold text-obsidian/50 uppercase tracking-wider">Tổng thành viên</span>
                  <span className="text-3xl md:text-4xl font-extrabold text-obsidian mt-2">{members.length}</span>
                  <span className="text-[10px] text-green-600 font-bold mt-1">✓ Đã đăng ký</span>
                </div>
                <div className="bg-white rounded-bento border border-obsidian p-6 shadow-obsidian flex flex-col">
                  <span className="text-xs font-bold text-obsidian/50 uppercase tracking-wider">Hồ sơ theo dõi</span>
                  <span className="text-3xl md:text-4xl font-extrabold text-obsidian mt-2">{allCases.length}</span>
                  <span className="text-[10px] text-electric-blue font-bold mt-1">✓ Đang được quét</span>
                </div>
                <div className="bg-white rounded-bento border border-obsidian p-6 shadow-obsidian flex flex-col">
                  <span className="text-xs font-bold text-obsidian/50 uppercase tracking-wider">Drip Mail Đã Gửi</span>
                  <span className="text-3xl md:text-4xl font-extrabold text-obsidian mt-2">{dripQueues.filter(q => q.status === "sent").length}</span>
                  <span className="text-[10px] text-electric-blue font-bold mt-1">✓ Email thông báo</span>
                </div>
                <div className="bg-white rounded-bento border border-obsidian p-6 shadow-obsidian flex flex-col">
                  <span className="text-xs font-bold text-obsidian/50 uppercase tracking-wider">Tài khoản khóa</span>
                  <span className="text-3xl md:text-4xl font-extrabold text-obsidian mt-2">{members.filter(m => m.status === "inactive").length}</span>
                  <span className="text-[10px] text-red-500 font-bold mt-1">✗ Soft deactivated</span>
                </div>
              </div>

              {/* Grid 2 Details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Category stats */}
                <div className="lg:col-span-8 bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-6 shadow-obsidian">
                  <h3 className="text-lg font-bold text-obsidian flex items-center gap-2">
                    <Database className="w-5 h-5 text-electric-blue" />
                    Thống kê diện bảo lãnh đang được theo dõi
                  </h3>
                  <div className="flex flex-col gap-4">
                    {Object.entries(catStats).map(([cat, count]) => {
                      const percentage = allCases.length > 0 ? (count / allCases.length) * 100 : 0;
                      return (
                        <div key={cat} className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-obsidian">{cat}</span>
                            <span className="text-obsidian/60">{count} hồ sơ ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-pale-slate rounded-full h-3 border border-obsidian/15 overflow-hidden">
                            <div 
                              className="bg-electric-blue h-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Right: Quick facts */}
                <div className="lg:col-span-4 bg-white rounded-bento border border-obsidian p-6 flex flex-col gap-4 shadow-obsidian">
                  <h3 className="text-lg font-bold text-obsidian flex items-center gap-2 border-b border-pale-slate pb-2">
                    <Info className="w-5 h-5 text-electric-blue" />
                    Hệ thống Crawler
                  </h3>
                  <div className="flex flex-col gap-3 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-obsidian/60">Tần suất cào:</span>
                      <span className="font-bold text-right">Thích ứng (6h / 24h)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-obsidian/60">Peak Polling:</span>
                      <span className="font-bold">Ngày 10 - 20 hàng tháng</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-obsidian/60">Đích cào:</span>
                      <span className="font-bold text-success-mint text-right">travel.state.gov</span>
                    </div>
                    <div className="flex justify-between border-t border-pale-slate pt-3">
                      <span className="text-obsidian/60">Email Cảnh báo:</span>
                      <span className="font-bold text-red-500">SMTP / Resend</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 2. MEMBERS */}
          {activeTab === "members" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="border-b border-obsidian pb-3">
                <h1 className="text-2xl font-black text-obsidian tracking-tight">Quản trị thành viên</h1>
                <p className="text-xs text-obsidian/60 mt-1">Tìm kiếm, cập nhật phân quyền, hoặc tạm dừng tài khoản người dùng.</p>
              </div>

              {/* Filters header */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 border border-obsidian rounded-card shadow-sm">
                <div className="relative flex-grow max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-obsidian/40 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm thành viên bằng email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-pale-slate rounded-card border border-obsidian pl-10 pr-4 py-2.5 text-xs md:text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-electric-blue"
                  />
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-2.5 text-xs font-bold text-obsidian focus:outline-none focus:ring-2 focus:ring-electric-blue cursor-pointer"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Đã khóa / Tạm dừng</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-pale-slate rounded-card border border-obsidian px-4 py-2.5 text-xs font-bold text-obsidian focus:outline-none focus:ring-2 focus:ring-electric-blue cursor-pointer"
                  >
                    <option value="all">Tất cả diện bảo lãnh</option>
                    <option value="F1">Diện F1</option>
                    <option value="F2A">Diện F2A</option>
                    <option value="F2B">Diện F2B</option>
                    <option value="F3">Diện F3</option>
                    <option value="F4">Diện F4</option>
                  </select>

                  <button
                    onClick={handleExportExcel}
                    className="neo-pill neo-pill-secondary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer font-bold"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Xuất Excel
                  </button>
                </div>
              </div>

              {/* Table section */}
              <div className="bg-white rounded-bento border border-obsidian shadow-obsidian overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-obsidian bg-pale-slate/30">
                        <th className="py-4 px-4 text-xs font-bold text-obsidian/60 uppercase">Thành viên</th>
                        <th className="py-4 px-2 text-xs font-bold text-obsidian/60 uppercase text-center">Trạng thái</th>
                        <th className="py-4 px-2 text-xs font-bold text-obsidian/60 uppercase text-center">Vai trò</th>
                        <th className="py-4 px-2 text-xs font-bold text-obsidian/60 uppercase text-center">Quyền hồ sơ</th>
                        <th className="py-4 px-4 text-xs font-bold text-obsidian/60 uppercase text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMembers.length > 0 ? (
                        paginatedMembers.map((m) => {
                          const userCases = allCases.filter(c => c.user_id === m.id);
                          const isExpanded = expandedMemberId === m.id;
                          return (
                            <>
                              <tr key={m.id} className="border-b border-pale-slate hover:bg-pale-slate/20 transition-all">
                                <td className="py-4 px-4 font-bold text-sm text-obsidian max-w-[250px] truncate" title={m.email}>
                                  <div className="flex flex-col">
                                    <span>{m.email}</span>
                                    <span className="text-[10px] text-obsidian/40 font-mono">Đăng ký: {new Date(m.created_at).toLocaleDateString("vi-VN")}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    m.status !== "inactive" 
                                      ? "bg-green-50 border-green-500 text-green-700" 
                                      : "bg-red-50 border-red-500 text-red-700"
                                  }`}>
                                    {m.status !== "inactive" ? "Hoạt động" : "Đã khóa"}
                                  </span>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <button
                                    onClick={() => handleToggleUserRole(m.id, m.role)}
                                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                                      m.role === "admin" 
                                        ? "bg-warning-amber/10 border-warning-amber text-warning-amber" 
                                        : "bg-gray-100 border-gray-300 text-gray-600"
                                    }`}
                                  >
                                    {m.role === "admin" ? "Quản trị" : "Thành viên"}
                                  </button>
                                </td>
                                <td className="py-4 px-2 text-center">
                                  <button
                                    onClick={() => handleToggleMultiCase(m.id, m.allow_multiple_cases)}
                                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                      m.allow_multiple_cases 
                                        ? "bg-electric-blue/10 border-electric-blue text-electric-blue" 
                                        : "bg-gray-50 border-gray-300 text-gray-500"
                                    }`}
                                  >
                                    {m.allow_multiple_cases ? "Nhiều hồ sơ" : "Một hồ sơ"}
                                  </button>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex items-center justify-center gap-3">
                                    <button 
                                      onClick={() => setExpandedMemberId(isExpanded ? null : m.id)}
                                      className="text-xs font-bold text-electric-blue hover:underline cursor-pointer flex items-center gap-0.5"
                                    >
                                      Xem hồ sơ ({userCases.length})
                                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                    {m.role !== "admin" && (
                                      <>
                                        <button 
                                          onClick={() => handleToggleUserStatus(m.id, m.status)}
                                          className={`text-xs font-bold cursor-pointer ${
                                            m.status !== "inactive" ? "text-red-500 hover:underline" : "text-green-600 hover:underline"
                                          }`}
                                        >
                                          {m.status !== "inactive" ? "Khóa acc" : "Kích hoạt"}
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteUser(m.id, m.email)}
                                          className="text-xs font-bold text-red-700 hover:underline cursor-pointer ml-1"
                                        >
                                          Xóa acc
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {/* Accordion expand block */}
                              {isExpanded && (
                                <tr key={`expanded-${m.id}`}>
                                  <td colSpan={5} className="p-4 bg-pale-slate/30 border-b border-obsidian">
                                    <div className="bg-white rounded-card border border-obsidian p-4 shadow-sm">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-obsidian/60 mb-3 flex items-center gap-1.5">
                                        <Database className="w-3.5 h-3.5 text-electric-blue" />
                                        Danh sách hồ sơ đang quét ({userCases.length})
                                      </h4>
                                      {userCases.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {userCases.map((c) => (
                                            <div key={c.id} className="border border-pale-slate rounded-card p-3 bg-pale-slate/10 flex flex-col gap-1 text-xs">
                                              <div className="flex justify-between border-b border-pale-slate pb-1.5">
                                                <span className="font-bold text-obsidian">{c.name}</span>
                                                <span className="font-bold bg-white border border-obsidian px-1.5 py-0.5 rounded text-[10px]">{c.category} ({c.chargeability})</span>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2 mt-1">
                                                <div>
                                                  <span className="text-obsidian/50 block text-[10px]">Ngày ưu tiên:</span>
                                                  <span className="font-bold">{new Date(c.priority_date).toLocaleDateString("vi-VN")}</span>
                                                </div>
                                                <div>
                                                  <span className="text-obsidian/50 block text-[10px]">Nơi phỏng vấn:</span>
                                                  <span className="font-bold truncate block">{c.consulate || "Ho Chi Minh City"}</span>
                                                </div>
                                                {c.nvc_case && (
                                                  <div>
                                                    <span className="text-obsidian/50 block text-[10px]">NVC Case ID:</span>
                                                    <span className="font-bold">{c.nvc_case}</span>
                                                  </div>
                                                )}
                                                {c.invoice_id && (
                                                  <div>
                                                    <span className="text-obsidian/50 block text-[10px]">Invoice ID:</span>
                                                    <span className="font-bold">{c.invoice_id}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-obsidian/50 italic">Thành viên này hiện tại chưa có hồ sơ di trú nào.</p>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-obsidian/60 text-sm">
                            Không tìm thấy thành viên phù hợp với tiêu chí lọc.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-obsidian p-4 bg-pale-slate/10">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded border border-obsidian text-xs font-bold bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pale-slate cursor-pointer"
                    >
                      Trang trước
                    </button>
                    <span className="text-xs text-obsidian/60 font-bold">
                      Trang {currentPage} / {totalPages} (Tổng {filteredMembers.length} thành viên)
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded border border-obsidian text-xs font-bold bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pale-slate cursor-pointer"
                    >
                      Trang sau
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: 3. BULLETIN OVERRIDE */}
          {activeTab === "bulletin" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="border-b border-obsidian pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h1 className="text-2xl font-black text-obsidian tracking-tight">Quản lý Lịch Visa Bulletin</h1>
                  <p className="text-xs text-obsidian/60 mt-1">Đồng bộ lịch cào tự động từ Travel.state.gov hoặc nhập tay ghi đè số liệu.</p>
                </div>
                
                <button 
                  onClick={handleSyncBulletin}
                  disabled={syncingBulletin}
                  className="neo-pill neo-pill-secondary text-xs px-5 py-2 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {syncingBulletin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Chạy cào tự động ngay
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form manual override (Col 7) */}
                <section className="lg:col-span-7 bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-5 shadow-obsidian">
                  <div>
                    <h3 className="text-lg font-bold text-obsidian flex items-center gap-2">
                      <Lock className="w-5 h-5 text-electric-blue" />
                      Ghi đè thủ công (Manual Override)
                    </h3>
                    <p className="text-xs text-obsidian/60 mt-0.5">Sử dụng khi API cào tự động gặp lỗi cấu trúc HTML hoặc cần điều chỉnh khẩn cấp.</p>
                  </div>

                  {overrideMessage && (
                    <div className="bg-pale-slate border border-obsidian rounded-card p-3 text-xs font-bold text-electric-blue">
                      💡 {overrideMessage}
                    </div>
                  )}

                  <form onSubmit={handleOverrideSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Month input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-obsidian/65 uppercase tracking-wider">Tháng phát hành</label>
                        <input
                          type="text"
                          required
                          value={overrideMonth}
                          onChange={(e) => setOverrideMonth(e.target.value)}
                          placeholder="Ví dụ: 08/2026"
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      
                      {/* Category select */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-obsidian/65 uppercase tracking-wider">Diện bảo lãnh</label>
                        <select
                          value={overrideCategory}
                          onChange={(e) => setOverrideCategory(e.target.value)}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-sm focus:outline-none cursor-pointer"
                        >
                          <option value="F1">F1 - Con độc thân của công dân Mỹ</option>
                          <option value="F2A">F2A - Vợ/chồng và con độc thân dưới 21 tuổi của thường trú nhân</option>
                          <option value="F2B">F2B - Con độc thân từ 21 tuổi trở lên của thường trú nhân</option>
                          <option value="F3">F3 - Con đã kết hôn của công dân Mỹ</option>
                          <option value="F4">F4 - Anh chị em của công dân Mỹ</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Final Action Date Picker */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-obsidian/65 uppercase tracking-wider">Ngày xét duyệt (Table A - Final Action Date)</label>
                        <input
                          type="date"
                          required
                          value={overrideFinalAction}
                          onChange={(e) => setOverrideFinalAction(e.target.value)}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2.5 text-sm focus:outline-none"
                        />
                      </div>

                      {/* Filing Date Picker */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-obsidian/65 uppercase tracking-wider">Ngày nộp đơn (Table B - Dates for Filing)</label>
                        <input
                          type="date"
                          required
                          value={overrideFiling}
                          onChange={(e) => setOverrideFiling(e.target.value)}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={overrideSubmitting}
                      className="neo-pill neo-pill-primary py-3 font-bold text-sm w-full cursor-pointer flex items-center justify-center gap-2 mt-2"
                    >
                      {overrideSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Lưu và Cập nhật ngày Bulletin
                    </button>
                  </form>
                </section>
                
                {/* Scraper details & Logs (Col 5) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Cron status */}
                  <div className="bg-white rounded-bento border border-obsidian p-6 shadow-obsidian flex flex-col gap-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider border-b border-pale-slate pb-2 flex items-center justify-between">
                      <span>Cấu hình cào tự động</span>
                      {cronStatus?.last_run && (new Date().getTime() - new Date(cronStatus.last_run).getTime()) < 24 * 60 * 60 * 1000 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 border border-green-500 text-green-700 px-2 py-0.5 rounded font-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                          ĐANG HOẠT ĐỘNG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 border border-red-400 text-red-600 px-2 py-0.5 rounded font-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                          KHÔNG HOẠT ĐỘNG
                        </span>
                      )}
                    </h4>
                    
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-obsidian/50">Lịch trình tự động:</span>
                        <span className="font-bold font-mono">Mỗi giờ (Phút thứ 05)</span>
                      </div>
                      {cronStatus?.last_run && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-obsidian/50">Lần chạy gần nhất:</span>
                            <span className="font-bold font-mono">
                              {new Date(cronStatus.last_run).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-obsidian/50">Lý do chạy:</span>
                            <span className="font-bold text-right max-w-[200px] truncate" title={cronStatus.last_reason}>
                              {cronStatus.last_reason}
                            </span>
                          </div>
                          {cronStatus.next_run && (
                            <div className="flex justify-between border-t border-pale-slate pt-1.5 mt-1.5">
                              <span className="text-obsidian/50 font-semibold">Lượt cào tiếp theo (dự kiến):</span>
                              <span className="font-extrabold text-electric-blue">
                                {new Date(cronStatus.next_run).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="bg-amber-50 border border-amber-400 p-2.5 rounded-card text-[10px] text-amber-800 leading-normal mt-1">
                        <strong>Lưu ý:</strong> Cron tự động sử dụng chu kỳ cào thông minh (kiểm tra mỗi 6 giờ từ ngày 10-20 hàng tháng, mỗi 24 giờ ngoài khung giờ này).
                      </div>
                    </div>
                  </div>

                  {/* Scraper Logs list */}
                  <div className="bg-white rounded-bento border border-obsidian p-6 shadow-obsidian flex flex-col gap-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider border-b border-pale-slate pb-2 flex items-center justify-between">
                      <span>Nhật ký cào gần đây</span>
                      <button 
                        onClick={loadScraperLogs} 
                        disabled={loadingScraperLogs}
                        className="text-[10px] font-bold text-electric-blue hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {loadingScraperLogs ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Tải lại
                      </button>
                    </h4>

                    <div className="overflow-y-auto max-h-[350px] pr-1 flex flex-col gap-3">
                      {scraperLogs.length > 0 ? (
                        scraperLogs.map((log) => {
                          const isSuccess = log.status === "success";
                          const isFailed = log.status === "failed";
                          const isSkipped = log.status === "skipped" || log.status === "already_up_to_date";
                          
                          let statusLabel = "Thành công";
                          let statusColor = "bg-green-50 border-green-500 text-green-700";
                          if (isFailed) {
                            statusLabel = "Thất bại";
                            statusColor = "bg-red-50 border-red-400 text-red-700";
                          } else if (log.status === "skipped") {
                            statusLabel = "Bỏ qua";
                            statusColor = "bg-blue-50 border-blue-400 text-blue-700";
                          } else if (log.status === "already_up_to_date") {
                            statusLabel = "Đã mới nhất";
                            statusColor = "bg-gray-50 border-gray-400 text-gray-700";
                          } else if (log.status === "not_released_yet") {
                            statusLabel = "Chưa phát hành";
                            statusColor = "bg-amber-50 border-amber-500 text-amber-700";
                          }

                          return (
                            <div key={log.id} className="border border-pale-slate rounded-card p-3 bg-pale-slate/10 flex flex-col gap-1.5 text-xs">
                              <div className="flex justify-between items-center border-b border-pale-slate pb-1.5">
                                <span className="font-bold font-mono text-[10px] text-obsidian/50">
                                  {new Date(log.run_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                                </span>
                                <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] font-black border ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1">
                                {log.target_month && (
                                  <div>
                                    <span className="text-obsidian/50">Tháng quét:</span>{" "}
                                    <span className="font-bold">{log.target_month}</span>
                                  </div>
                                )}
                                <div className="text-[11px] text-obsidian/70 leading-relaxed font-medium break-words">
                                  {log.message}
                                </div>
                                {log.emails_sent > 0 && (
                                  <div className="text-[10px] font-black text-green-600 mt-0.5">
                                    ✓ Đã gửi {log.emails_sent} email thông báo đến hạn
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-obsidian/50 italic py-4 text-center">
                          Chưa có lịch sử cào nào trong database.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 4. EMAIL & NEWSLETTER CONFIG */}
          {activeTab === "email" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="border-b border-obsidian pb-3">
                <h1 className="text-2xl font-black text-obsidian tracking-tight">Cấu hình hệ thống & Phát hành Bản tin</h1>
                <p className="text-xs text-obsidian/60 mt-1">Tùy chỉnh cài đặt máy chủ mail gửi đi, gửi newsletter hoặc xem lịch sử logs.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Email settings (Col 8) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {/* System config */}
                  <section className="bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-4 shadow-obsidian">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Mail className="w-5 h-5 text-electric-blue" />
                      Cài đặt máy chủ gửi Email
                    </h2>
                    
                    {configMessage && (
                      <div className="bg-pale-slate border border-obsidian rounded-card p-3.5 text-xs font-bold text-electric-blue">
                        💡 {configMessage}
                      </div>
                    )}

                    {loadingConfig ? (
                      <div className="py-8 flex items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 text-electric-blue animate-spin" />
                        <span className="text-sm font-bold text-obsidian/60">Đang tải cấu hình email...</span>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveConfig} className="flex flex-col gap-4">
                        {/* Selector */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">Chọn Dịch Vụ Gửi Thư Mặc Định</label>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setEmailConfig({ ...emailConfig, provider: "smtp" })}
                              className={`py-2 px-4 rounded-card border font-bold text-sm transition-all cursor-pointer ${
                                emailConfig.provider === "smtp"
                                  ? "bg-electric-blue text-white border-obsidian shadow-obsidian-sm translate-y-[-2px]"
                                  : "bg-pale-slate text-obsidian border-obsidian/20 hover:border-obsidian"
                              }`}
                            >
                              SMTP (Gmail / Custom)
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmailConfig({ ...emailConfig, provider: "resend" })}
                              className={`py-2 px-4 rounded-card border font-bold text-sm transition-all cursor-pointer ${
                                emailConfig.provider === "resend"
                                  ? "bg-electric-blue text-white border-obsidian shadow-obsidian-sm translate-y-[-2px]"
                                  : "bg-pale-slate text-obsidian border-obsidian/20 hover:border-obsidian"
                              }`}
                            >
                              Resend API
                            </button>
                          </div>
                        </div>

                        {emailConfig.provider === "smtp" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-dashed border-obsidian/20 p-4 rounded-card bg-pale-slate/30">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">SMTP Host</label>
                              <input
                                type="text"
                                value={emailConfig.smtpHost || ""}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                                placeholder="smtp.gmail.com"
                                className="bg-white rounded-card border border-obsidian px-3 py-2 text-sm text-obsidian focus:outline-none"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">SMTP Port</label>
                              <input
                                type="text"
                                value={emailConfig.smtpPort || ""}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })}
                                placeholder="465"
                                className="bg-white rounded-card border border-obsidian px-3 py-2 text-sm text-obsidian focus:outline-none"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">Bảo mật SSL/TLS</label>
                              <select
                                value={emailConfig.smtpSecure ? "true" : "false"}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtpSecure: e.target.value === "true" })}
                                className="bg-white rounded-card border border-obsidian px-3 py-2 text-sm text-obsidian focus:outline-none"
                              >
                                <option value="true">BẬT (SSL - Cổng 465)</option>
                                <option value="false">TẮT (TLS - Cổng 587)</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">Username (Email gửi)</label>
                              <input
                                type="email"
                                value={emailConfig.smtpUser || ""}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                                placeholder="your-email@gmail.com"
                                className="bg-white rounded-card border border-obsidian px-3 py-2 text-sm text-obsidian focus:outline-none"
                              />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                              <label className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">Password / Mật khẩu ứng dụng</label>
                              <input
                                type="password"
                                value={emailConfig.smtpPass || ""}
                                onChange={(e) => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })}
                                placeholder="Mật khẩu ứng dụng Gmail (16 chữ cái)"
                                className="bg-white rounded-card border border-obsidian px-3 py-2 text-sm text-obsidian focus:outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-dashed border-obsidian/20 p-4 rounded-card bg-pale-slate/30">
                            <div className="flex flex-col gap-1 md:col-span-2">
                              <label className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">Resend API Key</label>
                              <input
                                type="password"
                                value={emailConfig.resendApiKey || ""}
                                onChange={(e) => setEmailConfig({ ...emailConfig, resendApiKey: e.target.value })}
                                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                                className="bg-white rounded-card border border-obsidian px-3 py-2 text-sm text-obsidian focus:outline-none"
                              />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                              <label className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">From Email (Email gửi đi)</label>
                              <input
                                type="text"
                                value={emailConfig.resendFrom || ""}
                                onChange={(e) => setEmailConfig({ ...emailConfig, resendFrom: e.target.value })}
                                placeholder="onboarding@resend.dev"
                                className="bg-white rounded-card border border-obsidian px-3 py-2 text-sm text-obsidian focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={savingConfig}
                          className="neo-pill neo-pill-primary py-3 font-bold text-sm cursor-pointer w-full flex items-center justify-center gap-2"
                        >
                          {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Lưu cấu hình Email
                        </button>
                      </form>
                    )}

                    {/* Test Email */}
                    <div className="border-t border-pale-slate pt-5 mt-2 flex flex-col gap-3">
                      <h3 className="text-sm font-bold text-obsidian flex items-center gap-1.5">
                        🧪 Gửi email thử nghiệm cấu hình
                      </h3>
                      <div className="flex flex-col md:flex-row gap-3">
                        <input
                          type="email"
                          placeholder="Nhập email nhận..."
                          value={testRecipient}
                          onChange={(e) => setTestRecipient(e.target.value)}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2.5 text-sm text-obsidian focus:outline-none flex-grow"
                        />
                        <button
                          onClick={handleSendTestEmail}
                          disabled={sendingTest || !testRecipient}
                          className="neo-pill neo-pill-secondary py-2 px-5 text-sm cursor-pointer font-bold shrink-0 flex items-center justify-center gap-1.5"
                        >
                          {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Gửi mail test
                        </button>
                      </div>
                      {testMessage && (
                        <p className="text-xs font-bold text-electric-blue">
                          {testMessage}
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Drip logs */}
                  <section className="bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-4 shadow-obsidian">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <History className="w-5 h-5 text-electric-blue" />
                      Nhật ký gửi Drip Email & Bản tin gần đây
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-obsidian bg-pale-slate/30">
                            <th className="py-3 px-3 font-bold text-obsidian/60 uppercase">Email Nhận</th>
                            <th className="py-3 px-3 font-bold text-obsidian/60 uppercase">Nội Dung</th>
                            <th className="py-3 px-3 font-bold text-obsidian/60 uppercase">Thời Gian</th>
                            <th className="py-3 px-3 font-bold text-obsidian/60 uppercase text-center">Trạng Thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dripQueues.length > 0 ? (
                            dripQueues.map((q) => (
                              <tr key={q.id} className="border-b border-pale-slate hover:bg-pale-slate/50">
                                <td className="py-3 px-3 font-bold max-w-[150px] truncate" title={q.profiles?.email}>
                                  {q.profiles?.email || "Unknown"}
                                </td>
                                <td className="py-3 px-3 truncate max-w-[180px]" title={q.articles?.title}>
                                  {q.articles?.title || "Guide Info"}
                                </td>
                                <td className="py-3 px-3 font-mono text-[11px]">
                                  {new Date(q.scheduled_for).toLocaleDateString("vi-VN")}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    q.status === "sent" ? "bg-green-50 border-green-500 text-green-700" :
                                    q.status === "pending" ? "bg-amber-50 border-amber-500 text-amber-700 animate-pulse" :
                                    "bg-red-50 border-red-400 text-red-700"
                                  }`}>
                                    {q.status === "sent" ? "Đã Gửi" : q.status === "pending" ? "Chờ" : "Hủy"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-obsidian/60 text-sm">
                                Chưa ghi nhận logs gửi thư tự động.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                {/* Newsletter Composer (Col 4) */}
                <aside className="lg:col-span-4 flex flex-col gap-6">
                  <section className="bg-white rounded-bento border border-obsidian p-6 flex flex-col gap-4 shadow-obsidian">
                    <h2 className="text-lg font-bold flex items-center gap-2 border-b border-pale-slate pb-3">
                      <Send className="w-5 h-5 text-electric-blue" />
                      Gửi Bản Tin Thủ Công
                    </h2>
                    
                    {newsletterMessage && (
                      <div className="bg-pale-slate border border-obsidian rounded-card p-3.5 text-xs font-bold text-electric-blue">
                        📣 {newsletterMessage}
                      </div>
                    )}

                    <form onSubmit={handleSendNewsletter} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="articleSelect" className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">Chọn cẩm nang hướng dẫn</label>
                        <select 
                          id="articleSelect"
                          required
                          value={selectedArticleId}
                          onChange={(e) => setSelectedArticleId(e.target.value)}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-sm text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full cursor-pointer"
                        >
                          <option value="">-- Chọn bài viết lộ trình --</option>
                          {initialArticles.map((art) => (
                            <option key={art.id} value={art.id}>
                              {art.title} ({art.drip_day !== null ? `Ngày ${art.drip_day}` : "Blog"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor="newsletterSubject" className="text-[10px] font-bold text-obsidian/60 uppercase tracking-wider">Tiêu đề email gửi đi</label>
                        <input 
                          id="newsletterSubject"
                          type="text"
                          required
                          value={newsletterSubject}
                          onChange={(e) => setNewsletterSubject(e.target.value)}
                          placeholder="Ví dụ: Cập nhật lộ trình nộp đơn DS-260..."
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2.5 text-sm text-obsidian focus:ring-2 focus:ring-electric-blue focus:outline-none w-full"
                        />
                      </div>

                      <div className="bg-pale-slate border border-dashed border-obsidian/20 p-3.5 rounded-card flex gap-2">
                        <Info className="w-4 h-4 text-electric-blue shrink-0 mt-0.5" />
                        <p className="text-[10px] text-obsidian/70 leading-relaxed">
                          Bản tin này sẽ gửi qua Resend tới tất cả các thành viên đã bật tùy chọn nhận email bản tin trong hệ thống.
                        </p>
                      </div>

                      <button 
                        type="submit"
                        disabled={sendingNewsletter}
                        className="w-full neo-pill neo-pill-primary py-3 flex items-center justify-center gap-2 cursor-pointer font-bold text-sm"
                      >
                        {sendingNewsletter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Phát hành bản tin ngay
                      </button>
                    </form>
                  </section>
                </aside>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 5. ARTICLES CRUD */}
          {activeTab === "articles" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="border-b border-obsidian pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-black text-obsidian tracking-tight">Quản lý bài viết hướng dẫn</h1>
                  <p className="text-xs text-obsidian/60 mt-1">Soạn thảo trực quan WYSIWYG, cập nhật cẩm nang định cư và tối ưu hóa SEO thời gian thực.</p>
                </div>
                
                {activeArticleView === "list" && (
                  <button
                    onClick={() => {
                      setIsEditingArticle(false);
                      setEditingArticleId(null);
                      setArticleTitle("");
                      setArticleSlug("");
                      setArticleContent("");
                      setArticleDripDay("");
                      setSeoDescription("");
                      setSeoKeyword("");
                      setIsHtmlMode(false);
                      setArticleMessage("");
                      setActiveArticleView("form");
                    }}
                    className="neo-pill neo-pill-primary py-3 px-6 text-sm font-bold flex items-center gap-2 cursor-pointer shadow-flat hover:scale-105 active:scale-95 transition-transform duration-200"
                  >
                    <span className="text-base font-black">+</span> Soạn bài viết mới
                  </button>
                )}

                {activeArticleView === "form" && (
                  <button
                    onClick={async () => {
                      if (await customConfirm("Bạn có chắc muốn quay lại danh sách? Các thay đổi chưa lưu sẽ bị mất.", "Quay lại")) {
                        setActiveArticleView("list");
                        setIsEditingArticle(false);
                        setEditingArticleId(null);
                        setArticleTitle("");
                        setArticleSlug("");
                        setArticleContent("");
                        setArticleDripDay("");
                        setSeoDescription("");
                        setSeoKeyword("");
                        setIsHtmlMode(false);
                        setArticleMessage("");
                      }
                    }}
                    className="neo-pill neo-pill-secondary py-3 px-5 text-sm font-bold flex items-center gap-2 cursor-pointer hover:bg-obsidian hover:text-white"
                  >
                    <span>←</span> Quay lại danh sách
                  </button>
                )}
              </div>

              <style dangerouslySetInnerHTML={{__html: `
                .editor-content {
                  outline: none;
                  min-height: 400px;
                  padding: 20px;
                  font-size: 15px;
                  line-height: 1.7;
                  color: var(--obsidian);
                }
                .editor-content h1 { font-size: 26px; font-weight: 800; margin-top: 20px; margin-bottom: 10px; border-bottom: 1.5px solid var(--obsidian); padding-bottom: 6px; }
                .editor-content h2 { font-size: 22px; font-weight: 700; margin-top: 18px; margin-bottom: 8px; border-bottom: 1px solid rgba(24, 24, 27, 0.1); padding-bottom: 4px; }
                .editor-content h3 { font-size: 19px; font-weight: 600; margin-top: 14px; margin-bottom: 6px; }
                .editor-content p { margin-bottom: 14px; }
                .editor-content ul { list-style-type: disc; margin-left: 24px; margin-bottom: 14px; }
                .editor-content ol { list-style-type: decimal; margin-left: 24px; margin-bottom: 14px; }
                .editor-content li { margin-bottom: 6px; }
                .editor-content blockquote { border-left: 4px solid var(--electric-blue); padding: 12px 16px; font-style: italic; color: rgba(24, 24, 27, 0.8); margin: 16px 0; background: var(--pale-slate); border-radius: 0 12px 12px 0; }
                .editor-content table { border-collapse: collapse; width: 100%; margin: 16px 0; border: 1.5px solid var(--obsidian); }
                .editor-content th, .editor-content td { border: 1.5px solid var(--obsidian); padding: 10px; text-align: left; }
                .editor-content th { background-color: rgba(24, 24, 27, 0.05); font-weight: 700; }
                .editor-content img { max-width: 100%; height: auto; border: 1.5px solid var(--obsidian); border-radius: 8px; margin: 12px 0; box-shadow: 3px 3px 0px 0px var(--obsidian); }
                .editor-content a { color: var(--electric-blue); font-weight: 700; text-decoration: underline; }
              `}} />

              {/* VIEW 1: LIST OF ARTICLES */}
              {activeArticleView === "list" && (
                <div className="bg-white rounded-bento border-2 border-obsidian p-6 md:p-8 shadow-flat animate-fadeIn col-span-12">
                  <div className="flex items-center gap-2 mb-6">
                    <BookOpen className="w-6 h-6 text-electric-blue" />
                    <h2 className="text-xl font-bold text-obsidian">Danh sách bài viết cẩm nang ({articles.length})</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-obsidian">
                      <thead>
                        <tr className="border-b-2 border-obsidian bg-pale-slate">
                          <th className="py-4 px-4 font-bold text-obsidian uppercase tracking-wider text-xs">Tiêu đề cẩm nang</th>
                          <th className="py-4 px-4 font-bold text-obsidian uppercase tracking-wider text-xs">Đường dẫn (Slug)</th>
                          <th className="py-4 px-4 font-bold text-obsidian uppercase tracking-wider text-xs text-center">Drip Day</th>
                          <th className="py-4 px-4 font-bold text-obsidian uppercase tracking-wider text-xs text-center">Tối ưu SEO</th>
                          <th className="py-4 px-4 font-bold text-obsidian uppercase tracking-wider text-xs text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-obsidian/10">
                        {articles.length > 0 ? (
                          articles.map((art) => {
                            const seoResult = analyzeSEO(art.title, art.slug, art.content, art.seo_keyword || "", art.seo_description || "");
                            let scoreBadgeColor = "bg-red-100 border-red-400 text-red-700";
                            if (seoResult.score >= 50 && seoResult.score < 80) {
                              scoreBadgeColor = "bg-yellow-100 border-yellow-400 text-yellow-800";
                            } else if (seoResult.score >= 80) {
                              scoreBadgeColor = "bg-green-100 border-green-400 text-green-700";
                            }

                            return (
                              <tr key={art.id} className="hover:bg-pale-slate/30 transition-colors">
                                <td className="py-4 px-4 font-bold text-obsidian text-sm">{art.title}</td>
                                <td className="py-4 px-4 font-mono text-xs text-obsidian/70">/{art.slug}</td>
                                <td className="py-4 px-4 text-center">
                                  {art.drip_day !== null ? (
                                    <span className="bg-blue-100 border border-blue-400 text-blue-800 font-bold px-2 py-1 rounded text-xs">
                                      Ngày {art.drip_day}
                                    </span>
                                  ) : (
                                    <span className="bg-gray-100 border border-gray-400 text-gray-700 px-2 py-1 rounded text-xs">
                                      Blog công khai
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-center">
                                  {art.seo_keyword ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className={`border font-mono font-black text-xs px-2.5 py-1 rounded-full ${scoreBadgeColor}`}>
                                        {seoResult.score}/100
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-obsidian/40 italic">Chưa cấu hình</span>
                                  )}
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center justify-center gap-3">
                                    <button
                                      onClick={() => {
                                        setArticleTitle(art.title);
                                        setArticleSlug(art.slug);
                                        setArticleContent(convertMarkdownToHtml(art.content));
                                        setSeoKeyword(art.seo_keyword || "");
                                        setSeoDescription(art.seo_description || "");
                                        setShowPreviewModal(true);
                                      }}
                                      className="text-xs font-bold text-electric-blue hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                      <span>👁️</span> Xem trước
                                    </button>
                                    <button
                                      onClick={() => {
                                        setIsEditingArticle(true);
                                        setEditingArticleId(art.id);
                                        setArticleTitle(art.title);
                                        setArticleSlug(art.slug);
                                        setArticleContent(convertMarkdownToHtml(art.content));
                                        setArticleDripDay(art.drip_day !== null ? art.drip_day : "");
                                        setSeoDescription(art.seo_description || "");
                                        setSeoKeyword(art.seo_keyword || "");
                                        setIsHtmlMode(false);
                                        setArticleMessage("");
                                        setActiveArticleView("form");
                                      }}
                                      className="text-xs font-bold text-yellow-600 hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                      <span>✏️</span> Sửa
                                    </button>
                                    <button
                                      onClick={() => handleDeleteArticle(art.id, art.title)}
                                      className="text-xs font-bold text-red-500 hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                      <span>🗑️</span> Xóa
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-obsidian/60 font-medium">
                              Chưa có bài viết hướng dẫn nào được soạn thảo. Hãy bấm Soạn bài viết mới!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2: FORM ADD/EDIT ARTICLE */}
              {activeArticleView === "form" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Form Fields & Editor (Col 9) */}
                  <form 
                    onSubmit={handleArticleSubmit} 
                    className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6"
                  >
                    <section className="bg-white rounded-bento border-2 border-obsidian p-6 md:p-8 flex flex-col gap-5 shadow-flat">
                      <div className="border-b border-obsidian pb-3">
                        <h2 className="text-xl font-black text-obsidian flex items-center gap-2">
                          <span>{isEditingArticle ? "📝 Chỉnh sửa bài viết cẩm nang" : "✍️ Soạn thảo bài viết mới"}</span>
                        </h2>
                      </div>

                      {articleMessage && (
                        <div className="bg-blue-50 border-2 border-electric-blue rounded-card p-4 text-sm font-bold text-electric-blue">
                          💡 {articleMessage}
                        </div>
                      )}

                      {/* Article Title */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-obsidian/70 uppercase tracking-wider">Tiêu đề bài viết</label>
                        <input
                          type="text"
                          required
                          value={articleTitle}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          placeholder="Ví dụ: Hướng dẫn đóng phí Visa định cư (IV Fee) qua cổng CEAC"
                          className="bg-pale-slate rounded-card border-2 border-obsidian px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue text-obsidian font-bold"
                        />
                      </div>

                      {/* Slug, Drip Day & Focus Keyword in Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Slug */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-obsidian/70 uppercase tracking-wider">Slug đường dẫn</label>
                          <input
                            type="text"
                            required
                            value={articleSlug}
                            onChange={(e) => setArticleSlug(e.target.value)}
                            placeholder="huong-dan-dong-phi-visa"
                            className="bg-pale-slate rounded-card border-2 border-obsidian px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue font-mono"
                          />
                        </div>

                        {/* Drip Day */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-obsidian/70 uppercase tracking-wider">Drip Day (Ngày gửi Email)</label>
                          <input
                            type="number"
                            value={articleDripDay}
                            onChange={(e) => setArticleDripDay(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="Để trống nếu là Blog"
                            className="bg-pale-slate rounded-card border-2 border-obsidian px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue"
                          />
                        </div>

                        {/* Focus Keyword (SEO) */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-obsidian/70 uppercase tracking-wider flex items-center gap-1">
                            Từ khóa chính
                          </label>
                          <input
                            type="text"
                            value={seoKeyword}
                            onChange={(e) => setSeoKeyword(e.target.value)}
                            placeholder="Ví dụ: dong phi visa, CEAC"
                            className="bg-pale-slate rounded-card border-2 border-obsidian px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue font-bold text-electric-blue"
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-obsidian/50 leading-relaxed -mt-3">
                        * **Drip Day:** Điền số 0, 7, 14... để tự động xếp hàng gửi email cho thành viên theo tiến trình. Để trống để hiển thị ở mục tin tức công khai.
                        <br/>* **Từ khóa chính:** Nhập từ khóa để bộ chấm điểm SEO tự động tính toán.
                      </span>

                      {/* WYSIWYG HTML/Visual Editor Container */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-obsidian/70 uppercase tracking-wider">Nội dung bài viết</label>
                        <div className="border-2 border-obsidian rounded-card overflow-hidden bg-white flex flex-col shadow-flat">
                          {/* Toolbar */}
                          <div className="bg-pale-slate border-b-2 border-obsidian p-2 flex flex-wrap gap-1.5 items-center">
                            <button
                              type="button"
                              onClick={() => executeCommand('bold')}
                              title="In đậm (Ctrl+B)"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5 text-xs font-bold"
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('italic')}
                              title="In nghiêng (Ctrl+I)"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5 text-xs font-bold"
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('underline')}
                              title="Gạch chân (Ctrl+U)"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5 text-xs font-bold"
                            >
                              <Underline className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('strikeThrough')}
                              title="Gạch đè"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5 text-xs font-bold"
                            >
                              <Strikethrough className="w-3.5 h-3.5" />
                            </button>
                            
                            <div className="h-5 w-px bg-obsidian/20 mx-1" />
                            
                            <button
                              type="button"
                              onClick={() => executeCommand('formatBlock', 'h1')}
                              title="Tiêu đề H1"
                              className="px-2 py-1.5 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5 text-xs font-black"
                            >
                              H1
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('formatBlock', 'h2')}
                              title="Tiêu đề H2"
                              className="px-2 py-1.5 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5 text-xs font-black"
                            >
                              H2
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('formatBlock', 'h3')}
                              title="Tiêu đề H3"
                              className="px-2 py-1.5 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5 text-xs font-black"
                            >
                              H3
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('formatBlock', 'p')}
                              title="Đoạn văn"
                              className="px-2 py-1.5 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5 text-xs font-bold"
                            >
                              P
                            </button>

                            <div className="h-5 w-px bg-obsidian/20 mx-1" />

                            <button
                              type="button"
                              onClick={() => executeCommand('insertUnorderedList')}
                              title="Danh sách dấu chấm"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5"
                            >
                              <List className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('insertOrderedList')}
                              title="Danh sách số"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5"
                            >
                              <ListOrdered className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('formatBlock', 'blockquote')}
                              title="Trích dẫn"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5"
                            >
                              <Quote className="w-3.5 h-3.5" />
                            </button>

                            <div className="h-5 w-px bg-obsidian/20 mx-1" />

                            <button
                              type="button"
                              onClick={() => {
                                const url = prompt("Nhập đường dẫn liên kết (URL):", "https://");
                                if (url && url !== "https://") {
                                  executeCommand('createLink', url);
                                }
                              }}
                              title="Chèn liên kết"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setImageUrlInput("");
                                setImageUploadMode("url");
                                setShowImageModal(true);
                              }}
                              title="Chèn hình ảnh"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTableRowsInput(3);
                                setTableColsInput(3);
                                setShowTableModal(true);
                              }}
                              title="Chèn bảng biểu"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5"
                            >
                              <TableIcon className="w-3.5 h-3.5" />
                            </button>

                            <div className="h-5 w-px bg-obsidian/20 mx-1" />

                            <button
                              type="button"
                              onClick={() => executeCommand('justifyLeft')}
                              title="Canh trái"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5"
                            >
                              <AlignLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('justifyCenter')}
                              title="Canh giữa"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5"
                            >
                              <AlignCenter className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('justifyRight')}
                              title="Canh phải"
                              className="p-2 border border-obsidian rounded bg-white hover:bg-obsidian hover:text-white cursor-pointer active:translate-y-0.5"
                            >
                              <AlignRight className="w-3.5 h-3.5" />
                            </button>

                            <div className="flex-1" />

                            <button
                              type="button"
                              onClick={() => setIsHtmlMode(!isHtmlMode)}
                              title={isHtmlMode ? "Chuyển sang Chế độ trực quan" : "Xem và edit mã nguồn HTML"}
                              className={`p-2 border border-obsidian rounded cursor-pointer active:translate-y-0.5 text-xs font-bold flex items-center gap-1.5 ${
                                isHtmlMode ? 'bg-obsidian text-white' : 'bg-white hover:bg-obsidian hover:text-white'
                              }`}
                            >
                              {isHtmlMode ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                              <span>{isHtmlMode ? "Trực quan" : "Mã HTML"}</span>
                            </button>
                          </div>

                          {/* Editor Area */}
                          {isHtmlMode ? (
                            <textarea
                              value={articleContent}
                              onChange={(e) => setArticleContent(e.target.value)}
                              className="w-full min-h-[400px] p-4 text-xs font-mono bg-obsidian text-pure-white focus:outline-none resize-y"
                              placeholder="<div>Nhập mã nguồn HTML trực tiếp tại đây...</div>"
                            />
                          ) : (
                            <div
                              ref={editorRef}
                              contentEditable
                              onInput={handleEditorChange}
                              onBlur={handleEditorChange}
                              className="editor-content w-full min-h-[400px] overflow-y-auto focus:outline-none bg-white"
                            />
                          )}
                        </div>
                      </div>

                      {/* Meta Description */}
                      <div className="flex flex-col gap-1.5 bg-pale-slate/30 border-2 border-dashed border-obsidian/30 p-4 rounded-card">
                        <label className="text-xs font-bold text-obsidian/70 uppercase tracking-wider flex justify-between items-center">
                          <span>Mô tả ngắn hiển thị tìm kiếm (SEO Meta Description)</span>
                          <span className={`text-[10px] font-mono font-bold ${seoDescription.length >= 120 && seoDescription.length <= 160 ? "text-green-600" : "text-obsidian/50"}`}>
                            Độ dài: {seoDescription.length} ký tự
                          </span>
                        </label>
                        <textarea
                          rows={3}
                          value={seoDescription}
                          onChange={(e) => setSeoDescription(e.target.value)}
                          placeholder="Mô tả ngắn gọn về bài viết (khuyến nghị từ 120 đến 160 ký tự để tối ưu tìm kiếm)..."
                          className="bg-white rounded-card border-2 border-obsidian px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue resize-y"
                        />
                        <span className="text-[9px] text-obsidian/50 leading-tight">
                          * Khuyến nghị: Từ 120 đến 160 ký tự để Google không cắt ngắn mô tả của bạn trên trang kết quả.
                        </span>
                      </div>
                    </section>
                  </form>

                  {/* Right Column: Actions & SEO Panel (Col 3) - STICKY FOR BETTER WRITING WORKFLOW */}
                  <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6 flex flex-col gap-6">
                    {/* Action buttons card */}
                    <section className="bg-white rounded-bento border-2 border-obsidian p-6 flex flex-col gap-4 shadow-flat">
                      <h3 className="text-sm font-black uppercase text-obsidian/60 tracking-wider pb-2 border-b border-pale-slate">Hành động</h3>
                      
                      <button
                        type="button"
                        onClick={handleArticleSubmit}
                        disabled={articleSubmitting}
                        className="neo-pill neo-pill-primary w-full py-3.5 font-bold text-sm cursor-pointer flex items-center justify-center gap-2 shadow-flat hover:scale-105 active:scale-95 transition-transform duration-100"
                      >
                        {articleSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "💾"}
                        {isEditingArticle ? "Cập nhật bài viết" : "Đăng bài viết mới"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPreviewModal(true)}
                        className="neo-pill neo-pill-secondary w-full py-3 font-bold text-sm cursor-pointer flex items-center justify-center gap-2 hover:bg-obsidian hover:text-white"
                      >
                        <span>👁️</span> Xem trước trực quan
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (await customConfirm("Hủy bỏ và quay lại danh sách?", "Quay lại")) {
                            setActiveArticleView("list");
                            setIsEditingArticle(false);
                            setEditingArticleId(null);
                            setArticleTitle("");
                            setArticleSlug("");
                            setArticleContent("");
                            setArticleDripDay("");
                            setSeoDescription("");
                            setSeoKeyword("");
                            setIsHtmlMode(false);
                          }
                        }}
                        className="text-xs font-bold text-red-500 hover:text-red-700 mt-1 hover:underline cursor-pointer"
                      >
                        Hủy bỏ thay đổi
                      </button>
                    </section>

                    {/* SEO Real-time score & checks card */}
                    {(() => {
                      const seoResult = analyzeSEO(articleTitle, articleSlug, articleContent, seoKeyword, seoDescription);
                      
                      let scoreColorClass = "bg-red-500 border-red-700 text-white";
                      let scoreText = "Cần cải thiện";
                      if (seoResult.score >= 50 && seoResult.score < 80) {
                        scoreColorClass = "bg-yellow-400 border-yellow-600 text-obsidian";
                        scoreText = "Khá tốt";
                      } else if (seoResult.score >= 80) {
                        scoreColorClass = "bg-green-500 border-green-700 text-white";
                        scoreText = "Chuẩn tối ưu";
                      }

                      return (
                        <section className="bg-white rounded-bento border-2 border-obsidian p-6 shadow-flat flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-pale-slate pb-2">
                            <h3 className="text-xs font-black uppercase text-obsidian tracking-tight">Bộ phân tích SEO</h3>
                            <span className="text-[9px] bg-pale-slate border border-obsidian px-1.5 py-0.5 rounded font-mono font-bold">REAL-TIME</span>
                          </div>

                          <div className="flex items-center gap-4 bg-pale-slate/30 p-3 rounded-card border border-obsidian/10">
                            <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 shadow-sm font-black shrink-0 ${scoreColorClass}`}>
                              <span className="text-lg leading-none">{seoResult.score}</span>
                              <span className="text-[8px] leading-none mt-0.5">/100</span>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-obsidian">Đánh giá chung</h4>
                              <p className="text-xs text-obsidian/60 mt-0.5">Trạng thái: <strong className="text-obsidian">{scoreText}</strong></p>
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto max-h-[380px] flex flex-col gap-2 pr-1">
                            {seoResult.checks.map((check) => {
                              let statusColor = "bg-red-50 border-red-200 text-red-700";
                              let statusLabel = "❌";
                              if (check.status === "pass") {
                                statusColor = "bg-green-50 border-green-200 text-green-700";
                                statusLabel = "✅";
                              } else if (check.status === "warn") {
                                statusColor = "bg-yellow-50 border-yellow-200 text-yellow-800";
                                statusLabel = "⚠️";
                              }

                              return (
                                <div key={check.id} className={`p-2.5 border-2 rounded-card text-[11px] leading-snug ${statusColor}`}>
                                  <div className="font-bold flex items-center gap-1 mb-0.5">
                                    <span>{statusLabel}</span>
                                    <span>{check.label}</span>
                                  </div>
                                  <p className="opacity-95 text-[10px]">{check.feedback}</p>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })()}
                  </div>
                </div>
              )}



              {/* DYNAMIC VISUAL PREVIEW MODAL */}
              {showPreviewModal && (
                <div className="fixed inset-0 bg-obsidian/60 flex items-center justify-center z-[150] p-4 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white border-2 border-obsidian rounded-bento shadow-flat-lg max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-pale-slate border-b-2 border-obsidian px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👁️</span>
                        <div>
                          <h3 className="font-black text-base text-obsidian">Xem trước cẩm nang hướng dẫn</h3>
                          <p className="text-[10px] text-obsidian/60 mt-0.5">Mô phỏng hiển thị trên các thiết bị thời gian thực</p>
                        </div>
                      </div>

                      {/* Device Selector */}
                      <div className="flex bg-white border-2 border-obsidian rounded-card overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("desktop")}
                          className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-r border-obsidian ${
                            previewDevice === "desktop" ? "bg-obsidian text-white" : "bg-white text-obsidian hover:bg-pale-slate"
                          }`}
                        >
                          <span>💻</span> Máy tính (Desktop)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("mobile")}
                          className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            previewDevice === "mobile" ? "bg-obsidian text-white" : "bg-white text-obsidian hover:bg-pale-slate"
                          }`}
                        >
                          <span>📱</span> Di động (Mobile)
                        </button>
                      </div>

                      {/* Close button */}
                      <button
                        type="button"
                        onClick={() => setShowPreviewModal(false)}
                        className="neo-pill neo-pill-secondary py-2 px-4 text-xs font-bold hover:bg-red-500 hover:text-white cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>

                    {/* Simulation Content Body */}
                    <div className="flex-grow p-6 md:p-8 bg-pale-slate overflow-y-auto flex items-center justify-center">
                      
                      {/* DESKTOP PREVIEW WRAPPER */}
                      {previewDevice === "desktop" && (
                        <div className="w-full max-w-[800px] bg-white border-2 border-obsidian rounded-bento p-8 md:p-12 shadow-flat min-h-[500px] h-full overflow-y-auto">
                          <div className="flex items-center gap-2 text-xs font-bold text-electric-blue mb-4">
                            <span className="bg-blue-50 border border-blue-300 text-blue-700 px-2 py-0.5 rounded">
                              {articleDripDay !== "" ? `Drip Email (Ngày ${articleDripDay})` : "Blog công khai"}
                            </span>
                            <span>•</span>
                            <span className="text-obsidian/60">Cập nhật lúc: Vừa xong</span>
                          </div>
                          
                          <h1 className="text-3xl md:text-4xl font-extrabold text-obsidian tracking-tight mb-6">
                            {articleTitle || "Tiêu đề bài viết chưa nhập..."}
                          </h1>

                          <div 
                            className="editor-content border-t border-obsidian/10 pt-6"
                            dangerouslySetInnerHTML={{ __html: articleContent || "<p class='text-obsidian/40 italic'>Chưa có nội dung soạn thảo...</p>" }}
                          />
                        </div>
                      )}

                      {/* MOBILE PREVIEW WRAPPER (IPHONE TYPE SIMULATION) */}
                      {previewDevice === "mobile" && (
                        <div className="w-[360px] h-[650px] bg-white border-8 border-obsidian rounded-[40px] shadow-flat relative overflow-hidden flex flex-col shrink-0">
                          {/* iPhone Speaker / Notch */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-obsidian rounded-b-xl z-20 flex justify-center items-center">
                            <div className="w-12 h-1 bg-white/20 rounded-full" />
                          </div>

                          {/* Mobile Screen Header */}
                          <div className="bg-white border-b border-obsidian/10 pt-8 pb-3 px-4 flex items-center gap-2 shrink-0">
                            <span className="text-obsidian font-bold text-xs">← Quay lại</span>
                            <div className="flex-1 text-center font-bold text-[10px] text-obsidian/50 truncate">
                              /{articleSlug || "path"}
                            </div>
                          </div>

                          {/* Mobile Screen Scrollable Content */}
                          <div className="flex-grow overflow-y-auto p-4 bg-white">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-electric-blue mb-3">
                              <span className="bg-blue-50 border border-blue-200 text-blue-700 px-1 py-0.2 rounded">
                                {articleDripDay !== "" ? `Ngày ${articleDripDay}` : "Blog"}
                              </span>
                              <span>•</span>
                              <span className="text-obsidian/50">Vừa xong</span>
                            </div>
                            
                            <h1 className="text-xl font-extrabold text-obsidian tracking-tight leading-tight mb-4">
                              {articleTitle || "Tiêu đề bài viết..."}
                            </h1>

                            <div 
                              className="editor-content border-t border-obsidian/10 pt-4 text-sm"
                              style={{ padding: '0px', minHeight: 'unset' }}
                              dangerouslySetInnerHTML={{ __html: articleContent || "<p class='text-obsidian/40 italic'>Chưa có nội dung...</p>" }}
                            />
                          </div>

                          {/* iPhone Bottom Bar */}
                          <div className="bg-white py-2 flex justify-center items-center shrink-0 border-t border-obsidian/10">
                            <div className="w-24 h-1.5 bg-obsidian/30 rounded-full" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Image Modal */}
              {showImageModal && (
                <div className="fixed inset-0 bg-obsidian/50 flex items-center justify-center z-[160] p-4">
                  <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-6 max-w-sm w-full flex flex-col gap-4">
                    <h3 className="font-black text-lg flex items-center gap-1.5">
                      <ImageIcon className="w-5 h-5 text-electric-blue" />
                      Chèn hình ảnh vào bài viết
                    </h3>
                    
                    <div className="flex border-b border-obsidian">
                      <button
                        type="button"
                        onClick={() => setImageUploadMode("url")}
                        className={`flex-1 py-2 text-xs font-bold border-r border-obsidian ${imageUploadMode === "url" ? "bg-pale-slate" : "bg-white"}`}
                      >
                        Đường dẫn URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUploadMode("file")}
                        className={`flex-1 py-2 text-xs font-bold ${imageUploadMode === "file" ? "bg-pale-slate" : "bg-white"}`}
                      >
                        Tải tệp lên
                      </button>
                    </div>

                    {imageUploadMode === "url" ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-obsidian/60 uppercase">Đường dẫn ảnh (URL)</label>
                        <input
                          type="text"
                          placeholder="https://example.com/image.jpg"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-obsidian/60 uppercase">Chọn ảnh từ máy tính</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === "string") {
                                  setImageUrlInput(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-xs border border-dashed border-obsidian/40 rounded p-4 text-center cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="flex gap-3 justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => setShowImageModal(false)}
                        className="px-4 py-2 border border-obsidian rounded font-bold text-xs bg-white hover:bg-gray-100 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (imageUrlInput) {
                            executeCommand('insertImage', imageUrlInput);
                            setShowImageModal(false);
                          } else {
                            await customAlert("Vui lòng cung cấp hình ảnh.", "Thông báo");
                          }
                        }}
                        className="px-4 py-2 border border-obsidian rounded font-bold text-xs bg-obsidian text-white hover:bg-white hover:text-obsidian cursor-pointer"
                      >
                        Chèn ảnh
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Table Modal */}
              {showTableModal && (
                <div className="fixed inset-0 bg-obsidian/50 flex items-center justify-center z-[160] p-4">
                  <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-6 max-w-sm w-full flex flex-col gap-4">
                    <h3 className="font-black text-lg flex items-center gap-1.5">
                      <TableIcon className="w-5 h-5 text-electric-blue" />
                      Chèn bảng biểu mới
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-obsidian/60 uppercase">Số hàng</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={tableRowsInput}
                          onChange={(e) => setTableRowsInput(Number(e.target.value))}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-obsidian/60 uppercase">Số cột</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={tableColsInput}
                          onChange={(e) => setTableColsInput(Number(e.target.value))}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => setShowTableModal(false)}
                        className="px-4 py-2 border border-obsidian rounded font-bold text-xs bg-white hover:bg-gray-100 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          insertTable(tableRowsInput, tableColsInput);
                          setShowTableModal(false);
                        }}
                        className="px-4 py-2 border border-obsidian rounded font-bold text-xs bg-obsidian text-white hover:bg-white hover:text-obsidian cursor-pointer"
                      >
                        Chèn bảng
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: 7. WEB ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="border-b border-obsidian pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-black text-obsidian tracking-tight">Thống kê truy cập (Analytics)</h1>
                  <p className="text-xs text-obsidian/60 mt-1">Giám sát lưu lượng người dùng, nguồn truy cập, thiết bị và địa điểm địa lý thời gian thực.</p>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <select
                    value={analyticsDays}
                    onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                    className="bg-white rounded-card border border-obsidian px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value={7}>7 ngày qua</option>
                    <option value={30}>30 ngày qua</option>
                    <option value={90}>90 ngày qua</option>
                  </select>
                  
                  <button
                    onClick={exportAnalyticsToExcel}
                    disabled={!analyticsData || loadingAnalytics}
                    className="neo-pill neo-pill-primary py-2 px-3 flex items-center gap-1.5 cursor-pointer font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Xuất Excel
                  </button>

                  <button
                    onClick={sendPeriodicReportEmail}
                    disabled={sendingReport || loadingAnalytics}
                    className="px-3 py-2 border border-obsidian rounded font-bold text-xs bg-white hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {sendingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Gửi mail báo cáo
                  </button>
                </div>
              </div>

              {reportMessage && (
                <div className={`p-4 rounded-card border text-sm font-medium ${
                  reportMessage.includes("thành công") 
                    ? "bg-green-50 border-green-500 text-green-700" 
                    : "bg-red-50 border-red-500 text-red-700"
                }`}>
                  {reportMessage}
                </div>
              )}

              {/* Cấu hình báo cáo email định kỳ */}
              <div className="bg-white border-2 border-obsidian rounded-bento p-5 md:p-6 shadow-obsidian">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5 text-electric-blue" />
                  <h3 className="font-black text-sm uppercase text-obsidian tracking-tight">Cấu hình gửi báo cáo email định kỳ</h3>
                </div>

                <form onSubmit={handleSaveAnalyticsReportConfig} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-obsidian/75 mb-1.5">Email nhận báo cáo (To):</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@example.com"
                        value={reportTo}
                        onChange={(e) => setReportTo(e.target.value)}
                        className="w-full bg-white border border-obsidian rounded p-2 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-obsidian/75 mb-1.5">Đồng gửi email (Cc):</label>
                      <input
                        type="text"
                        placeholder="manager@example.com, boss@example.com"
                        value={reportCc}
                        onChange={(e) => setReportCc(e.target.value)}
                        className="w-full bg-white border border-obsidian rounded p-2 text-xs focus:outline-none"
                      />
                      <span className="text-[10px] text-obsidian/50 mt-1 block">Các email ngăn cách nhau bởi dấu phẩy.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-obsidian/75 mb-1.5">Tần suất gửi:</label>
                      <select
                        value={reportFrequency}
                        onChange={(e) => setReportFrequency(e.target.value as any)}
                        className="w-full bg-white border border-obsidian rounded p-2 text-xs focus:outline-none font-bold"
                      >
                        <option value="daily">Hàng ngày (Daily)</option>
                        <option value="3days">Mỗi 3 ngày (Every 3 Days)</option>
                        <option value="weekly">Hàng tuần (Weekly)</option>
                        <option value="monthly">Hàng tháng (Monthly)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={reportEnabled}
                          onChange={(e) => setReportEnabled(e.target.checked)}
                          className="w-4 h-4 text-electric-blue border-obsidian rounded focus:ring-0"
                        />
                        <span className="text-xs font-bold text-obsidian">Kích hoạt tự động gửi email báo cáo</span>
                      </label>
                    </div>
                  </div>

                  {reportConfigMessage && (
                    <div className={`p-3 rounded border text-xs font-medium ${
                      reportConfigMessage.includes("thành công") 
                        ? "bg-green-50 border-green-300 text-green-700" 
                        : "bg-red-50 border-red-300 text-red-700"
                    }`}>
                      {reportConfigMessage}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] text-obsidian/50 max-w-[75%]">
                      <strong>Lưu ý:</strong> Khi được kích hoạt, hệ thống sẽ tự động tổng hợp số liệu tương ứng (1 ngày, 7 ngày hoặc 30 ngày qua) và gửi đến các địa chỉ email trên thông qua API Cron.
                    </span>
                    <button
                      type="submit"
                      disabled={savingReportConfig}
                      className="px-4 py-2 bg-electric-blue hover:bg-electric-blue/90 text-white border border-obsidian rounded font-bold text-xs shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {savingReportConfig && <Loader2 className="w-3 h-3 animate-spin" />}
                      Lưu cấu hình
                    </button>
                  </div>
                </form>
              </div>

              {loadingAnalytics ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-obsidian rounded-bento shadow-obsidian">
                  <Loader2 className="w-10 h-10 animate-spin text-electric-blue" />
                  <p className="text-xs font-bold text-obsidian/60 mt-3">Đang phân tích dữ liệu truy cập...</p>
                </div>
              ) : analyticsError ? (
                <div className="p-8 text-center bg-red-50 border-2 border-red-500 rounded-bento text-red-700">
                  <p className="font-bold">Đã xảy ra lỗi khi tải thống kê</p>
                  <p className="text-xs mt-1">{analyticsError}</p>
                  <button 
                    onClick={() => loadAnalyticsData(analyticsDays)}
                    className="mt-4 px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 text-xs cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              ) : !analyticsData ? (
                <div className="p-12 text-center bg-white border-2 border-obsidian rounded-bento shadow-obsidian">
                  <p className="font-bold text-obsidian/60">Không có dữ liệu truy cập nào được ghi nhận.</p>
                  <p className="text-xs text-obsidian/40 mt-1">Đảm bảo bạn đã khởi tạo bảng analytics_logs trong database.</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Pageviews */}
                    <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black text-obsidian/40 uppercase tracking-wider">Tổng Lượt Xem (Views)</span>
                        <div className="text-2xl font-black text-obsidian mt-1">{analyticsData.summary.pageviews.value.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-1 mt-3">
                        <span className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                          analyticsData.summary.pageviews.growth >= 0 
                            ? "bg-green-50 text-green-700 border-green-500" 
                            : "bg-red-50 text-red-700 border-red-500"
                        }`}>
                          {analyticsData.summary.pageviews.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 inline mr-0.5 text-green-700" /> : <ArrowDownRight className="w-3.5 h-3.5 inline mr-0.5 text-red-700" />}
                          {Math.abs(analyticsData.summary.pageviews.growth)}%
                        </span>
                        <span className="text-[9px] text-obsidian/40 font-bold">so với kỳ trước</span>
                      </div>
                    </div>

                    {/* Card 2: Unique Visitors */}
                    <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black text-obsidian/40 uppercase tracking-wider">Khách độc bản (Visitors)</span>
                        <div className="text-2xl font-black text-obsidian mt-1">{analyticsData.summary.visitors.value.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-1 mt-3">
                        <span className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                          analyticsData.summary.visitors.growth >= 0 
                            ? "bg-green-50 text-green-700 border-green-500" 
                            : "bg-red-50 text-red-700 border-red-500"
                        }`}>
                          {analyticsData.summary.visitors.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 inline mr-0.5 text-green-700" /> : <ArrowDownRight className="w-3.5 h-3.5 inline mr-0.5 text-red-700" />}
                          {Math.abs(analyticsData.summary.visitors.growth)}%
                        </span>
                        <span className="text-[9px] text-obsidian/40 font-bold">so với kỳ trước</span>
                      </div>
                    </div>

                    {/* Card 3: Sessions */}
                    <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black text-obsidian/40 uppercase tracking-wider">Số phiên (Sessions)</span>
                        <div className="text-2xl font-black text-obsidian mt-1">{analyticsData.summary.sessions.value.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-1 mt-3">
                        <span className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                          analyticsData.summary.sessions.growth >= 0 
                            ? "bg-green-50 text-green-700 border-green-500" 
                            : "bg-red-50 text-red-700 border-red-500"
                        }`}>
                          {analyticsData.summary.sessions.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 inline mr-0.5 text-green-700" /> : <ArrowDownRight className="w-3.5 h-3.5 inline mr-0.5 text-red-700" />}
                          {Math.abs(analyticsData.summary.sessions.growth)}%
                        </span>
                        <span className="text-[9px] text-obsidian/40 font-bold">so với kỳ trước</span>
                      </div>
                    </div>

                    {/* Card 4: Views/Session */}
                    <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black text-obsidian/40 uppercase tracking-wider">Xem / Phiên (Avg)</span>
                        <div className="text-2xl font-black text-obsidian mt-1">{analyticsData.summary.viewsPerSession.value}</div>
                      </div>
                      <div className="flex items-center gap-1 mt-3">
                        <span className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                          analyticsData.summary.viewsPerSession.growth >= 0 
                            ? "bg-green-50 text-green-700 border-green-500" 
                            : "bg-red-50 text-red-700 border-red-500"
                        }`}>
                          {analyticsData.summary.viewsPerSession.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 inline mr-0.5 text-green-700" /> : <ArrowDownRight className="w-3.5 h-3.5 inline mr-0.5 text-red-700" />}
                          {Math.abs(analyticsData.summary.viewsPerSession.growth)}%
                        </span>
                        <span className="text-[9px] text-obsidian/40 font-bold">so với kỳ trước</span>
                      </div>
                    </div>
                  </div>

                  {/* Main Line Chart */}
                  <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-6">
                    <h3 className="text-xs font-black text-obsidian uppercase tracking-wider mb-4">Biểu đồ lượng truy cập hàng ngày</h3>
                    <div className="w-full h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fontWeight: "bold", fill: "#0f172a" }}
                            stroke="#0f172a"
                            strokeWidth={1.5}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fontWeight: "bold", fill: "#0f172a" }}
                            stroke="#0f172a"
                            strokeWidth={1.5}
                          />
                          <RechartsTooltip 
                            contentStyle={{ 
                              backgroundColor: "#ffffff", 
                              border: "2px solid #0f172a", 
                              borderRadius: "8px", 
                              boxShadow: "2px 2px 0px #0f172a",
                              fontFamily: "var(--font-be-vietnam)",
                              fontSize: "11px",
                              fontWeight: "bold"
                            }} 
                          />
                          <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: "10px" }} />
                          <Line 
                            name="Lượt xem trang (Pageviews)" 
                            type="monotone" 
                            dataKey="views" 
                            stroke="#2563eb" 
                            strokeWidth={3} 
                            activeDot={{ r: 6, stroke: "#0f172a", strokeWidth: 1.5 }} 
                            dot={{ r: 2 }}
                          />
                          <Line 
                            name="Khách truy cập (Visitors)" 
                            type="monotone" 
                            dataKey="visitors" 
                            stroke="#16a34a" 
                            strokeWidth={3} 
                            activeDot={{ r: 6, stroke: "#0f172a", strokeWidth: 1.5 }}
                            dot={{ r: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Bento Grid: Top Pages & Referrers */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Pages */}
                    <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-6 flex flex-col">
                      <h3 className="text-sm font-black text-obsidian uppercase tracking-wider mb-4 border-b border-obsidian pb-2">Top Trang Được Xem Nhiều Nhất</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-obsidian text-xs font-bold text-obsidian/60">
                              <th className="pb-2">Trang (Tiêu đề & URL)</th>
                              <th className="pb-2 text-right w-20">Lượt xem</th>
                              <th className="pb-2 text-right w-20">Khách</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {analyticsData.topPages.map((page: any, i: number) => (
                              <tr key={i} className="hover:bg-pale-slate/30">
                                <td className="py-2.5 pr-2 font-medium">
                                  <div className="text-obsidian font-bold truncate max-w-[250px] sm:max-w-md">{page.title}</div>
                                  <div className="text-[10px] text-obsidian/50 font-mono truncate max-w-[250px] sm:max-w-md">{page.url}</div>
                                </td>
                                <td className="py-2.5 text-right font-black text-electric-blue">{page.views.toLocaleString()}</td>
                                <td className="py-2.5 text-right font-semibold text-obsidian">{page.visitors.toLocaleString()}</td>
                              </tr>
                            ))}
                            {analyticsData.topPages.length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-4 text-center text-obsidian/40">Không có dữ liệu.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Referrers */}
                    <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-6 flex flex-col">
                      <h3 className="text-sm font-black text-obsidian uppercase tracking-wider mb-4 border-b border-obsidian pb-2">Nguồn Truy Cập (Referrers)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-obsidian text-xs font-bold text-obsidian/60">
                              <th className="pb-2">Nguồn</th>
                              <th className="pb-2 text-right w-24">Số lượt xem</th>
                              <th className="pb-2 text-right w-24">Tỷ lệ %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {analyticsData.topReferrers.map((ref: any, i: number) => {
                              const totalViews = analyticsData.summary.pageviews.value;
                              const percentage = totalViews > 0 ? ((ref.views / totalViews) * 100).toFixed(1) : "0";
                              return (
                                <tr key={i} className="hover:bg-pale-slate/30">
                                  <td className="py-2.5 font-bold text-obsidian">{ref.name}</td>
                                  <td className="py-2.5 text-right font-bold text-obsidian">{ref.views.toLocaleString()}</td>
                                  <td className="py-2.5 text-right font-black text-electric-blue">{percentage}%</td>
                                </tr>
                              );
                            })}
                            {analyticsData.topReferrers.length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-4 text-center text-obsidian/40">Không có dữ liệu.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Bento Grid 2: Tech Specs & Geographic Locations */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Devices */}
                    <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-6">
                      <h3 className="text-sm font-black text-obsidian uppercase tracking-wider mb-4 border-b border-obsidian pb-2 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-electric-blue" />
                        Thiết bị & Hệ điều hành
                      </h3>
                      
                      <div className="flex flex-col gap-4">
                        {/* Device bar breakdown */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold text-obsidian/60 uppercase">Phân bố thiết bị</span>
                          {analyticsData.devices.map((dev: any, i: number) => {
                            const total = analyticsData.devices.reduce((acc: number, curr: any) => acc + curr.value, 0);
                            const percent = total > 0 ? ((dev.value / total) * 100).toFixed(0) : "0";
                            return (
                              <div key={i} className="flex flex-col gap-1">
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="flex items-center gap-1">
                                    {dev.name === "Mobile" ? <Smartphone className="w-3.5 h-3.5" /> : dev.name === "Tablet" ? <Tablet className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                                    {dev.name}
                                  </span>
                                  <span>{percent}% ({dev.value.toLocaleString()})</span>
                                </div>
                                <div className="w-full bg-pale-slate h-2.5 rounded-full border border-obsidian overflow-hidden">
                                  <div 
                                    className="bg-electric-blue h-full transition-all duration-500" 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* OS list */}
                        <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-3">
                          <span className="text-[10px] font-bold text-obsidian/60 uppercase mb-1">Hệ điều hành</span>
                          {analyticsData.os.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs font-semibold py-0.5">
                              <span className="text-obsidian">{item.name}</span>
                              <span className="font-bold text-obsidian/60">{item.value.toLocaleString()} lượt</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Browsers */}
                    <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-6">
                      <h3 className="text-sm font-black text-obsidian uppercase tracking-wider mb-4 border-b border-obsidian pb-2 flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 text-electric-blue" />
                        Trình duyệt Web
                      </h3>
                      <div className="flex flex-col gap-3">
                        {analyticsData.browsers.map((browser: any, i: number) => {
                          const total = analyticsData.browsers.reduce((acc: number, curr: any) => acc + curr.value, 0);
                          const percent = total > 0 ? ((browser.value / total) * 100).toFixed(0) : "0";
                          return (
                            <div key={i} className="flex flex-col gap-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="font-bold text-obsidian">{browser.name}</span>
                                <span>{percent}% ({browser.value.toLocaleString()})</span>
                              </div>
                              <div className="w-full bg-pale-slate h-2 rounded-full border border-obsidian overflow-hidden">
                                <div 
                                  className="bg-electric-blue h-full" 
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {analyticsData.browsers.length === 0 && (
                          <div className="text-xs text-center text-obsidian/40 py-8">Không có dữ liệu.</div>
                        )}
                      </div>
                    </div>

                    {/* Geographic Locations */}
                    <div className="bg-white border-2 border-obsidian rounded-bento shadow-obsidian p-6">
                      <h3 className="text-sm font-black text-obsidian uppercase tracking-wider mb-4 border-b border-obsidian pb-2 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-electric-blue" />
                        Địa điểm Địa lý
                      </h3>
                      
                      <div className="flex flex-col gap-4">
                        {/* Top Countries */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-obsidian/60 uppercase mb-1">Top Quốc gia</span>
                          {analyticsData.countries.slice(0, 5).map((country: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs font-semibold py-0.5 border-b border-gray-50">
                              <span className="text-obsidian font-bold">{country.name}</span>
                              <span className="font-bold text-electric-blue">{country.value.toLocaleString()} lượt</span>
                            </div>
                          ))}
                        </div>

                        {/* Top Cities */}
                        <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-3">
                          <span className="text-[10px] font-bold text-obsidian/60 uppercase mb-1">Top Thành phố</span>
                          {analyticsData.cities.slice(0, 5).map((city: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs font-semibold py-0.5">
                              <span className="text-obsidian text-ellipsis overflow-hidden whitespace-nowrap max-w-[150px]">{city.name}</span>
                              <span className="font-bold text-obsidian/60">{city.value.toLocaleString()} lượt</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB CONTENT: 6. SYSTEM SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="border-b border-obsidian pb-3">
                <h1 className="text-2xl font-black text-obsidian tracking-tight">Cấu hình hệ thống</h1>
                <p className="text-xs text-obsidian/60 mt-1">Quản lý cài đặt chung, chế độ bảo trì và các tham số vận hành.</p>
              </div>

              {settingsMessage && (
                <div className={`p-4 rounded-card border text-sm font-medium ${
                  settingsMessage.includes("thành công") 
                    ? "bg-green-50 border-green-500 text-green-700" 
                    : "bg-red-50 border-red-500 text-red-600"
                }`}>
                  {settingsMessage}
                </div>
              )}

              <form onSubmit={handleSaveSystemSettings} className="bg-white rounded-bento border border-obsidian p-6 md:p-8 flex flex-col gap-6 shadow-obsidian">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Website Identity */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-obsidian flex items-center gap-2 border-b border-pale-slate pb-2">
                      <Compass className="w-5 h-5 text-electric-blue" />
                      Thông tin Website
                    </h3>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Tiêu đề Website (SEO Title)</label>
                      <input 
                        type="text"
                        value={systemSettings.siteTitle}
                        onChange={(e) => setSystemSettings({...systemSettings, siteTitle: e.target.value})}
                        className="bg-pale-slate rounded-card border border-obsidian px-4 py-3 text-sm focus:outline-none w-full"
                        placeholder="Visa Auto Tracking |..."
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-obsidian/60 uppercase tracking-wider">Mô tả Website (SEO Description)</label>
                      <textarea 
                        value={systemSettings.siteDescription}
                        onChange={(e) => setSystemSettings({...systemSettings, siteDescription: e.target.value})}
                        className="bg-pale-slate rounded-card border border-obsidian px-4 py-3 text-sm focus:outline-none w-full h-24 resize-none"
                        placeholder="Mô tả tóm tắt..."
                        required
                      />
                    </div>
                  </div>

                  {/* Right Column: Site Status Toggles */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-obsidian flex items-center gap-2 border-b border-pale-slate pb-2">
                      <ShieldAlert className="w-5 h-5 text-warning-amber" />
                      Chế độ &amp; Bảo mật
                    </h3>
                    
                    {/* Maintenance Mode Toggle */}
                    <div className="flex items-center justify-between p-3 bg-pale-slate rounded-card border border-obsidian/10">
                      <div>
                        <span className="text-sm font-bold text-obsidian block">Chế độ bảo trì</span>
                        <span className="text-[10px] text-obsidian/60">Chỉ Admin mới có thể truy cập hệ thống.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSystemSettings({...systemSettings, maintenanceMode: !systemSettings.maintenanceMode})}
                        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 border border-obsidian ${
                          systemSettings.maintenanceMode ? "bg-warning-amber" : "bg-gray-300"
                        }`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          systemSettings.maintenanceMode ? "translate-x-6" : "translate-x-0"
                        }`}></div>
                      </button>
                    </div>

                    {/* Guest Sandbox Toggle */}
                    <div className="flex items-center justify-between p-3 bg-pale-slate rounded-card border border-obsidian/10">
                      <div>
                        <span className="text-sm font-bold text-obsidian block">Sandbox cho khách vãng lai</span>
                        <span className="text-[10px] text-obsidian/60">Cho phép tra cứu nhanh không cần tài khoản.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSystemSettings({...systemSettings, allowGuestSandbox: !systemSettings.allowGuestSandbox})}
                        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 border border-obsidian ${
                          systemSettings.allowGuestSandbox ? "bg-electric-blue" : "bg-gray-300"
                        }`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          systemSettings.allowGuestSandbox ? "translate-x-6" : "translate-x-0"
                        }`}></div>
                      </button>
                    </div>

                    {/* Cloudflare Turnstile Site Key */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-obsidian/60 uppercase">Turnstile Site Key (Cloudflare)</label>
                      <input 
                        type="text"
                        value={systemSettings.turnstileSiteKey || ""}
                        onChange={(e) => setSystemSettings({...systemSettings, turnstileSiteKey: e.target.value})}
                        className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs focus:outline-none"
                        placeholder="1x00000000000000000000AA"
                      />
                    </div>

                    {/* Cloudflare Turnstile Secret Key */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-obsidian/60 uppercase">Turnstile Secret Key (Cloudflare)</label>
                      <input 
                        type="password"
                        value={systemSettings.turnstileSecretKey || ""}
                        onChange={(e) => setSystemSettings({...systemSettings, turnstileSecretKey: e.target.value})}
                        className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs focus:outline-none"
                        placeholder="••••••••••••••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-pale-slate">
                  {/* Left Column: Scraper & WAF Bypass */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-obsidian flex items-center gap-2 border-b border-pale-slate pb-2">
                      <Database className="w-5 h-5 text-electric-blue" />
                      Cấu hình Proxy &amp; Cào dữ liệu
                    </h3>

                    {/* ScraperAPI Key */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-obsidian/60 uppercase">ScraperAPI Key (Bypass Cloudflare WAF)</label>
                      <input 
                        type="password"
                        value={systemSettings.scraperApiKey || ""}
                        onChange={(e) => setSystemSettings({...systemSettings, scraperApiKey: e.target.value})}
                        className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs focus:outline-none"
                        placeholder="••••••••••••••••••••"
                      />
                    </div>

                    {/* Checkboxes: Premium & JS Render */}
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <div className="flex items-center justify-between p-2.5 bg-pale-slate rounded-card border border-obsidian/10">
                        <div>
                          <span className="text-xs font-bold text-obsidian block">Proxy Premium</span>
                          <span className="text-[9px] text-obsidian/60">Cần gói trả phí ScraperAPI.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({...systemSettings, scraperUsePremium: !systemSettings.scraperUsePremium})}
                          className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 border border-obsidian ${
                            systemSettings.scraperUsePremium ? "bg-electric-blue" : "bg-gray-300"
                          }`}
                        >
                          <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${
                            systemSettings.scraperUsePremium ? "translate-x-5" : "translate-x-0"
                          }`}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-pale-slate rounded-card border border-obsidian/10">
                        <div>
                          <span className="text-xs font-bold text-obsidian block">JS Rendering</span>
                          <span className="text-[9px] text-obsidian/60">Tải trang bằng trình duyệt ảo.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({...systemSettings, scraperUseRender: !systemSettings.scraperUseRender})}
                          className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 border border-obsidian ${
                            systemSettings.scraperUseRender ? "bg-electric-blue" : "bg-gray-300"
                          }`}
                        >
                          <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${
                            systemSettings.scraperUseRender ? "translate-x-5" : "translate-x-0"
                          }`}></div>
                        </button>
                      </div>
                    </div>

                    {/* Custom Scraper URL Template */}
                    <div className="flex flex-col gap-1.5 mt-1">
                      <label className="text-[10px] font-bold text-obsidian/60 uppercase">URL cào tùy chỉnh (ZenRows / Custom Proxy)</label>
                      <input 
                        type="text"
                        value={systemSettings.scraperUrlTemplate || ""}
                        onChange={(e) => setSystemSettings({...systemSettings, scraperUrlTemplate: e.target.value})}
                        className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs focus:outline-none font-mono"
                        placeholder="E.g. https://api.zenrows.com/v1/?apikey=KEY&url={url}&premium_proxy=true"
                      />
                      <span className="text-[9px] text-obsidian/50 leading-relaxed">
                        Nhập URL gọi API scraper tùy chỉnh của bạn. Bắt buộc phải có chuỗi <code>{`{url}`}</code> để hệ thống tự động chèn link của Bộ Ngoại giao Mỹ. Để trống nếu muốn dùng mặc định.
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Scheduling Rules */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-obsidian flex items-center gap-2 border-b border-pale-slate pb-2">
                      <RefreshCw className="w-5 h-5 text-warning-amber" />
                      Chu kỳ Cào dữ liệu (Adaptive Polling)
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-obsidian/60 uppercase">Chu kỳ thường (Giờ)</label>
                        <input 
                          type="number"
                          min={1}
                          max={720}
                          value={systemSettings.cronCheckIntervalNormal || 24}
                          onChange={(e) => setSystemSettings({...systemSettings, cronCheckIntervalNormal: Number(e.target.value)})}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-obsidian/60 uppercase">Chu kỳ cao điểm (Giờ)</label>
                        <input 
                          type="number"
                          min={1}
                          max={168}
                          value={systemSettings.cronCheckIntervalPeak || 6}
                          onChange={(e) => setSystemSettings({...systemSettings, cronCheckIntervalPeak: Number(e.target.value)})}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-obsidian/60 uppercase">Ngày bắt đầu cao điểm</label>
                        <input 
                          type="number"
                          min={1}
                          max={31}
                          value={systemSettings.cronPeakStartDay || 10}
                          onChange={(e) => setSystemSettings({...systemSettings, cronPeakStartDay: Number(e.target.value)})}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-obsidian/60 uppercase">Ngày kết thúc cao điểm</label>
                        <input 
                          type="number"
                          min={1}
                          max={31}
                          value={systemSettings.cronPeakEndDay || 20}
                          onChange={(e) => setSystemSettings({...systemSettings, cronPeakEndDay: Number(e.target.value)})}
                          className="bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-obsidian/60 leading-relaxed bg-pale-slate p-3 rounded-card border border-obsidian/5 mt-2">
                      💡 <strong>Quy luật hoạt động:</strong> Vào những ngày không nằm trong khoảng cao điểm (hoặc khi lịch Visa của tháng tiếp theo đã được cập nhật thành công), hệ thống sẽ kiểm tra mỗi <strong>{systemSettings.cronCheckIntervalNormal || 24} giờ</strong>. Trong đợt cao điểm (từ ngày <strong>{systemSettings.cronPeakStartDay || 10}</strong> đến ngày <strong>{systemSettings.cronPeakEndDay || 20}</strong> hàng tháng), hệ thống sẽ tăng tần suất quét lên mỗi <strong>{systemSettings.cronCheckIntervalPeak || 6} giờ</strong> để cập nhật nhanh nhất lịch vừa phát hành.
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-pale-slate">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="neo-pill neo-pill-primary text-sm px-6 py-2.5 flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50"
                  >
                    {savingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                    Lưu cấu hình hệ thống
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="border-b border-obsidian pb-3">
                <h1 className="text-2xl font-black text-obsidian tracking-tight">Cấu hình Bảo mật & Nhật ký hệ thống</h1>
                <p className="text-xs text-obsidian/60 mt-1">Giám sát các nỗ lực truy cập, ngăn chặn spam và quản lý danh sách IP đen (Blacklist).</p>
              </div>

              {/* Thống kê bảo mật */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-obsidian rounded-card p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-obsidian/55 uppercase tracking-wider">Tổng lượt truy cập Auth</span>
                  <span className="text-2xl font-black text-obsidian mt-2">{securityStats.totalAttempts}</span>
                </div>
                <div className="bg-white border border-obsidian rounded-card p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-obsidian/55 uppercase tracking-wider">Đăng nhập thành công</span>
                  <span className="text-2xl font-black text-emerald-600 mt-2">{securityStats.successAttempts}</span>
                </div>
                <div className="bg-white border border-obsidian rounded-card p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-obsidian/55 uppercase tracking-wider">Đăng nhập thất bại</span>
                  <span className="text-2xl font-black text-rose-600 mt-2">{securityStats.failedAttempts}</span>
                </div>
                <div className="bg-white border border-obsidian rounded-card p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-obsidian/55 uppercase tracking-wider">Đang bị khóa IP</span>
                  <span className="text-2xl font-black text-red-600 mt-2">{securityStats.activeBlockedCount}</span>
                </div>
              </div>

              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left side: Logs and Blacklist */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* IP Blacklist section */}
                  <div className="bg-white border border-obsidian rounded-card shadow-sm overflow-hidden">
                    <div className="border-b border-obsidian bg-pale-slate/30 p-4 flex justify-between items-center">
                      <div>
                        <h2 className="text-sm font-black text-obsidian uppercase tracking-wider">Danh sách IP bị chặn (Blacklist)</h2>
                        <p className="text-[10px] text-obsidian/60 mt-0.5">Các IP nằm trong danh sách này sẽ bị chặn truy cập từ Middleware.</p>
                      </div>
                      <button 
                        onClick={loadSecurityData}
                        disabled={securityLoading}
                        className="p-1.5 rounded-card border border-obsidian bg-white hover:bg-pale-slate text-obsidian transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${securityLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm">
                        <thead className="bg-pale-slate/50 border-b border-obsidian text-[10px] uppercase font-black text-obsidian/60 tracking-wider">
                          <tr>
                            <th className="p-3">Địa chỉ IP</th>
                            <th className="p-3">Lý do chặn</th>
                            <th className="p-3">Thời gian chặn</th>
                            <th className="p-3">Thời gian hết hạn</th>
                            <th className="p-3 text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pale-slate">
                          {ipBlacklist.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-obsidian/40 italic">
                                Chưa có IP nào bị chặn.
                              </td>
                            </tr>
                          ) : (
                            ipBlacklist.map((block: any) => {
                              const isExpired = block.expires_at && new Date(block.expires_at) < new Date();
                              return (
                                <tr key={block.ip} className={`hover:bg-pale-slate/20 ${isExpired ? "opacity-40" : ""}`}>
                                  <td className="p-3 font-bold text-obsidian">{block.ip}</td>
                                  <td className="p-3 text-obsidian/80">{block.reason}</td>
                                  <td className="p-3 text-obsidian/60 text-[11px]">
                                    {new Date(block.blocked_at).toLocaleString("vi-VN")}
                                  </td>
                                  <td className="p-3 text-[11px]">
                                    {block.expires_at ? (
                                      <span className={isExpired ? "text-rose-500 font-bold" : "text-amber-600 font-bold"}>
                                        {new Date(block.expires_at).toLocaleString("vi-VN")} {isExpired && "(Hết hạn)"}
                                      </span>
                                    ) : (
                                      <span className="text-red-600 font-black">Vĩnh viễn</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleUnblockIp(block.ip)}
                                      className="px-2.5 py-1 rounded-card border border-obsidian bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold text-[10px] transition-colors cursor-pointer"
                                    >
                                      Gỡ chặn
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Auth Attempts Logs section */}
                  <div className="bg-white border border-obsidian rounded-card shadow-sm overflow-hidden">
                    <div className="border-b border-obsidian bg-pale-slate/30 p-4">
                      <h2 className="text-sm font-black text-obsidian uppercase tracking-wider">Nhật ký truy cập bảo mật (Auth Logs)</h2>
                      <p className="text-[10px] text-obsidian/60 mt-0.5">Ghi nhận 150 nỗ lực đăng nhập/đăng ký gần nhất.</p>
                    </div>

                    <div className="overflow-x-auto max-h-[450px]">
                      <table className="w-full text-left text-xs md:text-sm">
                        <thead className="bg-pale-slate/50 border-b border-obsidian text-[10px] uppercase font-black text-obsidian/60 tracking-wider sticky top-0 z-10">
                          <tr>
                            <th className="p-3 bg-pale-slate">Thời gian</th>
                            <th className="p-3 bg-pale-slate">Email</th>
                            <th className="p-3 bg-pale-slate">Địa chỉ IP</th>
                            <th className="p-3 bg-pale-slate">Trạng thái</th>
                            <th className="p-3 bg-pale-slate">Thiết bị</th>
                            <th className="p-3 bg-pale-slate text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pale-slate">
                          {securityLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-obsidian/40 italic">
                                Không tìm thấy nhật ký truy cập nào.
                              </td>
                            </tr>
                          ) : (
                            securityLogs.map((log: any) => (
                              <tr key={log.id} className="hover:bg-pale-slate/20">
                                <td className="p-3 text-[11px] text-obsidian/60 whitespace-nowrap">
                                  {new Date(log.created_at).toLocaleString("vi-VN")}
                                </td>
                                <td className="p-3 font-medium text-obsidian">{log.email}</td>
                                <td className="p-3 font-bold text-obsidian/85">{log.ip}</td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    log.status === "success" 
                                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                      : "bg-rose-100 text-rose-700 border border-rose-300"
                                  }`}>
                                    {log.status === "success" ? "Thành công" : "Thất bại"}
                                  </span>
                                </td>
                                <td className="p-3 text-[10px] text-obsidian/50 max-w-[160px] truncate" title={log.user_agent}>
                                  {log.user_agent || "N/A"}
                                </td>
                                <td className="p-3 text-right">
                                  {/* Chỉ cho chặn các IP chưa bị chặn */}
                                  {!ipBlacklist.some((b: any) => b.ip === log.ip && (!b.expires_at || new Date(b.expires_at) > new Date())) ? (
                                    <button
                                      onClick={() => {
                                        setBlockIp(log.ip);
                                        setBlockReason(`Chặn IP phát hiện đăng nhập bất thường cho email ${log.email}`);
                                        setBlockDuration(30); // block 30m by default
                                      }}
                                      className="px-2.5 py-1 rounded-card border border-obsidian bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold text-[10px] transition-colors cursor-pointer"
                                    >
                                      Chặn IP
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-red-500 font-bold">Đã bị chặn</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Right side: Block IP Form */}
                <div className="bg-white border border-obsidian rounded-card shadow-sm p-5 space-y-4">
                  <h2 className="text-sm font-black text-obsidian uppercase tracking-wider border-b border-obsidian pb-2">Chặn IP thủ công</h2>
                  
                  {blockError && (
                    <div className="bg-rose-50 border border-rose-300 text-rose-700 px-3 py-2 rounded-card text-xs font-medium">
                      Lỗi: {blockError}
                    </div>
                  )}

                  <form onSubmit={handleBlockIp} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-obsidian">Địa chỉ IP cần chặn</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 140.245.123.123"
                        value={blockIp}
                        onChange={(e) => setBlockIp(e.target.value)}
                        className="w-full bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs md:text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-electric-blue"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-obsidian">Lý do chặn</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Nhập lý do chặn IP này..."
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        className="w-full bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs md:text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-electric-blue"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-obsidian">Thời hạn chặn</label>
                      <select
                        value={blockDuration}
                        onChange={(e) => setBlockDuration(parseInt(e.target.value))}
                        className="w-full bg-pale-slate rounded-card border border-obsidian px-3 py-2 text-xs font-bold text-obsidian focus:outline-none focus:ring-2 focus:ring-electric-blue cursor-pointer"
                      >
                        <option value={30}>Tạm thời 30 phút (Khuyên dùng cho mật khẩu)</option>
                        <option value={60}>Tạm thời 1 giờ</option>
                        <option value={1440}>Tạm thời 24 giờ</option>
                        <option value={10080}>Tạm thời 7 ngày</option>
                        <option value={0}>Chặn vĩnh viễn (Permanent)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={blockSubmitting}
                      className="w-full neo-pill neo-pill-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {blockSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Chặn IP ngay lập tức
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

        </main>

        {/* Custom alert and confirm modals */}
        {modalQueue && (
          <div className="fixed inset-0 bg-obsidian/60 backdrop-blur-md z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-bento border-2 border-obsidian shadow-obsidian max-w-md w-full p-6 flex flex-col gap-4 animate-in fade-in-50 zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full border-2 border-obsidian shrink-0 ${modalQueue.isWarning ? 'bg-red-100 text-red-600' : 'bg-electric-blue/10 text-electric-blue'}`}>
                  {modalQueue.isConfirm ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <Database className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-wider text-obsidian">{modalQueue.title}</h3>
                  <p className="text-xs text-obsidian/70 mt-1.5 whitespace-pre-wrap leading-relaxed">{modalQueue.message}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 mt-2 border-t border-pale-slate pt-4">
                {modalQueue.isConfirm && (
                  <button
                    type="button"
                    onClick={() => {
                      const resolveFn = modalQueue.resolve;
                      setModalQueue(null);
                      setTimeout(() => resolveFn(false), 0);
                    }}
                    className="px-4 py-2 text-xs font-bold border-2 border-obsidian rounded shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer bg-pale-slate/30 text-obsidian"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const resolveFn = modalQueue.resolve;
                    setModalQueue(null);
                    setTimeout(() => resolveFn(true), 0);
                  }}
                  className={`px-4 py-2 text-xs font-bold border-2 border-obsidian rounded shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer text-white ${modalQueue.isWarning ? 'bg-red-500 hover:bg-red-600' : 'bg-electric-blue hover:bg-electric-blue/90'}`}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
