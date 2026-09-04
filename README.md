# Hệ thống Quản lý Điểm Rèn luyện Thông minh ( Smart Training Point Management System )

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
