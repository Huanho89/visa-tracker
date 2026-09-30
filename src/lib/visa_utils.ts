export interface BulletinInfo {
  category: string;
  filing_date: string;
  final_action_date: string;
}

export interface CaseInfo {
  priority_date: string;
  nvc_case?: string | null;
  invoice_id?: string | null;
  petitioner?: string | null;
  consulate?: string | null;
  category: string;
}

export interface TimelineStep {
  title: string;
  desc: string;
  status: "completed" | "active" | "pending";
  link?: string;
}

/**
 * Calculates immigration timeline steps dynamically based on case information and current bulletin dates.
 * Supports both sandbox (5 steps) and registered member dashboard (9 steps) timelines.
 */
export function calculateTimelineSteps(
  caseInfo: CaseInfo,
  bulletin: BulletinInfo | null,
  isSandbox: boolean = false
): TimelineStep[] {
  if (!caseInfo.priority_date || !bulletin) {
    // Return empty pending timeline
    const stepCount = isSandbox ? 5 : 9;
    return Array.from({ length: stepCount }, (_, i) => ({
      title: `Bước ${i + 1}`,
      desc: "Vui lòng nhập ngày ưu tiên để tính toán.",
      status: "pending"
    }));
  }

  const priorityDate = new Date(caseInfo.priority_date);
  const filingLimit = new Date(bulletin.filing_date);
  const finalActionLimit = new Date(bulletin.final_action_date);

  const isFilingCurrent = priorityDate <= filingLimit;
  const isFinalActionCurrent = priorityDate <= finalActionLimit;

  if (isSandbox) {
    return [
      { 
        title: "Sở Di Trú Chấp Thuận (USCIS Approved)", 
        desc: "Hồ sơ đã được duyệt tại Sở di trú Hoa Kỳ.", 
        status: "completed" 
      },
      { 
        title: "NVC Tiếp Nhận (NVC Stage)", 
        desc: "NVC đã nhận hồ sơ và sẵn sàng cấp mã hồ sơ.", 
        status: "completed" 
      },
      { 
        title: isFilingCurrent ? "Ngày nộp đơn đã đến hạn (Dates for Filing Current)" : "Ngày nộp đơn chưa đến hạn (Dates for Filing)", 
        desc: `Đang xét tới ${filingLimit.toLocaleDateString("vi-VN")}. Ngày ưu tiên: ${priorityDate.toLocaleDateString("vi-VN")}`, 
        status: isFilingCurrent ? "active" : "pending" 
      },
      { 
        title: isFinalActionCurrent ? "Ngày phỏng vấn đã đến hạn (Final Action Date Current)" : "Ngày phỏng vấn chưa đến hạn (Final Action Date)", 
        desc: `Đang xét tới ${finalActionLimit.toLocaleDateString("vi-VN")}. Ngày ưu tiên: ${priorityDate.toLocaleDateString("vi-VN")}`, 
        status: isFinalActionCurrent ? "completed" : "pending" 
      },
      { 
        title: "Phỏng Vấn & Cấp Visa (Visa Issued)", 
        desc: isFinalActionCurrent ? "Đã sẵn sàng xếp lịch phỏng vấn chính thức." : "Chờ lịch phỏng vấn tiến triển.", 
        status: isFinalActionCurrent ? "active" : "pending" 
      }
    ];
  }

  // Dashboard 9 Steps
  const hasNvcCase = !!caseInfo.nvc_case;
  const hasInvoiceId = !!caseInfo.invoice_id;
  const hasPetitioner = !!caseInfo.petitioner;

  let activeIndex = 0;
  if (!hasNvcCase) {
    activeIndex = 1; // Needs NVC Case Number (Step 2 active)
  } else if (!isFilingCurrent) {
    activeIndex = 2; // Waiting for Filing Date (Step 3 active)
  } else if (!hasInvoiceId) {
    activeIndex = 3; // Needs Invoice ID to pay fee (Step 4 active)
  } else if (!hasPetitioner) {
    activeIndex = 4; // Needs Petitioner/civil info (Step 5 active)
  } else if (!isFinalActionCurrent) {
    activeIndex = 6; // Waiting for Final Action Date (Step 7 active)
  } else {
    activeIndex = 7; // Interview Scheduled / Ready (Step 8 active)
  }

  return [
    { 
      title: "1. USCIS Approved (Sở Di Trú Mỹ nhận hồ sơ)", 
      desc: "Hồ sơ đã được duyệt tại Sở di trú Mỹ và chuyển qua NVC.", 
      status: activeIndex > 0 ? "completed" : "active" 
    },
    { 
      title: "2. NVC Received (NVC tiếp nhận và cấp Case Number)", 
      desc: hasNvcCase ? `Mã hồ sơ: ${caseInfo.nvc_case}` : "Đang chờ NVC tiếp nhận và cấp mã hồ sơ gửi về email.", 
      status: activeIndex > 1 ? "completed" : activeIndex === 1 ? "active" : "pending" 
    },
    { 
      title: "3. Filing Date Current (Ngày nộp hồ sơ đến hạn)", 
      desc: isFilingCurrent ? `Lịch mở nộp: ${filingLimit.toLocaleDateString("vi-VN")} (Đến hạn!)` : `Lịch mở nộp đang xét tới ${filingLimit.toLocaleDateString("vi-VN")}. Cần chờ thêm.`, 
      status: activeIndex > 2 ? "completed" : activeIndex === 2 ? "active" : "pending" 
    },
    { 
      title: "4. Pay IV Fee (Đóng phí visa và phí bảo trợ tài chính)", 
      desc: hasInvoiceId ? `Mã Invoice ID: ${caseInfo.invoice_id}. Đã đóng phí.` : "Truy cập cổng CEAC để đóng phí IV Fee ($325) và AOS Fee ($120).", 
      status: activeIndex > 3 ? "completed" : activeIndex === 3 ? "active" : "pending",
      link: "https://ceac.state.gov/"
    },
    { 
      title: "5. Submit DS-260 & Civil Documents (Điền đơn DS-260 & Nộp hồ sơ dân sự)", 
      desc: hasPetitioner ? `Người bảo lãnh: ${caseInfo.petitioner}. Đã chuẩn bị tài liệu dân sự.` : "Điền đơn trực tuyến DS-260 và tải các giấy tờ dân sự (Giấy khai sinh, Lý lịch tư pháp số 2) lên CEAC.", 
      status: activeIndex > 4 ? "completed" : activeIndex === 4 ? "active" : "pending",
      link: "https://drive.google.com/file/d/1PhRPbcVBq3-RHymuQLd5OEq4iQaT-1gL/view?usp=sharing"
    },
    { 
      title: "6. Documentarily Qualified - DQ (NVC xác nhận hoàn thành hồ sơ)", 
      desc: hasPetitioner ? "NVC duyệt toàn bộ hồ sơ hợp lệ. Đang chờ ngày phỏng vấn." : "Chờ NVC kiểm duyệt hồ sơ và gửi email thông báo hoàn thành (DQ).", 
      status: activeIndex > 5 ? "completed" : activeIndex === 5 ? "active" : "pending" 
    },
    { 
      title: "7. Final Action Date Current (Ngày hành động cuối đến hạn)", 
      desc: isFinalActionCurrent ? `Lịch phỏng vấn: ${finalActionLimit.toLocaleDateString("vi-VN")} (Đến hạn!)` : `Lịch phỏng vấn đang xét tới ${finalActionLimit.toLocaleDateString("vi-VN")}. Cần chờ phỏng vấn.`, 
      status: activeIndex > 6 ? "completed" : activeIndex === 6 ? "active" : "pending" 
    },
    { 
      title: "8. Interview Scheduled (Nhận thư mời phỏng vấn & Khám sức khỏe)", 
      desc: isFinalActionCurrent ? `Địa điểm: ${caseInfo.consulate || "Lãnh sự quán Mỹ tại TP.HCM"}. Hãy đi khám sức khỏe.` : "Chờ nhận thư mời phỏng vấn (IL) chính thức gửi về hòm thư.", 
      status: activeIndex > 7 ? "completed" : activeIndex === 7 ? "active" : "pending" 
    },
    { 
      title: "9. Visa Issued (Phỏng vấn thành công & Cấp Visa)", 
      desc: "Phỏng vấn thành công, visa được cấp và dán vào hộ chiếu.", 
      status: activeIndex > 8 ? "completed" : "pending" 
    }
  ];
}
