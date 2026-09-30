import { supabase } from "@/lib/supabase";
import HomeClient from "./HomeClient";

// Fallback mock bulletins to ensure the page works even if Supabase is not connected
const FALLBACK_BULLETINS = [
  // Month: 05/2026
  { id: "f1-05", month: "05/2026", category: "F1", chargeability: "All Areas", final_action_date: "2015-10-01", filing_date: "2017-08-01" },
  { id: "f2a-05", month: "05/2026", category: "F2A", chargeability: "All Areas", final_action_date: "2020-05-15", filing_date: "2023-08-15" },
  { id: "f2b-05", month: "05/2026", category: "F2B", chargeability: "All Areas", final_action_date: "2017-08-15", filing_date: "2018-05-01" },
  { id: "f3-05", month: "05/2026", category: "F3", chargeability: "All Areas", final_action_date: "2010-03-01", filing_date: "2011-12-15" },
  { id: "f4-05", month: "05/2026", category: "F4", chargeability: "All Areas", final_action_date: "2007-05-01", filing_date: "2008-01-15" },

  // Month: 06/2026
  { id: "f1-06", month: "06/2026", category: "F1", chargeability: "All Areas", final_action_date: "2015-10-15", filing_date: "2017-08-15" },
  { id: "f2a-06", month: "06/2026", category: "F2A", chargeability: "All Areas", final_action_date: "2020-06-01", filing_date: "2023-09-01" },
  { id: "f2b-06", month: "06/2026", category: "F2B", chargeability: "All Areas", final_action_date: "2017-09-01", filing_date: "2018-05-20" },
  { id: "f3-06", month: "06/2026", category: "F3", chargeability: "All Areas", final_action_date: "2010-03-22", filing_date: "2012-01-01" },
  { id: "f4-06", month: "06/2026", category: "F4", chargeability: "All Areas", final_action_date: "2007-05-22", filing_date: "2008-02-01" },

  // Month: 07/2026
  { id: "f1-07", month: "07/2026", category: "F1", chargeability: "All Areas", final_action_date: "2015-10-22", filing_date: "2017-09-01" },
  { id: "f2a-07", month: "07/2026", category: "F2A", chargeability: "All Areas", final_action_date: "2020-06-15", filing_date: "2023-09-01" },
  { id: "f2b-07", month: "07/2026", category: "F2B", chargeability: "All Areas", final_action_date: "2017-09-22", filing_date: "2018-06-08" },
  { id: "f3-07", month: "07/2026", category: "F3", chargeability: "All Areas", final_action_date: "2010-04-08", filing_date: "2012-03-01" },
  { id: "f4-07", month: "07/2026", category: "F4", chargeability: "All Areas", final_action_date: "2007-06-08", filing_date: "2008-03-01" },

  // Month: 08/2026 (Latest Month)
  { id: "f1-08", month: "08/2026", category: "F1", chargeability: "All Areas", final_action_date: "2018-12-15", filing_date: "2019-06-15" },
  { id: "f2a-08", month: "08/2026", category: "F2A", chargeability: "All Areas", final_action_date: "2026-07-22", filing_date: "9999-12-31" },
  { id: "f2b-08", month: "08/2026", category: "F2B", chargeability: "All Areas", final_action_date: "2018-01-01", filing_date: "2019-01-01" },
  { id: "f3-08", month: "08/2026", category: "F3", chargeability: "All Areas", final_action_date: "2012-05-15", filing_date: "2013-03-01" },
  { id: "f4-08", month: "08/2026", category: "F4", chargeability: "All Areas", final_action_date: "2009-09-01", filing_date: "2010-06-22" },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  let bulletins = FALLBACK_BULLETINS;
  let articles = [
    {
      id: "art-1",
      title: "Quy trình làm hồ sơ định cư Mỹ từ A-Z: Phân biệt USCIS là gì, NVC là gì và Lãnh sự quán",
      slug: "ban-do-vo-long-dinh-cu-my-phan-biet-uscis-nvc-va-lanh-su-quan",
      drip_day: 0,
      created_at: "2026-07-22"
    },
    {
      id: "art-2",
      title: "Hướng dẫn cách xem Lịch Visa Bulletin & Ngày ưu tiên là gì chuẩn xác nhất",
      slug: "huong-dan-doc-lich-visa",
      drip_day: 7,
      created_at: "2026-07-22"
    },
    {
      id: "art-3",
      title: "Hướng dẫn chuẩn bị hồ sơ NVC từ 6 tháng trước khi mở: Tránh lỗi bổ sung giấy tờ (RFE)",
      slug: "chuan-bi-ho-so-bao-tro-tai-chinh-nvc-dan-su",
      drip_day: 14,
      created_at: "2026-07-22"
    }
  ];

  try {
    const { data, error } = await supabase
      .from("bulletins")
      .select("*")
      .order("month", { ascending: true });

    if (data && data.length > 0 && !error) {
      bulletins = data;
    }
  } catch (error) {
    console.error("Error fetching bulletins from database, using fallback data:", error);
  }

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug, drip_day, created_at")
      .order("drip_day", { ascending: true, nullsFirst: false })
      .limit(3);

    if (data && data.length > 0 && !error) {
      articles = data;
    }
  } catch (error) {
    console.error("Error fetching articles from database, using fallback data:", error);
  }

  return <HomeClient initialBulletins={bulletins} initialArticles={articles} />;
}
