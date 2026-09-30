---
page: index
---
A landing page for a US Visa Tracking application in a Playful Neo-Brutalist Editorial style. The design uses a clean light gray background, high corner rounding, thin dark borders, and large typography using Be Vietnam Pro. All English technical terms and abbreviations have clear Vietnamese translations and annotations.

**DESIGN SYSTEM (REQUIRED):**
- Canvas Background: Pale Slate Gray (#f2f2f3)
- Typography: Be Vietnam Pro (geometric sans-serif with perfect Vietnamese support) for headings and body text. JetBrains Mono for dates and numbers.
- Card containers: Pure White (#ffffff) with `border: 1px solid #18181b; border-radius: 2rem;`
- Accent buttons: Solid Obsidian Black (#0c0c0d) pills with white text, or White pills with black borders.
- Key Accent Colors: Success Mint (#10b981) for completed states, Electric Blue (#3b82f6) for active highlights.
- Playful Elements: Subtle asterisk symbols (`*`) and stars used as decorative spacing markers.
- Inline pill outlines: Words like "(Theo dõi)" và "(tự động)" are wrapped in outline pills.

**PAGE STRUCTURE:**
1. **Header / Navigation:**
   - Left: Logo text "VisaTracker" in Be Vietnam Pro Bold, with a small US flag badge.
   - Center: Minimal navigation links: "Hướng dẫn", "Visa Bulletin", "Về chúng tôi".
   - Right: Pill button: "Đăng nhập →" (White background, thin border, black text).

2. **Centered Hero Section:**
   - Centered large, bold headline (Be Vietnam Pro, 56px): "Kiểm tra & (Theo dõi) Hồ sơ Định cư Mỹ (tự động) của bạn" (the words "Theo dõi" and "tự động" are wrapped in outline pills).
   - Below headline: Subtext (Zinc-500, 16px): "Hỗ trợ tracking trực quan, tự động quét Visa Bulletin hàng tháng và gửi thông báo trực tiếp qua Email."
   - Floating asterisk decorative characters (`*`) placed asymmetrically around the hero block.
   - Core CTA button: A large black pill button: "Bắt đầu tra cứu →" (Obsidian Black background, white text).

3. **Three Vietnamese-themed Illustration Cards (Visual highlights with translations):**
   - A row of 3 vertical cards. Each card has a solid Obsidian Black (#0c0c0d) background with rounded corners (1.5rem). Inside each card is a clean, colorful vector illustration representing a stage with Vietnamese characters and clear stage-related objects:
     - **Card 1: Sở Di Trú Chấp Thuận (USCIS Approved)**
       - Subtitle: "Hồ sơ được thông qua tại Mỹ"
       - Illustration: A Vietnamese family looking at a giant document containing a green checkmark and an official government seal stamp (USCIS Approval visual).
     - **Card 2: NVC Tiếp Nhận (NVC Stage)**
       - Subtitle: "Cấp số Case Number & Invoice ID"
       - Illustration: A character sorting files and stamping envelopes labeled "Case Number" and "Invoice ID", with the Bitexco tower skyline in the background.
     - **Card 3: Phỏng Vấn & Cấp Visa (Visa Issued)**
       - Subtitle: "Nhận visa định cư Mỹ"
       - Illustration: A happy character wearing a conical hat holding a passport with a visa stamp and a flight ticket, pointing at a flight path to a USA map.

4. **Section: Bảng Trạng Thái Visa Bulletin Mới Nhất (Tháng 7/2026):**
   - A Card titled "Bảng trạng thái Visa Bulletin mới nhất"
   - Subtitle: "Cập nhật ngày 15/06/2026 (Lịch công bố định kỳ từ ngày 10-20 hàng tháng)"
   - Inside, a clean horizontal table showing processing milestones for family categories (bilingual annotations):
     - Header Row: Diện bảo lãnh | Ý nghĩa các diện | Ngày hành động cuối (Final Action Date) | Ngày nộp hồ sơ (Dates for Filing)
     - F1 | Cha mẹ bảo lãnh con độc thân trên 21 tuổi | 22/10/2015 | 01/09/2017
     - F2A | Bảo lãnh vợ/chồng & con dưới 21 tuổi | 15/06/2020 | 01/09/2023
     - F2B | Thường trú nhân bảo lãnh con độc thân > 21 tuổi | 22/09/2017 | 08/06/2018
     - F3 | Bảo lãnh con đã kết hôn | 08/04/2010 | 01/03/2012
     - F4 | Bảo lãnh anh chị em | 08/06/2007 | 01/03/2008
   - Highlight: The F2B row has a subtle Success Mint (#10b981) background tint.

5. **Main Functionality Container (Large white rounded box with border):**
   - Title: "Bảng tra cứu & Lưu trữ hồ sơ".
   - Split Layout:
     - **Left Side: Tra cứu Sandbox (Nhập thông tin)**
       - A card with a clean form: Select Diện bảo lãnh (Visa Category), Ngày ưu tiên (Priority Date) picker (populated with 20-11-2017), Quốc gia bảo lãnh (Chargeability Area).
       - Action Button: Solid black pill button: "Kiểm tra hồ sơ →".
     - **Right Side: Lưu trữ & Nhận thông báo tự động (Google Login)**
       - A card explaining the member benefits: "Tự động nhận thông báo qua email định kỳ", "Theo dõi chi tiết 9 bước hồ sơ định cư".
       - Primary Button: A large white pill button with a black border: "**[G] Đăng nhập bằng Google →**" with Google logo.

6. **Sandbox Results Preview (Bilingual timeline & trend chart):**
   - Displays a progress tracker: 
     - 1. Sở Di Trú chấp thuận (USCIS Approved) -> Completed
     - 2. NVC nhận hồ sơ (NVC Received) -> Completed
     - 3. Ngày nộp đơn đã đến hạn (Filing Date Current) -> Current!
     - 4. Đóng phí Visa (Pay IV Fee) -> Active
     - 5. Nộp đơn DS-260 & Hồ sơ (Submit DS-260) -> Pending
     - 6. Ngày phỏng vấn đã đến hạn (Final Action Current) -> Pending
     - 7. Hồ sơ hoàn tất tại NVC (DQ - Documentarily Qualified) -> Pending
     - 8. Phỏng vấn Lãnh sự quán (Interview) -> Pending
     - 9. Cấp Visa định cư 🇺🇸 (Visa Issued) -> Pending
   - Historical trend chart card with horizontal bars: "Lịch sử dịch chuyển Ngày Hành Động Cuối (Final Action Date) của diện F2B".

7. **Footer:**
   - Clean footer lines with copyright "VisaTracker © 2026", credits "Created by Antigravity", and travel.state.gov disclaimer.
