# MarineTag AI 🚢🏷️

Ứng dụng web full-stack hỗ trợ kỹ sư và thanh tra viên hàng hải bóc tách thông tin tự động từ ảnh biển tên (nameplate) kim loại của thiết bị trên tàu thủy bằng mô hình **Gemini 3.8 Flash**, lưu trữ bền vững vào **Firestore** và quản lý kho dữ liệu thiết bị hàng hải.

---

## 1. Tính năng nổi bật

- **Chụp ảnh trực tiếp bằng Camera hoặc Tải ảnh lên**: Thiết kế tối ưu cho điện thoại di động (mobile-first), nút lớn, thao tác một chạm trên boong hoặc trong buồng máy.
- **Bóc tách tự động 7 trường chuẩn hàng hải**:
  1. `serial_no`: Số sê-ri
  2. `tag_no`: Mã tag thiết bị (vị trí trên sơ đồ hệ thống tàu)
  3. `manufacturer`: Nhà sản xuất (Alfa Laval, Wärtsilä, Yanmar, ABB, v.v.)
  4. `equipment_type`: Loại thiết bị (Bơm ly tâm, Máy phân ly, v.v.)
  5. `year`: Ngày/năm sản xuất (giữ nguyên định dạng gốc)
  6. `testing_press`: Áp suất thử nghiệm kèm đơn vị (ví dụ `7.7 mwc`, `25 bar`)
  7. `approval_body`: Đăng kiểm hàng hải phê duyệt (DNV, Lloyd's, VR, ClassNK, ABS, v.v.)
- **Cảnh báo độ tin cậy thấp (`low_confidence_fields`)**: Tự động đánh dấu viền cam kèm biểu tượng cảnh báo cho các trường mờ xước, khó đọc để kỹ sư rà soát lại trước khi lưu.
- **Chụp nhiều biển liên tiếp**: Sau khi lưu vào kho, hệ thống tự xóa form và giữ nguyên ô *Tên tàu* và *Vị trí*.
- **Chặn & Cảnh báo thông minh**: Chặn lưu nếu cả 7 trường rỗng; cảnh báo (không chặn) nếu đã tồn tại bản ghi trùng cả `serial_no` và `tag_no`.
- **Kho dữ liệu & Xuất CSV**: Tìm kiếm nhanh theo tàu/serial/tag, xem ảnh gốc độ phân giải cao có tính năng Zoom/Pan, sửa tay, xóa bản ghi, và xuất CSV chuẩn UTF-8 BOM hiển thị tiếng Việt hoàn hảo trên Excel.
- **Bảo mật & Giới hạn tần suất**:
  - API Key chỉ nằm ở server, tuyệt đối không đưa xuống trình duyệt.
  - Kiểm soát quyền truy cập qua danh sách `ALLOWED_EMAILS`.
  - Giới hạn tần suất 20 lượt bóc tách/phút cho mỗi người dùng.
  - Tự động thử lại 3 lần với exponential backoff khi gặp lỗi mạng/quá tải.

---

## 2. Các biến môi trường cần thiết (`.env`)

| Tên biến | Bắt buộc | Mô tả | Giá trị mẫu |
|---|---|---|---|
| `GEMINI_API_KEY` | Có | Khóa API của Google Gemini | `AIzaSy...` |
| `GEMINI_MODEL` | Không | Model Gemini multimodal hiện hành (mặc định: `gemini-3.8-flash`) | `gemini-3.8-flash` |
| `ALLOWED_EMAILS` | Có | Danh sách email được phép đăng nhập, cách nhau bởi dấu phẩy | `phantrongkhoi1710@gmail.com,admin@marinetag.ai` |
| `PORT` | Không | Cổng chạy server (mặc định 3000 cục bộ, 8080 trên Cloud Run) | `3000` |
| `NODE_ENV` | Không | Chế độ môi trường (`development` hoặc `production`) | `production` |

---

## 3. Chạy thử nghiệm tại máy cục bộ (Local Development)

### Bước 1: Cài đặt thư viện
```bash
npm install
```

### Bước 2: Cấu hình biến môi trường
Tạo tệp `.env` từ `.env.example`:
```bash
cp .env.example .env
```
Điền `GEMINI_API_KEY` và `ALLOWED_EMAILS` của bạn vào `.env`.

### Bước 3: Khởi động hệ thống
```bash
npm run dev
```
Truy cập `http://localhost:3000` trên trình duyệt.

---

## 4. Hướng dẫn Triển khai lên Google Cloud Run

### 4.1. Bật các Google Cloud APIs cần thiết:
Chạy lệnh sau trên terminal Google Cloud SDK / Cloud Shell:
```bash
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  generativelanguage.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

### 4.2. Build ứng dụng:
```bash
npm run build
```

### 4.3. Triển khai lên Cloud Run:
```bash
gcloud run deploy marinetag-ai \
  --source . \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,GEMINI_MODEL=gemini-3.8-flash,ALLOWED_EMAILS=phantrongkhoi1710@gmail.com" \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

Cloud Run sẽ tự động cung cấp địa chỉ URL HTTPS công khai, hỗ trợ scale-to-zero khi không có yêu cầu để tiết kiệm tối đa chi phí.
