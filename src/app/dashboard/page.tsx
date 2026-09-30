import { supabase } from "@/lib/supabase";
import DashboardClient from "./DashboardClient";

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

export const metadata = {
  title: "Bảng điều khiển thành viên | VisaTracker",
  description: "Quản lý hồ sơ theo dõi visa định cư Mỹ diện F1, F2A, F2B, F3, F4, cập nhật thông tin và tiến trình chi tiết.",
};

export default async function DashboardPage() {
  let bulletins = FALLBACK_BULLETINS;

  try {
    const { data, error } = await supabase
      .from("bulletins")
      .select("*")
      .order("month", { ascending: true });

    if (data && data.length > 0 && !error) {
      bulletins = data;
    }
  } catch (error) {
    console.error("Error fetching bulletins from database in Dashboard, using fallback data:", error);
  }

  return <DashboardClient initialBulletins={bulletins} />;
}
