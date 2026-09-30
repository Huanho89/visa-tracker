-- ==========================================
-- MOCK DATA - US Visa Tracker App
-- ==========================================

-- 1. Insert Mock Visa Bulletin Data for recent months
-- Month: 05/2026
INSERT INTO public.bulletins (month, category, chargeability, final_action_date, filing_date) VALUES
('05/2026', 'F1', 'All Areas', '2015-10-01', '2017-08-01'),
('05/2026', 'F2A', 'All Areas', '2020-05-15', '2023-08-15'),
('05/2026', 'F2B', 'All Areas', '2017-08-15', '2018-05-01'),
('05/2026', 'F3', 'All Areas', '2010-03-01', '2011-12-15'),
('05/2026', 'F4', 'All Areas', '2007-05-01', '2008-01-15');

-- Month: 06/2026
INSERT INTO public.bulletins (month, category, chargeability, final_action_date, filing_date) VALUES
('06/2026', 'F1', 'All Areas', '2015-10-15', '2017-08-15'),
('06/2026', 'F2A', 'All Areas', '2020-06-01', '2023-09-01'),
('06/2026', 'F2B', 'All Areas', '2017-09-01', '2018-05-20'),
('06/2026', 'F3', 'All Areas', '2010-03-22', '2012-01-01'),
('06/2026', 'F4', 'All Areas', '2007-05-22', '2008-02-01');

-- Month: 07/2026 (Latest Month)
INSERT INTO public.bulletins (month, category, chargeability, final_action_date, filing_date) VALUES
('07/2026', 'F1', 'All Areas', '2015-10-22', '2017-09-01'),
('07/2026', 'F2A', 'All Areas', '2020-06-15', '2023-09-01'),
('07/2026', 'F2B', 'All Areas', '2017-09-22', '2018-06-08'),
('07/2026', 'F3', 'All Areas', '2010-04-08', '2012-03-01'),
('07/2026', 'F4', 'All Areas', '2007-06-08', '2008-03-01');


-- 2. Insert Guide Articles (Drip Campaigns and Normal Blog Posts)
INSERT INTO public.articles (title, slug, content, drip_day) VALUES
(
  'Hướng dẫn đóng phí Visa định cư (IV Fee - Phí Visa) qua cổng CEAC',
  'huong-dan-dong-phi-visa-dinh-cu-ceac',
  '# Hướng dẫn đóng phí Visa định cư qua cổng CEAC

Để bắt đầu tiến trình xử lý hồ sơ tại Trung tâm Thị thực Quốc gia (NVC), đương đơn cần hoàn thành việc đóng phí. Dưới đây là các bước chi tiết:

## Bước 1: Đăng nhập hệ thống CEAC
- Truy cập cổng thông tin [CEAC](https://ceac.state.gov/)
- Nhập **Case Number** (Số hồ sơ) do NVC cấp.
- Nhập **Invoice ID Number** để xác nhận danh tính.

## Bước 2: Kiểm tra các khoản phí cần đóng
- **AOS Fee (Phí bảo trợ tài chính)**: Thường dành cho người bảo lãnh chính ($120).
- **IV Fee (Phí Visa định cư)**: Cho từng đương đơn đi kèm ($325 mỗi người).

## Bước 3: Thực hiện thanh toán trực tuyến
- Sử dụng tài khoản ngân hàng tại Mỹ (Checking account) có số Routing Number và Account Number hợp lệ để thực hiện thanh toán trực tuyến (không chấp nhận thẻ tín dụng quốc tế thông thường).
- Thời gian xử lý giao dịch thường mất từ 2-3 ngày làm việc để trạng thái chuyển sang **PAID** (Đã đóng phí).

> **Lưu ý quan trọng**: Đừng tiến hành điền đơn DS-260 cho đến khi hệ thống hiển thị trạng thái phí đã được thanh toán hoàn tất (PAID).',
  0
),
(
  'Cách điền đơn DS-260 trực tuyến chuẩn xác từ A-Z',
  'huong-dan-dien-don-ds-260-chuan-xac',
  '# Hướng dẫn điền đơn DS-260 trực tuyến chuẩn xác

Đơn DS-260 là tờ khai xin thị thực định cư bắt buộc đối với tất cả đương đơn muốn di trú sang Mỹ. Dưới đây là các lưu ý quan trọng để tránh sai sót:

## 1. Chuẩn bị thông tin trước khi điền
- Thông tin hộ chiếu (còn hạn trên 6 tháng).
- Lịch sử cư trú của tất cả các nơi đã ở trên 6 tháng kể từ năm 16 tuổi.
- Lịch sử việc làm, học tập trong 10 năm gần nhất.
- Địa chỉ dự kiến sẽ sinh sống tại Mỹ và thông tin người liên hệ.

## 2. Các phần nội dung chính trong đơn
- **Personal Information**: Họ tên trùng khớp với hộ chiếu và giấy khai sinh (chú ý thứ tự tên đệm).
- **Travel Information**: Chi tiết các chuyến đi Mỹ trước đây (nếu có).
- **Work/Education/Training**: Khai báo trung thực, chi tiết và không được ngắt quãng thời gian quá lâu.
- **Petitioner Information**: Khai báo chính xác thông tin người bảo lãnh chính tại Mỹ.

## 3. Review và Ký nộp (Sign and Submit)
- Kiểm tra lại toàn bộ thông tin một cách kỹ lưỡng. Sai sót sau khi nộp sẽ rất khó sửa và có thể làm chậm hồ sơ tại thời điểm phỏng vấn.
- Ký tên điện tử bằng cách nhập lại Số hồ sơ (Case Number).',
  7
),
(
  'Chuẩn bị bộ hồ sơ bảo trợ tài chính I-864 và hồ sơ dân sự (Civil Documents)',
  'chuan-bi-ho-so-bao-tro-tai-chinh-i-864-va-dan-su',
  '# Chuẩn bị hồ sơ bảo trợ tài chính I-864 và hồ sơ dân sự

Sau khi đóng phí và đơn DS-260 đã nộp, bạn cần tải các tài liệu chứng minh tài chính và giấy tờ dân sự lên hệ thống CEAC của NVC.

## 1. Hồ sơ bảo trợ tài chính (Affidavit of Support - Form I-864)
- **Người bảo lãnh chính**: Phải nộp mẫu đơn I-864 đã ký.
- **Người đồng bảo trợ (Joint Sponsor)**: Nộp I-864 riêng kèm bằng chứng quốc tịch/thẻ xanh và tài chính nếu thu nhập người bảo lãnh chính không đủ.
- **Giấy tờ chứng minh thu nhập**:
  - Tờ khai thuế liên bang (IRS Tax Return Transcript) của năm gần nhất (khuyên dùng).
  - Mẫu W-2 hoặc 1099.
  - Giấy xác nhận việc làm hiện tại (Job letter) và bảng lương 3-6 tháng gần nhất.

## 2. Hồ sơ dân sự của đương đơn (Civil Documents)
Tất cả các tài liệu không phải bằng tiếng Anh hoặc tiếng Việt đều phải được dịch thuật công chứng:
- **Giấy khai sinh**: Bản sao trích lục hoặc bản gốc công chứng.
- **Hộ chiếu**: Bản scan trang thông tin cá nhân.
- **Lý lịch tư pháp số 2 (Police Certificate)**: Bắt buộc cho đương đơn từ 16 tuổi trở lên cư trú tại Việt Nam.
- **Giấy chứng nhận kết hôn / ly hôn** (nếu có).
- **Ảnh thẻ**: 2 tấm ảnh kích thước 5x5cm phông nền trắng chụp trong vòng 6 tháng.',
  14
),
(
  'Kinh nghiệm phỏng vấn tại Lãnh sự quán Mỹ TP.HCM',
  'kinh-nghiem-phong-van-lanh-su-quan-my-tphcm',
  '# Kinh nghiệm phỏng vấn tại Lãnh sự quán Mỹ TP.HCM

Buổi phỏng vấn tại Lãnh sự quán Mỹ (Lãnh Sự Quán tại TP. Hồ Chí Minh) là bước cuối cùng và quan trọng nhất quyết định bạn có được cấp thị thực định cư hay không.

## 1. Khám sức khỏe và chích ngừa
- Tiến hành khám sức khỏe tại các đơn vị được chỉ định (IOM hoặc Bệnh viện Chợ Rẫy) trước ngày phỏng vấn ít nhất 1-2 tuần.
- Đến Trung tâm Kiểm dịch Y tế Quốc tế để hoàn thành lịch chích ngừa bắt buộc.

## 2. Sắp xếp hồ sơ phỏng vấn
Hãy sắp xếp tài liệu theo thứ tự khoa học để dễ dàng xuất trình khi có yêu cầu:
- Thư mời phỏng vấn và Trang xác nhận đơn DS-260 (Confirmation page).
- Hộ chiếu bản gốc.
- Bản gốc các giấy tờ dân sự (Giấy khai sinh, Đăng ký kết hôn, Lý lịch tư pháp số 2).
- Bằng chứng mối quan hệ (Ảnh chụp chung qua các năm, tin nhắn lịch sử, biên lai gửi tiền...).

## 3. Tâm lý và cách trả lời câu hỏi
- Trả lời ngắn gọn, trung thực, đi thẳng vào trọng tâm câu hỏi của viên chức lãnh sự.
- Tự tin nhìn thẳng vào người phỏng vấn và trả lời rõ ràng bằng tiếng Việt hoặc tiếng Anh tùy khả năng.
- Tuyệt đối không khai báo thông tin không chính xác so với hồ sơ đã nộp trên CEAC.',
  21
);
