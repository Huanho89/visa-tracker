import { supabase } from "@/lib/supabase";
import AdminClient from "./AdminClient";

const FALLBACK_ARTICLES = [
  {
    id: "art-1",
    title: "Quy trình làm hồ sơ định cư Mỹ từ A-Z: Phân biệt USCIS là gì, NVC là gì và Lãnh sự quán",
    slug: "ban-do-vo-long-dinh-cu-my-phan-biet-uscis-nvc-va-lanh-su-quan",
    content: "",
    drip_day: 0
  },
  {
    id: "art-2",
    title: "Hướng dẫn cách xem Lịch Visa Bulletin & Ngày ưu tiên là gì chuẩn xác nhất",
    slug: "huong-dan-doc-lich-visa",
    content: "",
    drip_day: 7
  },
  {
    id: "art-3",
    title: "Hướng dẫn chuẩn bị hồ sơ NVC từ 6 tháng trước khi mở: Tránh lỗi bổ sung giấy tờ (RFE)",
    slug: "chuan-bi-ho-so-bao-tro-tai-chinh-nvc-dan-su",
    content: "",
    drip_day: 14
  }
];

export const metadata = {
  title: "Quản trị hệ thống | VisaTracker",
  description: "Trang dành riêng cho Quản trị viên hệ thống VisaTracker.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let articles = FALLBACK_ARTICLES;

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug, content, drip_day")
      .order("drip_day", { ascending: true, nullsFirst: false });

    if (data && data.length > 0 && !error) {
      articles = data;
    }
  } catch (error) {
    console.error("Error fetching articles in Admin Page, using fallback data:", error);
  }

  return <AdminClient initialArticles={articles} />;
}
