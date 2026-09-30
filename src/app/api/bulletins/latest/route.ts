import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// Fallback bulletin data (same as page.tsx)
const FALLBACK_BULLETINS = [
  { id: "f1-07", month: "07/2026", category: "F1", chargeability: "All Areas", final_action_date: "2015-10-22", filing_date: "2017-09-01" },
  { id: "f2a-07", month: "07/2026", category: "F2A", chargeability: "All Areas", final_action_date: "2020-06-15", filing_date: "2023-09-01" },
  { id: "f2b-07", month: "07/2026", category: "F2B", chargeability: "All Areas", final_action_date: "2017-09-22", filing_date: "2018-06-08" },
  { id: "f3-07", month: "07/2026", category: "F3", chargeability: "All Areas", final_action_date: "2010-04-08", filing_date: "2012-03-01" },
  { id: "f4-07", month: "07/2026", category: "F4", chargeability: "All Areas", final_action_date: "2007-06-08", filing_date: "2008-03-01" },
];


// Simple in-memory IP rate limiter for edge/serverless instances
const ipCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const now = Date.now();
  
  // Cleanup cache to prevent memory leak
  if (ipCache.size > 1000) {
    for (const [key, val] of ipCache.entries()) {
      if (now > val.resetTime) ipCache.delete(key);
    }
  }

  const rateLimitInfo = ipCache.get(ip);
  if (rateLimitInfo) {
    if (now > rateLimitInfo.resetTime) {
      ipCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else {
      rateLimitInfo.count++;
      if (rateLimitInfo.count > MAX_REQUESTS) {
        return Response.json(
          { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút." },
          { 
            status: 429,
            headers: {
              "Retry-After": Math.ceil((rateLimitInfo.resetTime - now) / 1000).toString()
            }
          }
        );
      }
    }
  } else {
    ipCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }

  try {
    // Fetch all bulletin months
    const { data: allRecords, error: monthError } = await supabase
      .from("bulletins")
      .select("month");

    if (monthError || !allRecords || allRecords.length === 0) {
      return Response.json({ bulletins: FALLBACK_BULLETINS, source: "fallback" });
    }

    // Find the latest month chronologically
    const uniqueMonths = [...new Set(allRecords.map(b => b.month))];
    const latestMonth = uniqueMonths.sort((a, b) => {
      const [mA, yA] = a.split("/").map(Number);
      const [mB, yB] = b.split("/").map(Number);
      return (yB * 12 + mB) - (yA * 12 + mA);
    })[0];

    // Fetch all bulletins for that month
    const { data, error } = await supabase
      .from("bulletins")
      .select("*")
      .eq("month", latestMonth);

    if (error || !data || data.length === 0) {
      return Response.json({ bulletins: FALLBACK_BULLETINS, source: "fallback" });
    }

    return Response.json({ bulletins: data, source: "database", month: latestMonth });
  } catch {
    return Response.json({ bulletins: FALLBACK_BULLETINS, source: "fallback" });
  }
}

export const dynamic = "force-dynamic";
