# Attendance — PlantUML sequence diagrams

## Bản rút gọn dùng trong báo cáo

| Use case | SVG | PlantUML |
| --- | --- | --- |
| Student – Check in to Event | [SVG rút gọn](student-check-in-event-compact.svg) | [Mã](student-check-in-event-compact.puml) |
| Organizer – Take Attendance | [SVG rút gọn](organizer-take-attendance-compact.svg) | [Mã](organizer-take-attendance-compact.puml) |

Bản rút gọn tập trung vào tiếp nhận, kiểm tra, xử lý nền và trả kết quả. Lifeline “Xử lý nền” gộp relay, RabbitMQ và worker ở mức phân hệ; không biểu diễn từng lần publish, ACK, lock hoặc retry. Các bước kiểm tra được gom theo mục đích nghiệp vụ. SSE được giả định đã kết nối; lỗi hạ tầng sau commit, idempotency và cấu hình ticket xem bản chi tiết bên dưới. Mở phiên QR là thao tác riêng, được giữ ở bản Organizer chi tiết.

## Bản kỹ thuật chi tiết

Đối chiếu mã nguồn ngày 21/09/2026. Hai sơ đồ mô tả hành vi hiện tại, bao gồm nhánh thất bại; không bổ sung chức năng chưa được triển khai.

| Use case | Ảnh vector | Mã PlantUML |
| --- | --- | --- |
| Student – Check in to Event | [SVG](student-check-in-event.svg) | [PlantUML](student-check-in-event.puml) |
| Organizer – Take Attendance | [SVG](organizer-take-attendance.svg) | [PlantUML](organizer-take-attendance.puml) |

## Cách đọc

- `1`, `2`, ... đánh dấu tương tác chính; `1.1`, `1.2`, ... là các thông điệp chi tiết. Số được ghi rõ trong mã để ổn định khi đọc các nhánh thay thế; một lần chạy không đi qua mọi số trong `alt/else`.
- `alt/else`: các nhánh điều kiện loại trừ nhau. `opt`: hành vi tùy điều kiện. `loop`: lặp truy vấn hoặc chuyển outbox. `break`: kết thúc lượt thử đang mô tả khi điều kiện lỗi xảy ra.
- `par`: những luồng độc lập, không phải yêu cầu worker chờ client mở SSE. Organizer thiết lập SSE khi workspace mount; vị trí operand trên hình không có nghĩa phải chờ quét xong mới đăng ký SSE. Relay cũng có thể giao message trước khi commit đánh dấu published của cả batch.
- Mũi tên liền biểu diễn lời gọi; nét đứt biểu diễn phản hồi; đầu mũi tên mở `->>` biểu diễn chuyển message bất đồng bộ. Thanh activation chỉ thời gian thực thi; không đồng nghĩa transaction hoặc khóa database.
- API gộp middleware, controller, service và SSE hub để giữ sơ đồ đọc được. Database được truy cập qua Prisma. Các lời gọi nội bộ như đồng bộ Conduct Score được tóm tắt, không mở rộng thành use case thứ ba.
- `group PostgreSQL transaction` chỉ phạm vi transaction thực tế, không sử dụng `critical` để ngụ ý khóa toàn hệ thống.
- Chính sách lỗi kỹ thuật R được ghi trong legend và tham chiếu bằng `ref`. Chính sách này áp dụng khi handler ném lỗi ở bất kỳ bước nào, không phải một bước chạy sau khi ACK thành công.

## Những điểm đã đối chiếu với code

1. API trả `202/PENDING` sau khi lưu request và requested outbox trong cùng transaction; kết quả cuối cùng do worker ghi `ACCEPTED` hoặc `REJECTED`.
2. Sinh viên: GPS → kiểm tra QR/session → lưu request. Worker kiểm tra lại đăng ký, phiên, chiều và geofence; không xác minh lại chữ ký QR.
3. Barcode yêu cầu đăng ký còn hiệu lực. `MANUAL_ENTRY` chỉ yêu cầu sinh viên tồn tại; worker cũng cho phép nguồn này bỏ qua đăng ký. Cả hai không cần GPS hoặc phiên QR đang mở.
4. Scanner là thiết bị bàn phím; hook suy ra nguồn từ tốc độ nhập, không dùng camera. Gõ nhanh hoặc paste có thể bị phân loại là barcode.
5. QR đổi theo slot 5 phút, grace 30 giây; refetch QR mỗi 15 giây không phải đổi token mỗi 15 giây.
6. Bán kính thực tế: `radiusMeters + student.accuracyMeters + session.centerAccuracyMeters`. Accuracy sinh viên tối đa 100 m; ngưỡng người mở phiên cấu hình qua môi trường, mặc định 500 m.
7. Request đã xử lý được bỏ qua; điểm danh đã tồn tại không bị tạo trùng hoặc ghi đè bởi thao tác scan mới.
8. Đồng bộ Conduct Score và phát Redis Pub/Sub xảy ra **sau commit**. Lỗi tại đây không rollback điểm danh; lần nhận lại có thể bỏ qua request đã hoàn tất, nên không cam kết tự phát lại mọi thông báo bị mất.
9. Hiện worker phát SSE thông qua Redis trực tiếp. Không vẽ thêm RabbitMQ realtime consumer cho `scan.processed` khi code chưa có thành phần đó.
10. Sinh viên polling khi PENDING; danh sách request ban tổ chức không có polling định kỳ tương đương. Toast `scanSuccess` của ban tổ chức hiện xuất hiện ngay sau 202, không chứng minh đã điểm danh thành công.

## Nguồn mã

Tất cả đường dẫn sau tính từ gốc repository:

| Phần sơ đồ | File đối chiếu |
| --- | --- |
| Sinh viên, GPS, truy vấn kết quả | `client/src/hooks/attendance/useStudentCheckIn.ts`, `client/src/components/student/StudentCheckIn.tsx` |
| Workspace, QR, SSE, gửi barcode | `client/src/hooks/attendance/useAttendanceWorkspace.ts` |
| Phân loại barcode/nhập tay | `client/src/hooks/attendance/useBarcodeScanner.ts` |
| Endpoint, quyền, response code | `server/src/routes/attendance.routes.ts`, `server/src/controllers/attendance/attendance.controller.ts` |
| Session, scan, request transaction | `server/src/services/attendance/attendance.service.ts` |
| Phạm vi khoa | `server/src/services/events/event-access.service.ts` |
| Token QR | `server/src/utils/attendanceQr.ts` |
| Ticket và SSE | `server/src/services/attendance/attendance-realtime.service.ts`, `server/src/realtime/sse.ts` |
| Outbox và publisher | `server/src/services/infrastructure/outbox.service.ts`, `server/src/producers/attendance.producer.ts` |
| Xử lý điểm danh | `server/src/workers/attendance.worker.ts` |
| Khóa và retry/DLQ | `server/src/redis/stores/lock.store.ts`, `server/src/rabbitmq/consumer.ts`, `server/src/rabbitmq/config.ts` |

## Render

Hai file độc lập, có thể dán trực tiếp vào trình soạn thảo PlantUML. Hoặc từ thư mục này, với Java và JAR PlantUML đã cài:

```powershell
java -DPLANTUML_LIMIT_SIZE=24000 -jar /path/to/plantuml.jar -charset UTF-8 -tsvg '*.puml'
```

SVG giữ chữ và đường nối sắc nét khi phóng to; mở trực tiếp bằng trình duyệt để xem các nhánh chi tiết. Không cần chạy server/client hoặc migration để xem sơ đồ.

Tham khảo cách biểu diễn từ [bài hướng dẫn Viblo](https://viblo.asia/p/thiet-ke-sequence-diagram-su-dung-plantuml-924lJB9YlPM); cú pháp `alt`, `else`, `opt`, `loop`, `par`, `break`, activation và đánh số tham chiếu [tài liệu sequence chính thức của PlantUML](https://plantuml.com/sequence-diagram).
