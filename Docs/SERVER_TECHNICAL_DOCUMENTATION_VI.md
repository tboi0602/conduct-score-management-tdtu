# TÀI LIỆU KỸ THUẬT PHÍA SERVER

## Hệ thống Quản lý Điểm rèn luyện TDTU

**Phạm vi tài liệu:** API server, background worker, PostgreSQL, Prisma, Redis, RabbitMQ, SSE, bảo mật, phân quyền, quan sát hệ thống và quy trình phát triển.

**Cổng mặc định:** API `3000`, Client `3001`, Worker health/metrics `9101`.

---

# 1. Mục tiêu và phạm vi hệ thống

Server cung cấp nền tảng nghiệp vụ cho bốn nhóm người dùng: `ADMIN`, `EVENT_ORGANIZER`, `STUDENT_AFFAIRS` và `STUDENT`. Hệ thống quản lý tài khoản, cơ cấu khoa–ngành–lớp, đơn vị tổ chức, sự kiện, đăng ký sự kiện, điểm danh, khiếu nại, thông báo, cảnh báo cuối học kỳ và sổ điểm rèn luyện.

PostgreSQL là nguồn dữ liệu chuẩn. Redis không thay thế database mà chỉ giữ trạng thái ngắn hạn như phiên refresh, rate limit, distributed lock, idempotency, cache và ticket SSE. RabbitMQ xử lý các tác vụ bất đồng bộ có tải lớn hoặc cần retry, đặc biệt là điểm danh. API và Worker là hai tiến trình riêng để có thể scale độc lập.

# 2. Kiến trúc triển khai tổng thể

```text
Browser / PWA
    |
    | HTTPS, Cookie HttpOnly, Bearer access token
    v
Nginx / Load Balancer
    |
    +--------------------------+
    |                          |
    v                          v
API instance 1             API instance N
Express :3000              Express :3000
    |                          |
    +------------+-------------+
                 |
      +----------+----------+------------------+
      |                     |                  |
      v                     v                  v
PostgreSQL              Redis              RabbitMQ
Nguồn dữ liệu chuẩn     trạng thái ngắn     message broker
      ^                     ^                  |
      |                     |                  v
      +---------------------+------------- Worker instances
                                      consumer + scheduled jobs
```

API không giữ session trong bộ nhớ tiến trình. Vì refresh session nằm trong Redis và dữ liệu nghiệp vụ nằm trong PostgreSQL, request có thể được chuyển đến bất kỳ API instance nào, không cần sticky session. Realtime SSE được fan-out qua Redis Pub/Sub để nhiều API instance cùng chuyển kết quả đúng tới client đang kết nối.

# 3. Cấu trúc thư mục server

```text
server/
├── prisma/
│   ├── schema/             # Prisma schema chia theo miền nghiệp vụ
│   ├── migrations/         # Lịch sử migration bất biến
│   └── seeds/              # Seed RBAC, học vụ, tiêu chí, học kỳ...
├── scripts/                # Script build kiểm tra độc lập
├── tests/                  # Unit/load test phía server
└── src/
    ├── config/             # env, Prisma, logger, auth, S3
    ├── routes/             # khai báo endpoint và middleware
    ├── controllers/        # adapter HTTP mỏng
    ├── middleware/         # auth, permission, validation, metrics, error
    ├── modules/            # nghiệp vụ theo domain
    │   ├── attendance/
    │   ├── conduct-score/
    │   ├── events/
    │   ├── appeals/
    │   ├── dashboard/
    │   ├── criteria/
    │   ├── warnings/
    │   └── infrastructure/
    ├── services/           # service cũ và facade tương thích
    ├── redis/              # connection và các Redis store
    ├── rabbitmq/           # connection, topology, consumer, publisher
    ├── producers/          # producer theo nghiệp vụ
    ├── workers/            # consumer và scheduled job
    ├── realtime/           # SSE hub
    ├── metrics/            # Prometheus metrics
    ├── utils/              # helper không phụ thuộc domain
    ├── index.ts            # entry point API
    └── worker.ts           # entry point worker
```

## 3.1. Ý nghĩa của `modules`

`modules` là cách tổ chức theo **năng lực nghiệp vụ**. Một module chứa những thành phần cùng giải quyết một miền, thay vì đặt toàn bộ service của mọi miền vào một thư mục lớn.

```text
src/modules/<domain>/
├── index.ts                # public API của module
├── <domain>.schemas.ts     # Zod contract nếu module đã chuyển đổi
├── services/               # use case và transaction
├── queries/                # raw SQL/projection có type
└── repositories/           # Prisma operation dùng lại, khi cần
```

Quy tắc phụ thuộc:

```text
route -> middleware -> controller -> module public API
                                      |
                                      +-> service
                                      +-> query/repository
                                      +-> Prisma / Redis / RabbitMQ
```

Controller và worker nên import từ `@modules/<domain>`. Không nên import xuyên vào file nội bộ của module khác vì sẽ tạo coupling. `index.ts` quyết định hàm nào được coi là API nội bộ công khai. Các file một dòng trong `src/services` chỉ là facade chuyển tiếp để code cũ tiếp tục hoạt động trong quá trình di chuyển.

## 3.2. Phân biệt service, repository và query

- **Service:** kiểm tra quy tắc nghiệp vụ, phạm vi quyền, điều phối transaction, gọi Redis/RabbitMQ và quyết định kết quả use case.
- **Repository:** đóng gói Prisma CRUD có thể tái sử dụng mà không chứa quyết định nghiệp vụ.
- **Query:** chứa truy vấn đọc phức tạp hoặc raw SQL cần tối ưu, có input/output type rõ ràng.
- **Controller:** chỉ lấy dữ liệu HTTP, gọi service và trả status/response.

Ví dụ đăng ký sự kiện không được viết trong controller. Controller nhận `eventId`, service kiểm tra thời hạn/sức chứa, transaction cập nhật đăng ký và số lượng, sau đó service invalidates cache.

# 4. Luồng khởi động API

Entry point là `src/index.ts`.

```text
1. Nạp biến môi trường qua dotenv.
2. validateRuntimeEnv(): kiểm tra URL, secret và biến bắt buộc.
3. Khởi tạo Express và trust proxy = 1.
4. Gắn requestContext để tạo/nhận X-Request-ID.
5. Gắn Helmet, CORS credentials và JSON limit 1 MB.
6. Gắn metricsMiddleware.
7. Khai báo /metrics và /health.
8. Mount toàn bộ REST API tại /api/v1.
9. Gắn errorHandler ở cuối pipeline.
10. Kết nối Redis, PostgreSQL và RabbitMQ.
11. Bắt đầu lắng nghe cổng API.
```

Thứ tự middleware có ý nghĩa. `requestContext` chạy sớm để mọi log/lỗi có request ID. `errorHandler` phải ở cuối để bắt lỗi từ route/controller. `express.json({ limit: "1mb" })` ngăn body tùy ý quá lớn; mô tả sự kiện có giới hạn riêng trước khi sanitize.

Khi nhận `SIGTERM` hoặc `SIGINT`, server đóng SSE, ngừng nhận kết nối mới, chờ request đang xử lý, rồi đóng RabbitMQ, Redis và Prisma. Sau 10 giây hệ thống mới ép thoát để tránh treo khi shutdown.

# 5. Luồng HTTP chuẩn

```text
Client
  -> Nginx gắn X-Request-ID
  -> requestContext
  -> security middleware (Helmet/CORS)
  -> metricsMiddleware
  -> authenticate
  -> requirePermission("resource.action")
  -> validate(Zod schema)
  -> controller
  -> domain service
  -> Prisma transaction / Redis / RabbitMQ
  -> controller trả { ok, data, pagination? }
  -> metrics ghi status và duration
```

Response thành công:

```json
{
  "ok": true,
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

Response lỗi chuẩn:

```json
{
  "ok": false,
  "error": {
    "code": "EVENT_FULL",
    "message": "Event is full",
    "fields": { "capacity": "No remaining slot" }
  },
  "requestId": "..."
}
```

`ApiError` dành cho lỗi nghiệp vụ có thể dự đoán. Lỗi bất ngờ được log tại server nhưng client không nhận stack trace hoặc chi tiết kết nối database.

# 6. Xác thực và quản lý phiên

## 6.1. Đăng nhập Admin

```text
1. POST /api/v1/auth/login với email/password.
2. Controller kiểm tra payload.
3. Auth service tìm user và password hash.
4. bcrypt so sánh mật khẩu.
5. Kiểm tra trạng thái ACTIVE và vai trò hợp lệ.
6. Tạo access token 15 phút.
7. Tạo refresh token chứa sessionId.
8. Hash refresh token và lưu Redis theo sessionId cùng TTL.
9. Gửi refresh token bằng cookie HttpOnly.
10. Trả access token và profile, không trả refresh token cho JavaScript.
```

## 6.2. Đăng nhập Google

Sinh viên dùng domain `@student.tdtu.edu.vn`. Staff dùng `@tdtu.edu.vn` nhưng phải được provision trước với vai trò quản lý phù hợp. Server xác minh Google credential bằng Google Auth Library, không tin email do client tự gửi.

## 6.3. Refresh token rotation

```text
1. Client gọi POST /auth/refresh với credentials: include.
2. Server đọc refresh cookie HttpOnly.
3. Verify chữ ký và lấy sessionId.
4. Lấy session tương ứng từ Redis.
5. Hash token nhận được và so sánh constant-time.
6. Xóa session cũ.
7. Tạo access token mới, refresh token mới và sessionId mới.
8. Lưu hash mới vào Redis.
9. Set cookie mới và trả access token mới.
```

Rotation làm token cũ mất hiệu lực sau khi đã dùng. Logout xóa Redis session và clear cookie. Client chỉ giữ access token trong memory; localStorage chỉ có thể giữ profile không nhạy cảm.

# 7. RBAC và phạm vi khoa

Bốn vai trò sản phẩm:

- `ADMIN`: wildcard `*`, toàn hệ thống.
- `EVENT_ORGANIZER`: sự kiện, đăng ký và điểm danh trong phạm vi khoa.
- `STUDENT_AFFAIRS`: quyền Ban tổ chức cộng quản lý sinh viên, lớp, nhân sự và Conduct Score trong khoa.
- `STUDENT`: hồ sơ cá nhân, sự kiện, đăng ký, điểm danh, lịch, khiếu nại và điểm của chính mình.

`authenticate` giải mã access token để xác định user. `requirePermission` lấy quyền hiện tại từ dữ liệu server; client không thể tự khai role/permission. Những nghiệp vụ theo khoa tiếp tục gọi `eventScope` hoặc access service để dựng điều kiện Prisma.

Khi cập nhật dữ liệu có thể đổi phạm vi, service kiểm tra cả bản ghi hiện tại và phạm vi đích. Ví dụ chuyển một sự kiện sang đơn vị khác cần quyền quản lý sự kiện hiện tại lẫn đơn vị mới.

# 8. PostgreSQL và Prisma

Schema được chia thành `auth`, `student`, `event`, `attendance`, `appeal`, `conduct-score`, `schedule` và `academic`. Migration đã áp dụng không được sửa; thay đổi schema luôn tạo migration mới.

Các nguyên tắc truy vấn:

- Danh sách dùng `skip/take`, `orderBy` ổn định và `id` làm tie-breaker.
- Search/filter được đẩy xuống PostgreSQL.
- Chỉ `select` trường cần trả.
- Multi-table write dùng `$transaction`.
- Unique constraint là lớp bảo vệ cuối cùng cho idempotency.
- Raw SQL chỉ dùng khi Prisma khó diễn đạt hoặc không cung cấp primitive cần thiết như `FOR UPDATE SKIP LOCKED`, conditional upsert và projection aggregate.

## 8.1. Transaction và đồng thời

Đăng ký sự kiện giới hạn chỗ dùng transaction `Serializable`. Luồng logic:

```text
BEGIN SERIALIZABLE
  -> đọc event và registeredCount
  -> kiểm tra thời gian đăng ký
  -> kiểm tra capacity
  -> INSERT ... ON CONFLICT để đăng ký hoặc kích hoạt lại bản ghi CANCELLED
  -> tăng registeredCount có điều kiện
COMMIT
```

Nếu PostgreSQL báo serialization conflict, service retry giới hạn số lần. Unique `(eventId, studentId)` ngăn hai đăng ký song song tạo hai dòng. `registeredCount` là projection để đọc nhanh nhưng luôn được cập nhật trong cùng transaction.

# 9. Redis

Redis đảm nhiệm:

- Refresh session đã hash.
- Rate limit theo user/IP/session.
- Idempotency key cho attendance.
- Distributed lock cho scheduled job.
- Dashboard cache theo scope và semester.
- Trạng thái QR/session ngắn hạn.
- SSE ticket dùng một lần.
- Pub/Sub cho realtime giữa nhiều API instance.

Mọi key cần namespace và TTL trừ dữ liệu được thiết kế để tồn tại lâu. Ví dụ distributed lock có dạng `worker-job:<job-name>`. Lock dùng giá trị ngẫu nhiên và chỉ instance sở hữu đúng token mới được phép release, tránh xóa nhầm lock mới của instance khác.

# 10. RabbitMQ và Transactional Outbox

API không publish attendance trực tiếp sau một lệnh ghi database vì có thể xảy ra tình trạng database commit nhưng publish thất bại. Thay vào đó, `AttendanceScanRequest` và `OutboxEvent` được tạo trong cùng transaction PostgreSQL.

```text
POST scan
  -> BEGIN
  -> INSERT AttendanceScanRequest(PENDING)
  -> INSERT OutboxEvent(attendance.scan.requested.v1)
  -> COMMIT
  -> HTTP 202 { requestId }
```

Outbox relay:

```text
1. SELECT các outbox chưa publish bằng FOR UPDATE SKIP LOCKED.
2. Nhiều relay có thể chạy nhưng không lấy trùng cùng row.
3. Publish persistent message qua Confirm Channel.
4. RabbitMQ confirm thành công -> đặt publishedAt.
5. Lỗi -> tăng attempts, lưu lastError và nextAttemptAt exponential backoff.
```

Message chứa `messageId`, `correlationId`, `schemaVersion`, `eventId`, `sessionId`, `studentId`, `direction`, `source` và `occurredAt`. Worker chỉ `ack` sau khi transaction xử lý thành công. Lỗi tạm thời đi retry queue; quá số lần chuyển DLQ.

# 11. Luồng điểm danh QR của sinh viên

```text
1. Ban tổ chức mở AttendanceSession, cung cấp GPS làm tâm geofence.
2. Server lưu direction, latitude, longitude, radius và người mở.
3. Server tạo QR token ký bằng ATTENDANCE_QR_SECRET theo time slot.
4. Sinh viên quét QR và trình duyệt lấy GPS + accuracy.
5. Client gửi token, vị trí và clientAttemptId.
6. API rate-limit và ghi request + outbox, trả HTTP 202.
7. Attendance worker nhận attendance.scan.requested.v1.
8. Worker kiểm tra idempotency, session đang mở, QR, đăng ký và direction.
9. Worker kiểm tra accuracy <= ngưỡng.
10. Tính khoảng cách Haversine.
11. Chấp nhận nếu distance <= radius + accuracy.
12. Ghi AttendanceRecord bằng unique student-event-direction.
13. Đổi request thành ACCEPTED hoặc REJECTED kèm reason.
14. Publish attendance.scan.processed.v1.
15. Realtime consumer phát Redis Pub/Sub.
16. SSE hub gửi kết quả tới student:<studentId> và event:<eventId>.
17. Đồng bộ Conduct Score khi đủ điều kiện tham gia.
```

`ONE_WAY` chỉ cần `CHECK_IN`. `TWO_WAY` cần cả `CHECK_IN` và `CHECK_OUT`. Sinh viên tự quét bắt buộc đã đăng ký và có GPS. Barcode vẫn kiểm tra đăng ký. Chỉ `MANUAL_ENTRY` hoặc `BULK_IMPORT` theo quyền quản lý mới có quy tắc bỏ qua đăng ký.

# 12. Điểm danh bằng barcode, nhập tay và Excel

Thiết bị barcode hoạt động như bàn phím: nhập chuỗi MSSV liên tục và kết thúc bằng ký tự Enter. Client tự gửi ngay với nguồn `STAFF_BARCODE`. Nhập tay gửi nguồn `MANUAL_ENTRY`; đây là trường hợp quản lý được phép hỗ trợ sinh viên chưa đăng ký.

Import Excel chỉ dành cho sự kiện `ONLINE`. Client đọc cột MSSV đầu tiên, nhưng server vẫn trim, uppercase, bỏ dòng trống, loại trùng, giới hạn 5.000 mã và truy vấn sinh viên theo batch `IN`. Mỗi sinh viên hợp lệ tạo scan request và outbox với nguồn `BULK_IMPORT`. File không được tin trực tiếp và không được upload nguyên file vào API.

# 13. Realtime SSE

Do `EventSource` không thuận tiện gửi Bearer token, client trước tiên lấy SSE ticket ngắn hạn. Ticket nằm trong Redis, có TTL và chỉ dùng một lần. Khi kết nối `/attendance/stream`, server consume ticket và chỉ subscribe đúng scope được cấp.

Kênh chính:

- `student:<studentId>`: kết quả lượt điểm danh của sinh viên.
- `event:<eventId>`: danh sách và bộ đếm realtime cho ban tổ chức.
- `dashboard:<scope>`: tín hiệu dữ liệu dashboard cần làm mới.

Heartbeat giữ kết nối qua proxy. Khi client disconnect, listener được cleanup và gauge SSE giảm. Redis Pub/Sub giúp worker/API instance khác vẫn phát được tới đúng connection.

# 14. Conduct Score ledger

Không chỉnh trực tiếp một con số tổng duy nhất. Hệ thống dùng sổ bút toán:

- `ConductScore`: projection tổng theo sinh viên–học kỳ.
- `ConductScoreEntry`: bút toán sự kiện, điều chỉnh, đảo bút toán hoặc legacy import.
- `ConductScoreCriterionTotal`: tổng thô và tổng sau giới hạn theo tiêu chí.
- `ConductScoreStatusHistory`: lịch sử chốt/mở lại.

Công thức:

```text
criterionCapped = clamp(sum(entries của tiêu chí), 0, criteria.maxPoints)
totalScore = clamp(sum(criterionCapped), 0, 100)
```

Xếp loại:

```text
90-100 EXCELLENT
80-89  GOOD
65-79  FAIR
50-64  AVERAGE
< 50   POOR
```

Sự kiện chỉ cộng điểm một lần nhờ khóa idempotency/unique theo nguồn sự kiện. Nếu kết quả điểm danh đổi, hệ thống tạo bút toán chênh lệch hoặc đảo thay vì sửa lịch sử. Bảng `FINAL` chỉ thay đổi qua luồng reopen có lý do và audit.

Tiêu chí có `defaultPoints` được bổ sung khi chốt theo quy tắc nghiệp vụ. Nếu không có vi phạm/điều chỉnh âm, entry mặc định dùng nội dung tiêu chí và kết quả “Không vi phạm”.

# 15. Khiếu nại điểm danh

```text
1. Sinh viên lấy presigned upload data từ server.
2. Client upload ảnh trực tiếp tới object storage.
3. Client POST appeal với evidence key và giải thích.
4. Server xác minh key/mime/size và thời hạn khiếu nại.
5. Student Affairs xem bằng presigned read URL ngắn hạn.
6. APPROVED: tạo/cập nhật AttendanceRecord cần thiết.
7. Với TWO_WAY, service bảo đảm đủ direction theo quy tắc duyệt.
8. Gọi syncEventConductScore(..., allowFinalized: true).
9. REJECTED: lưu lý do, không cộng điểm.
10. Worker định kỳ đối soát appeal APPROVED để tự sửa nếu lần đồng bộ trước bị gián đoạn.
```

Sau thời gian lưu giữ, worker xóa evidence và bản ghi đã xử lý theo batch. Job có distributed lock nên nhiều worker không chạy cleanup trùng.

# 16. Cảnh báo cuối học kỳ

Worker định kỳ tìm học kỳ còn 0–14 ngày trước `endDate`. Sinh viên chưa có Conduct Score được xem là 0. Nếu tổng dưới 80, hệ thống upsert cảnh báo `ACTIVE` theo unique sinh viên–học kỳ–loại và tạo notification. Khi đạt 80 hoặc học kỳ kết thúc, cảnh báo chuyển `RESOLVED`.

Job chạy lúc worker khởi động và theo interval cấu hình. Redis lock `worker-job:warning-maintenance` bảo đảm tại một thời điểm chỉ một instance thực thi.

# 17. Dashboard và cache

Dashboard xác định scope từ database:

- Admin hoặc quyền toàn đơn vị: toàn trường.
- Event Organizer/Student Affairs: khoa hiệu lực.
- Không có khoa và không có quyền toàn trường: trả lỗi yêu cầu Admin gán khoa.

Aggregate gồm sinh viên, lớp/khoa, sự kiện theo trạng thái, đăng ký, tham gia, vắng, Conduct Score trung bình, dưới 50, draft/final và dữ liệu biểu đồ. Kết quả cache Redis khoảng 60 giây theo scope + semester. Mutation sự kiện, đăng ký, attendance hoặc Conduct Score invalidates đúng key toàn trường/khoa.

# 18. PWA, offline incident và reconciliation

Service Worker chỉ cache static asset, font, logo và shell phù hợp. API, access token, SSE và QR token không được cache. IndexedDB giữ attendance attempt lỗi và incident log trong thời hạn giới hạn.

Client chuẩn hóa incident JSON rồi tính SHA-256 bằng Web Crypto. Digest chỉ kiểm tra dữ liệu không bị thay đổi sau khi tạo, không chứng minh tuyệt đối rằng người dùng không giả mạo dữ liệu ban đầu. Khi có mạng lại, client chỉ retry nếu còn đăng nhập, QR/session còn hợp lệ và sự kiện chưa kết thúc; dùng lại `clientAttemptId` để idempotent. Nếu đã hết hạn, attempt trở thành bằng chứng khiếu nại, không tự tạo AttendanceRecord.

API access audit lưu request ID, attempt ID, status và duration nhưng không lưu JWT, QR token hoặc tọa độ đầy đủ. Trang reconciliation nối client incident, API audit, scan request, worker result và AttendanceRecord theo ID. Request bị Nginx chặn trước API chỉ tồn tại trong Nginx access log, không có database audit.

# 19. Metrics, logging và health

API `/health` kiểm tra PostgreSQL, Redis và RabbitMQ; trả 503 nếu một dependency bắt buộc không sẵn sàng. Worker có health server riêng trên cổng 9101. `/metrics` xuất Prometheus exposition format và không nên public qua Nginx.

Metrics quan trọng gồm tổng request scan, HTTP duration, outbox pending/publish, consumed result, retry, DLQ, idempotency hit, geofence reject, worker inflight, SSE connections và trạng thái Redis/RabbitMQ.

Log có cấu trúc và mang `requestId`, `messageId`, `correlationId`, `eventId`, `studentId` khi có. Không log access/refresh token, QR token, password, Google token hoặc tọa độ chính xác.

# 20. Danh mục API theo miền

Base URL: `/api/v1`.

- `/auth`: login Admin, Google login, refresh, logout, `/me`, chuyển workspace và cập nhật hồ sơ.
- `/users`, `/faculty-users`: quản lý tài khoản, sinh viên và nhân sự theo quyền/phạm vi.
- `/rbac`: role và permission.
- `/academic`, `/organizers`: khoa, ngành, lớp và đơn vị tổ chức.
- `/events`: CRUD, discovery, recommendation, đăng ký, danh sách đăng ký và options.
- `/attendance`: session, QR, scan, barcode/manual/import, SSE, incident và reconciliation.
- `/conduct-scores`: danh sách, chi tiết, điều chỉnh, hàng loạt, finalize/reopen và điểm của tôi.
- `/appeals`: tạo, lịch sử, evidence và review.
- `/notifications/me`: danh sách phân trang, đọc một và đọc tất cả.
- `/warnings/me`: cảnh báo đang hiệu lực.
- `/schedules`: thời khóa biểu và exception.
- `/dashboard`: KPI và dữ liệu biểu đồ theo scope.

Mọi endpoint bảo vệ phải dùng permission hẹp nhất. API danh sách có pagination và filter tại database.

# 21. Cấu hình môi trường

Biến cấu hình được đọc tập trung tại `src/config/env.ts`. Nhóm chính:

```text
DATABASE_URL
CLIENT_ORIGIN
JWT_SECRET
JWT_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
REDIS_URL
RABBITMQ_URL
RABBITMQ_EXCHANGE
RABBITMQ_PREFETCH
ATTENDANCE_QR_SECRET
ATTENDANCE_*RATE_LIMIT*
AWS_REGION
AWS_S3_APPEAL_BUCKET
WORKER_HEALTH_PORT
```

Production bắt buộc cung cấp secret thật. `.env.example` chỉ chứa placeholder. Không hardcode credential hoặc commit `.env`.

# 22. Quy trình phát triển local

```text
1. Cài PostgreSQL local và tạo database.
2. Chuẩn bị Redis và RabbitMQ theo README.
3. Copy server/.env.example thành server/.env.
4. npm install tại server và client.
5. npm run prisma:generate
6. npm run prisma:migrate:local
7. npm run seed:local
8. Chạy API: npm run dev
9. Chạy worker ở terminal khác: npm run dev:worker
10. Chạy client tại cổng 3001: npm run dev
```

`prisma:migrate:local` dùng `prisma migrate dev`, phù hợp máy phát triển. `prisma:deploy` chỉ áp dụng migration đã tồn tại, không tạo migration mới và phù hợp CI/production.

# 23. Kiểm tra chất lượng

Server:

```powershell
npm.cmd run verify
```

Chuỗi này chạy format check, TypeScript strict, Vitest và isolated build check. Nếu đổi Prisma schema, chạy thêm generate, migrate local và seed local.

Client:

```powershell
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run build
```

CI tạo PostgreSQL sạch, generate Prisma Client, validate schema, deploy migration, rồi chạy format/typecheck/test/build. Không được báo kiểm tra thành công nếu lệnh thực tế chưa chạy.

# 24. Hướng dẫn lần theo một lỗi

Ví dụ lỗi điểm danh:

```text
1. Lấy requestId/clientAttemptId từ UI.
2. Tìm structured API log theo requestId.
3. Tìm AttendanceAccessAudit theo attemptId.
4. Tìm AttendanceScanRequest và reason/status.
5. Tìm OutboxEvent theo correlationId.
6. Kiểm tra publishedAt, attempts, lastError.
7. Tìm RabbitMQ worker log theo messageId/correlationId.
8. Kiểm tra AttendanceRecord unique direction.
9. Kiểm tra Redis idempotency/rate limit nếu bị từ chối sớm.
10. Nếu không có API audit, tra Nginx access log theo request ID/thời gian.
```

Ví dụ tổng điểm sai:

```text
1. Xác định studentId và semesterId.
2. Đọc ConductScore projection.
3. Liệt kê ConductScoreEntry theo createdAt.
4. Nhóm entry theo criteriaId.
5. Kiểm tra reversal/reversedEntryId và event source.
6. Tính raw total rồi áp maxPoints.
7. So với ConductScoreCriterionTotal.
8. Kiểm tra status FINAL và lịch sử reopen.
9. Kiểm tra event attendance đã đủ ONE_WAY/TWO_WAY chưa.
```

# 25. Nguyên tắc mở rộng hệ thống

Khi thêm nghiệp vụ mới:

```text
1. Xác định domain sở hữu dữ liệu.
2. Thêm permission và seed idempotent nếu cần.
3. Thêm schema/migration mới, không sửa migration cũ.
4. Viết Zod contract.
5. Route chỉ compose middleware.
6. Controller mỏng.
7. Service chứa rule/transaction.
8. Query/repository chứa persistence phức tạp.
9. Thêm error code ổn định.
10. Thêm metric/log correlation nếu là luồng quan trọng.
11. Thêm unit/integration test.
12. Cập nhật module index và tài liệu.
```

CRUD thông thường xử lý đồng bộ qua Prisma. Chỉ dùng RabbitMQ khi công việc có tải lớn, cần retry hoặc cần tách thời gian xử lý khỏi HTTP. Chỉ dùng Redis cho trạng thái ngắn hạn/cross-instance; không dùng Redis thay nguồn dữ liệu nghiệp vụ PostgreSQL.

# 26. Kết luận kỹ thuật

Hệ thống sử dụng kiến trúc modular monolith kết hợp event-driven processing. API vẫn là một ứng dụng Express thống nhất để giảm độ phức tạp vận hành, trong khi các domain được tách rõ trong source code. Attendance dùng transactional outbox, RabbitMQ, Redis idempotency và unique constraint PostgreSQL để chịu đồng thời. Auth dùng refresh cookie HttpOnly và server-side Redis session. Conduct Score dùng ledger để bảo toàn audit. API và worker stateless theo tiến trình nên có thể scale ngang sau reverse proxy.
