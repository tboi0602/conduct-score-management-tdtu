# Kiểm thử luồng điểm danh cốt lõi và hiệu suất

## Mục tiêu

Bộ kiểm thử chỉ đo luồng QR của sinh viên, barcode từ hai hoặc ba Ban tổ chức,
nhập MSSV thủ công và tính nhất quán qua API, Outbox, RabbitMQ, Worker, Redis và
PostgreSQL. Dữ liệu có tiền tố `ATTLOAD`, thuộc học kỳ 2099 và không dùng dữ liệu
sinh viên thật.

## Các lớp kiểm thử

1. `npm run test:attendance` chạy Vitest cho QR token, grace period, GPS,
   geofence và quyết định ACCEPTED/REJECTED của worker.
2. `test:attendance:prepare` tạo 1.000 sinh viên, ba organizer độc lập, đăng ký,
   event và session; mỗi actor có access token riêng.
3. k6 gửi request thật qua Nginx. Hai API nhận tải bằng `least_conn`; Outbox relay
   publish sang RabbitMQ và nhiều Worker xử lý.
4. `test:attendance:verify` chờ queue drain rồi đối chiếu ScanRequest,
   AttendanceRecord duy nhất và ConductScoreEntry.

## Chuẩn bị topology

Không dùng cấu hình tải thử trên môi trường thật. Overlay chỉ nâng rate limit theo
IP vì mọi virtual user k6 cùng xuất phát từ một máy; các giới hạn nghiệp vụ và
unique constraint vẫn giữ nguyên.

```powershell
docker compose -f docker-compose.yml -f docker-compose.attendance-test.yml up -d --build
cd server
npm.cmd run test:attendance
```

Kiểm thử integration thật được bật rõ ràng để không vô tình ghi dữ liệu khi chạy
unit test thông thường:

```powershell
cd server
npm.cmd run test:attendance:prepare
$env:RUN_ATTENDANCE_INTEGRATION="true"
$env:API_BASE_URL="http://localhost"
npm.cmd run test:attendance:integration
```

Máy chạy tải cần cài k6. Các biến `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` và
`ATTENDANCE_QR_SECRET` của lệnh chuẩn bị phải trỏ tới cùng hạ tầng Docker mà API
đang sử dụng.

## Bài 1: 1.000 sinh viên quét QR

```powershell
cd server
$env:ATTENDANCE_TEST_STUDENTS="1000"
npm.cmd run test:attendance:prepare
$env:API_BASE_URL="http://localhost"
npm.cmd run test:attendance:load:qr
npm.cmd run test:attendance:verify
```

Mỗi VU gửi đúng một request với token sinh viên và `clientAttemptId` riêng. Script
đặt ngưỡng p95 dưới 1 giây, tỷ lệ check trên 99% và lỗi HTTP dưới 1%.

## Bài 2: hai và ba máy quét song song

Chuẩn bị fixture mới trước từng bài để record của bài trước không che lỗi. Mỗi
scanner có organizer/token riêng và gửi khoảng 10 request/giây. Danh sách cố ý
giao nhau khoảng 10%, gồm các lượt từ hai máy đến gần như đồng thời.

```powershell
npm.cmd run test:attendance:prepare
$env:SCANNER_COUNT="2"
npm.cmd run test:attendance:load:barcode
npm.cmd run test:attendance:verify

npm.cmd run test:attendance:prepare
$env:SCANNER_COUNT="3"
npm.cmd run test:attendance:load:barcode
npm.cmd run test:attendance:verify
```

Kỳ vọng tổng request lớn hơn 1.000 nhưng chỉ có 1.000 AttendanceRecord. Không có
lỗi 500 do xung đột unique và số bút toán sự kiện không vượt số sinh viên.

## Artifact và cách kết luận

k6 ghi JSON vào `server/tests/.artifacts/`; verifier ghi
`attendance-verification.json`. Chỉ ghi Pass trong báo cáo khi lệnh k6 đạt
threshold và verifier trả `pass: true`. Sao chép các artifact thực tế vào
`Docs/testing-results/<timestamp>/`; không tự điền số liệu chưa đo.

Sau khi hoàn tất các bài chạy, sinh thư mục báo cáo bằng:

```powershell
npm.cmd run test:attendance:artifacts
```

File sinh báo cáo giữ `N/A` cho phép đo chưa chạy, vì vậy không thể vô tình đưa
số liệu giả vào báo cáo.

Các chỉ số Prometheus cần xuất trong lúc chạy: HTTP latency, outbox pending,
publish result, queue retry/DLQ, worker inflight, consumed result và idempotency
hit. RabbitMQ Management và Prometheus/Grafana dùng để chụp queue depth, CPU/RAM
và xác nhận ít nhất hai worker cùng consume.
