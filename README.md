# Hệ thống Quản lý Điểm Rèn luyện ( Conduct Score Management System )

[🇻🇳 Tiếng Việt](#-tiếng-việt) | [🇬🇧 English](#-english)

---

## 🇻🇳 Tiếng Việt

### Giới thiệu
Hệ thống quản lý và gợi ý điểm rèn luyện sinh viên được thiết kế theo kiến trúc hướng sự kiện (Event-Driven Architecture). Dự án tập trung tự động hóa toàn bộ quy trình đánh giá rèn luyện trong môi trường đại học, giải quyết các điểm nghẽn thực tế:

* **Tắc nghẽn hệ thống:** Khắc phục sự cố nghẽn mạng khi hàng ngàn sinh viên cùng check-in trong khoảng thời gian ngắn tại các hội trường lớn.
* **Gian lận điểm danh:** Chặn triệt để hành vi chụp ảnh mã QR gửi cho nhau để điểm danh hộ từ xa.
* **Chậm trễ dữ liệu:** Loại bỏ quy trình tổng hợp thủ công qua file Excel khiến việc cập nhật điểm bị chậm trễ nhiều tuần.

### Tính năng chính
* **Điểm danh thời gian thực tải cao:**
  * **Luồng Ban tổ chức:** Sử dụng đầu đọc mã vạch hoặc ứng dụng di động để quét MSSV trực tiếp tại cổng sự kiện.
  * **Luồng Sinh viên tự quét:** Quét mã QR sự kiện qua ứng dụng. Hệ thống tự động tính toán khoảng cách giữa tọa độ GPS của sinh viên và vị trí hội trường bằng thuật toán Haversine (Geofencing) để chặn điểm danh hộ.
* **Bộ gợi ý sự kiện (Smart Advisor):** Tự động phân tích danh mục tiêu chí điểm rèn luyện sinh viên còn thiếu, đối chiếu với các khung giờ không có lịch học trong tuần để đề xuất sự kiện phù hợp nhất.
* **Gửi và duyệt minh chứng trực tuyến:** Tiếp nhận phản hồi kèm ảnh chụp minh chứng cho các sự cố kỹ thuật. Cán bộ quản lý có thể đối soát và phê duyệt trực tiếp trên giao diện web.
* **Bảng theo dõi tiến độ:** Cung cấp biểu đồ trực quan hóa tiến độ tích lũy điểm theo từng mốc xếp loại (Khá, Giỏi, Xuất sắc) và tự động đồng bộ thời gian thực.

### Kiến trúc & Công nghệ
* **Frontend:** Next.js 14 (App Router), Tailwind CSS, PWA.
* **Backend:** Node.js (TypeScript), Express, RESTful API, WebSocket.
* **Cân bằng tải:** Nginx (Reverse Proxy, thuật toán Round-Robin, TLS termination).
* **Hàng đợi & Cache:** RabbitMQ (Xử lý bất đồng bộ luồng check-in, retry TTL + DLQ), Redis (Cache phiên làm việc, idempotency lock và Pub/Sub fan-out cho SSE).
* **Cơ sở dữ liệu:** PostgreSQL 16 (schema quản lý bằng Prisma migrations).
* **Quan sát (Observability):** Prometheus + Grafana, endpoint /metrics trên API và Worker.

### Sơ đồ luồng xử lý hệ thống

```text
                     ┌──────────────────┐
                     │   User Requests  │
                     └────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Nginx Balancer   │
                    └─────────┬─────────┘
                              │
           ┌──────────────────┴──────────────────┐
           ▼                                     ▼
┌────────────────────┐                ┌────────────────────┐
│ Node.js Instance 1 │                │ Node.js Instance 2 │
└──────────┬─────────┘                └──────────┬─────────┘
           │                                     │
           └──────────────────┬──────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Redis Cache   │  │ RabbitMQ Queue  │  │  PostgreSQL DB  │
└─────────────────┘  └────────┬────────┘  └─────────────────┘
                              │
                     ┌────────▼────────┐
                     │ Worker Services │
                     └─────────────────┘

```

### Kết quả kiểm thử chịu tải

Kết quả đo lường hệ thống bằng công cụ k6 với kịch bản mô phỏng 1.000 sinh viên đồng thời gửi yêu cầu điểm danh trong 10 giây:

* **Thông lượng (Throughput):** ~632 RPS (Requests/second)
* **Độ trễ trung bình (Avg Latency):** 185 ms
* **Tỷ lệ lỗi (Error Rate):** 0.00% (nhờ cơ chế xếp hàng của RabbitMQ)

### Chạy dự án trên máy local

#### Yêu cầu

* Node.js 20 trở lên.
* Docker Desktop đang hoạt động.
* PostgreSQL 16 cài trực tiếp trên máy, hoặc chạy PostgreSQL bằng Docker.

#### Cấu hình môi trường

Dự án sử dụng các file môi trường riêng:

* `server/.env`: cấu hình server chạy local, kết nối qua `127.0.0.1`.
* `.env.docker`: cấu hình container, sử dụng hostname `postgres`, `redis` và `rabbitmq`.
* `client/.env.local`: cấu hình Next.js local, gọi API tại `http://localhost:3000`.

Không commit `.env`, `.env.docker` hoặc `client/.env.local` vì các file này có thể chứa thông tin nhạy cảm.

#### 1. Khởi động Redis và RabbitMQ

Tại thư mục gốc của dự án:

```powershell
docker compose --env-file .env.docker up -d redis rabbitmq
```

Nếu chưa cài PostgreSQL trên máy và muốn chạy database bằng Docker:

```powershell
docker compose --env-file .env.docker up -d postgres redis rabbitmq
```

Kiểm tra trạng thái:

```powershell
docker compose --env-file .env.docker ps
```

#### 2. Chuẩn bị database lần đầu

Mở PowerShell tại thư mục `server`:

```powershell
cd server
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:local
npm.cmd run seed:local
```

Lệnh seed tạo role, permission và tài khoản quản trị mặc định `admin` / `admin`.

#### 3. Chạy server

Trong thư mục `server`:

```powershell
npm.cmd run dev
```

Server chạy tại `http://localhost:3000`. Có thể kiểm tra bằng `http://localhost:3000/health`. Server sử dụng watch mode và tự khởi động lại khi mã nguồn thay đổi.

#### 4. Chạy client

Mở terminal khác:

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

Client chạy tại `http://localhost:3001`; trang đăng nhập quản trị nằm tại `http://localhost:3001/admin`. Next.js tự cập nhật giao diện khi mã nguồn thay đổi.

#### 5. Dừng hạ tầng Docker

```powershell
docker compose --env-file .env.docker stop redis rabbitmq
```

Nếu PostgreSQL cũng chạy bằng Docker:

```powershell
docker compose --env-file .env.docker stop postgres redis rabbitmq
```

---

## 🇬🇧 English

### Overview

An event-driven conduct score management platform built to optimize student activity administration in universities. The system addresses three primary administrative bottlenecks:

* **High-concurrency failures:** Prevents system crashes during peak check-in hours at large-scale events.
* **Attendance fraud:** Eliminates proxy check-ins caused by remote QR code sharing.
* **Delayed updates:** Replaces manual post-event Excel processing with real-time score sync.

### Key Features

* **High-Concurrency Real-Time Check-In:**
* **Organizer Mode:** Rapid student ID barcode scanning at gate entrances via handheld devices or mobile apps.
* **Self Check-In Mode:** Event QR scanning via student app, enforced with GPS Geofencing (Haversine formula) to verify physical presence and eliminate proxy check-ins.


* **Smart Advisor Engine:** Evaluates missing conduct criteria against student class schedules to suggest personalized, actionable event recommendations.
* **Digital Proof & Dispute Resolution:** Online portal allowing students to submit image proof for unrecorded attendance or reading errors, with an administrative review interface.
* **Progress Dashboard:** Real-time visual progress tracking against evaluation tiers (Good, Very Good, Excellent).

### Tech Stack

* **Frontend:** Next.js 14 (App Router), Tailwind CSS, PWA.
* **Backend:** Node.js (TypeScript), Express, RESTful APIs, WebSockets.
* **Load Balancer:** Nginx (Reverse Proxy, Round-Robin algorithm, TLS termination).
* **Queue & Caching:** RabbitMQ (Asynchronous check-in queue with TTL retries + DLQ), Redis (Session caching, idempotency locks, Pub/Sub fan-out for SSE).
* **Database:** PostgreSQL 16 (schema managed via Prisma migrations).
* **Observability:** Prometheus + Grafana, /metrics endpoints on API and Worker.

### System Architecture Diagram

```text
                     ┌──────────────────┐
                     │   User Requests  │
                     └────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Nginx Balancer   │
                    └─────────┬─────────┘
                              │
           ┌──────────────────┴──────────────────┐
           ▼                                     ▼
┌────────────────────┐                ┌────────────────────┐
│ Node.js Instance 1 │                │ Node.js Instance 2 │
└──────────┬─────────┘                └──────────┬─────────┘
           │                                     │
           └──────────────────┬──────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Redis Cache   │  │ RabbitMQ Queue  │  │  PostgreSQL DB  │
└─────────────────┘  └────────┬────────┘  └─────────────────┘
                              │
                     ┌────────▼────────┐
                     │ Worker Services │
                     └─────────────────┘

```

### Performance & Load Testing

Load testing results executed via k6 simulating 1,000 concurrent student check-ins over a 10-second period:

* **Throughput:** ~632 RPS (Requests/second)
* **Average Latency:** 185 ms
* **Error Rate:** 0.00% (buffered asynchronously by RabbitMQ)

### Running the project locally

#### Requirements

* Node.js 20 or newer.
* Docker Desktop running.
* PostgreSQL 16 installed locally, or PostgreSQL running in Docker.

#### Environment configuration

The project uses separate environment files:

* `server/.env`: configuration for the locally running server; services are reached through `127.0.0.1`.
* `.env.docker`: container configuration using the `postgres`, `redis`, and `rabbitmq` hostnames.
* `client/.env.local`: local Next.js configuration pointing to `http://localhost:3000`.

Do not commit `.env`, `.env.docker`, or `client/.env.local`, as they may contain sensitive values.

#### 1. Start Redis and RabbitMQ

From the project root directory:

```powershell
docker compose --env-file .env.docker up -d redis rabbitmq
```

If PostgreSQL is not installed locally and should also run in Docker:

```powershell
docker compose --env-file .env.docker up -d postgres redis rabbitmq
```

Check the service status:

```powershell
docker compose --env-file .env.docker ps
```

#### 2. Prepare the database for the first run

Open PowerShell in the `server` directory:

```powershell
cd server
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:local
npm.cmd run seed:local
```

The seed command creates the roles, permissions, and the default `admin` / `admin` administrator account.

#### 3. Start the server

From the `server` directory:

```powershell
npm.cmd run dev
```

The server runs at `http://localhost:3000`. Use `http://localhost:3000/health` to verify it. Watch mode automatically restarts the server when source files change.

#### 4. Start the client

Open another terminal:

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

The client runs at `http://localhost:3001`, and the administrator sign-in page is available at `http://localhost:3001/admin`. Next.js refreshes the interface automatically when source files change.

#### 5. Stop the Docker infrastructure

```powershell
docker compose --env-file .env.docker stop redis rabbitmq
```

If PostgreSQL is also running in Docker:

```powershell
docker compose --env-file .env.docker stop postgres redis rabbitmq
```
