# Kịch bản kiểm thử luồng điểm danh

## 1. Mục tiêu

Suite kiểm thử đánh giá tính đúng đắn và hiệu suất của luồng điểm danh bằng QR, barcode và nhập MSSV thủ công. Phạm vi hiện tại không bao gồm toàn bộ CRUD, Client E2E, coverage hoặc kiểm thử bảo mật toàn hệ thống. Báo cáo chỉ công bố kết quả có bằng chứng từ lần chạy thực tế.

## 2. Kiến trúc được kiểm thử

```text
k6 / thiết bị quét
        ↓
      Nginx
        ↓
   API 1 / API 2
        ↓
PostgreSQL: ScanRequest + Outbox
        ↓
     RabbitMQ
        ↓
  Attendance Workers
        ↓
PostgreSQL: AttendanceRecord
```

API ghi `AttendanceScanRequest` và `OutboxEvent` trong cùng transaction rồi trả HTTP `202`. Outbox Relay publish message tới RabbitMQ. Worker xử lý bất đồng bộ và tạo `AttendanceRecord`. Redis hỗ trợ rate limit và idempotency; PostgreSQL unique constraint bảo vệ cuối cùng chống ghi trùng.

## 3. Môi trường

Topology Docker gồm Nginx, hai API instance, ba Attendance Worker, PostgreSQL 16, Redis 7 và RabbitMQ 3.13. Fixture được sinh tự động, không sử dụng thông tin sinh viên thật. Dữ liệu được chuẩn bị lại trước mỗi kịch bản để các kết quả độc lập với nhau.

## 4. Kịch bản chức năng

### Unit test

- Geofence: tọa độ hợp lệ, trong vùng, ngoài vùng và độ chính xác GPS.
- QR token: chữ ký hợp lệ, sai chữ ký, hết hạn và grace period 30 giây.
- Worker decision: đăng ký sự kiện, nguồn điểm danh, phiên đang mở và điều kiện chấp nhận hoặc từ chối.

### Integration test

- QR hợp lệ trả HTTP `202`, tạo ScanRequest, Outbox và AttendanceRecord.
- Barcode yêu cầu sinh viên đã đăng ký sự kiện.
- Nhập MSSV thủ công cho phép hỗ trợ sinh viên chưa đăng ký.
- Quét lặp không tạo AttendanceRecord thứ hai.
- Request và record giữ đúng nguồn điểm danh và người thao tác.

## 5. Kịch bản hiệu suất

### QR cho 1.000 sinh viên

- 1.000 sinh viên đã đăng ký cùng một sự kiện.
- Mỗi sinh viên có access token và `clientAttemptId` riêng.
- Request được phân bố trong 60 giây, khoảng 16–17 request/giây.
- QR và GPS đều hợp lệ.
- Kết quả phải có đúng 1.000 AttendanceRecord, không pending và không còn Outbox chưa publish.

### Hai thiết bị barcode

- Hai tài khoản Ban tổ chức quét song song.
- Gửi 1.100 request cho 1.000 sinh viên.
- 100 lượt giao nhau mô phỏng sinh viên bị hai thiết bị quét trùng.
- Database phải chứa đúng 1.000 AttendanceRecord duy nhất.

### Ba thiết bị barcode

- Ba tài khoản Ban tổ chức quét song song.
- Gửi 1.200 request cho 1.000 sinh viên.
- 200 lượt giao nhau được tạo có chủ đích.
- Việc tăng số scanner không được gây lỗi HTTP 500, mất dữ liệu hoặc ghi trùng.

## 6. Chỉ số đo

| Chỉ số | Ý nghĩa |
|---|---|
| Average | Thời gian phản hồi trung bình của tất cả request |
| Median | 50% request phản hồi không chậm hơn giá trị này |
| p90 | 90% request phản hồi không chậm hơn giá trị này |
| p95 | 95% request phản hồi không chậm hơn giá trị này |
| Max | Thời gian của request chậm nhất |
| Request/giây | Số request hệ thống tiếp nhận trung bình mỗi giây |
| Error rate | Tỷ lệ request HTTP thất bại |
| Queue drain | Thời gian Worker cần thêm để xử lý hết hàng đợi |
| Duplicate | Nhóm record trùng sinh viên, sự kiện và chiều điểm danh |
| Pending | ScanRequest chưa được Worker xử lý xong |
| Unpublished Outbox | Message chưa được publish tới RabbitMQ |

## 7. Ngưỡng nghiệm thu

Một kịch bản đạt khi đồng thời thỏa mãn:

- Tỷ lệ check thành công từ 99% trở lên.
- Tỷ lệ lỗi HTTP dưới 1%.
- p95 không vượt quá 1.000 ms.
- Không mất request đã trả HTTP `202`.
- Không có AttendanceRecord trùng.
- Queue xử lý hết trong tối đa 120 giây.
- Không còn ScanRequest pending.
- Không còn Outbox chưa publish.

## 8. Cách chạy

Khởi động môi trường từ thư mục gốc:

```powershell
docker compose --env-file .env.docker `
  -f docker-compose.yml `
  -f docker-compose.attendance-test.yml `
  up -d --build
```

Sau khi các container cần thiết ở trạng thái `healthy`, chạy:

```powershell
.\run-attendance-tests.cmd
```

Chạy nhanh với ít dữ liệu hơn:

```powershell
.\run-attendance-tests.cmd -StudentCount 20
```

Kết quả được tạo tại:

```text
Docs/testing-results/<run-id>/ATTENDANCE_TEST_REPORT.docx
```

Mỗi thư mục kết quả chỉ giữ một báo cáo DOCX. JSON, XML và artifact kỹ thuật chỉ tồn tại tạm thời trong lúc tổng hợp báo cáo.

## 9. Cách đọc kết quả

- `KẾT QUẢ: ĐẠT` chỉ xuất hiện khi có đủ bằng chứng unit, integration và ba bài tải.
- Bảng hiệu suất trình bày latency và throughput của từng kịch bản.
- Flow đối soát cho thấy số request đầu vào và AttendanceRecord duy nhất đầu ra.
- Barcode có nhiều request hơn record vì bài test cố tình gửi các lượt quét trùng.
- Queue drain nhỏ cho thấy Worker theo kịp tải; queue drain bằng 0 không có nghĩa Worker không chạy.
- `Conduct Score: Không đánh giá trong kịch bản này` nghĩa là fixture tập trung vào điểm danh, không phải lỗi.

Kết quả trên máy phát triển phụ thuộc phần cứng, Docker và phiên bản phần mềm tại thời điểm chạy. Khi so sánh các lần chạy phải giữ cùng fixture, số API, số Worker và cấu hình k6.

## 10. Bằng chứng kiểm thử

`ATTENDANCE_TEST_REPORT.docx` chứa:

- Kết quả unit và integration test.
- Average, median, p90, p95, max và request/giây.
- Tỷ lệ thành công và PASS/FAIL.
- Đối soát request, AttendanceRecord, duplicate, pending và Outbox.
- Nhận xét và kết luận nghiệm thu bằng tiếng Việt.

Báo cáo chỉ sử dụng dữ liệu từ k6, JUnit và PostgreSQL verification. Nếu thiếu artifact, báo cáo ghi “Chưa có dữ liệu” và không tự điền số liệu giả.
