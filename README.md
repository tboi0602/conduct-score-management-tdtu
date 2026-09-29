# TDTU Conduct Score Management System

Hệ thống quản lý điểm rèn luyện, sự kiện và điểm danh sinh viên theo kiến trúc hướng sự kiện. Client sử dụng Next.js 14; API và worker sử dụng Node.js/Express; PostgreSQL được quản lý bằng Prisma; Redis phục vụ cache, phiên và realtime; RabbitMQ xử lý điểm danh bất đồng bộ.

## Địa chỉ mặc định

| Thành phần | Chạy local | Chạy bằng Docker |
| --- | --- | --- |
| Giao diện | <http://localhost:3001> | <http://localhost> |
| API/Health | <http://localhost:3000/health> | <http://localhost/health> |
| RabbitMQ Management | <http://localhost:15672> | <http://localhost:15672> |
| Prometheus | Không khởi động mặc định | <http://localhost:9090> |
| Grafana | Không khởi động mặc định | <http://localhost:3001> |

## Chạy trên máy local

Ở chế độ này, **PostgreSQL phải được cài và chạy trực tiếp trên máy**, không sử dụng container PostgreSQL. Redis và RabbitMQ có thể chạy bằng Docker vì đây là hạ tầng hỗ trợ, không phải database chính.

### 1. Yêu cầu

- Node.js 20 trở lên và npm.
- PostgreSQL 16 cài trực tiếp trên máy.
- Docker Desktop để chạy Redis và RabbitMQ, hoặc tự cài hai dịch vụ này trên máy.

Tạo database rỗng trong PostgreSQL local, ví dụ:

```sql
CREATE DATABASE conduct_score_db;
```

### 2. Tạo file môi trường

Sao chép các file mẫu:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env.local
```

Trong `server/.env`, cấu hình các giá trị local tối thiểu:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:<mat-khau-postgres>@127.0.0.1:5432/conduct_score_db?schema=public&connection_limit=15&pool_timeout=10
REDIS_URL=redis://:redis_secret@127.0.0.1:6379
RABBITMQ_URL=amqp://attendance:mq_secret@127.0.0.1:5672
CLIENT_ORIGIN=http://localhost:3001
JWT_SECRET=<chuoi-bi-mat-dai-va-ngau-nhien>
ATTENDANCE_QR_SECRET=<chuoi-bi-mat-dai-va-ngau-nhien>
GOOGLE_CLIENT_ID=<google-oauth-client-id-neu-su-dung>
```

Trong `client/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-client-id-neu-su-dung>
```

Không commit `server/.env` hoặc `client/.env.local`.

### 3. Khởi động Redis và RabbitMQ

Từ thư mục gốc:

```powershell
docker compose --env-file .env.docker up -d redis rabbitmq
```

Nếu Redis và RabbitMQ đã được cài trực tiếp, chỉ cần bảo đảm URL của chúng trong `server/.env` là chính xác.

### 4. Cài dependency và chuẩn bị database

```powershell
cd server
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run seed
cd ../client
npm.cmd install
cd ..
```

Migration và seed chỉ cần chạy khi cài đặt lần đầu hoặc khi schema/seed thay đổi. Seed được thiết kế để chạy lặp mà không tạo dữ liệu trùng.

### 5. Khởi động ứng dụng

Mở ba terminal tại thư mục dự án:

```powershell
# Terminal 1 - API
cd server
npm.cmd run dev
```

```powershell
# Terminal 2 - attendance worker
cd server
npm.cmd run dev:worker
```

```powershell
# Terminal 3 - client
cd client
npm.cmd run dev
```

Truy cập <http://localhost:3001>. API chạy tại <http://localhost:3000>.

### 6. Dừng hạ tầng hỗ trợ

```powershell
docker compose --env-file .env.docker stop redis rabbitmq
```

Lệnh này không tác động đến PostgreSQL local.

## Chạy toàn bộ bằng Docker với một lệnh

Docker Compose khởi động PostgreSQL, Redis, RabbitMQ, chạy Prisma migration và seed, dựng hai API instance, worker, client, Nginx, Prometheus và Grafana.

### 1. Cấu hình

Kiểm tra `.env.docker` tại thư mục gốc và thay các giá trị bí mật trước khi dùng ngoài môi trường phát triển:

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `RABBITMQ_PASSWORD`
- `JWT_SECRET`
- `ATTENDANCE_QR_SECRET`
- `GRAFANA_ADMIN_PASSWORD`
- `GOOGLE_CLIENT_ID` nếu dùng Google Sign-In

`ATTENDANCE_QR_SECRET` là bắt buộc. Thêm một chuỗi ngẫu nhiên dài vào `.env.docker`, ví dụ tạo chuỗi bằng trình quản lý mật khẩu rồi cấu hình:

```dotenv
ATTENDANCE_QR_SECRET=<chuoi-ngau-nhien-toi-thieu-32-ky-tu>
```

API sẽ từ chối tạo mã QR trong môi trường production nếu biến này chưa được đặt.

Các URL trong file Docker phải dùng hostname service (`postgres`, `redis`, `rabbitmq`), không dùng `127.0.0.1` cho kết nối giữa container.

### 2. Khởi động bằng một lệnh

Từ thư mục gốc dự án:

```powershell
docker compose --env-file .env.docker up -d --build
```

Sau khi các health check hoàn tất, truy cập <http://localhost>. Lần chạy đầu sẽ lâu hơn vì Docker cần tải image, build source, migrate và seed database.

### Kiểm tra trạng thái và log

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f api worker client
```

### Dừng hệ thống

```powershell
docker compose --env-file .env.docker down
```

Lệnh trên giữ lại dữ liệu trong Docker volumes. Chỉ dùng `docker compose down -v` khi chủ động muốn xóa toàn bộ dữ liệu PostgreSQL, Redis, RabbitMQ, Prometheus và Grafana của môi trường Docker.

## Tài khoản và đăng nhập

Seed tạo dữ liệu RBAC và tài khoản quản trị phục vụ phát triển. Kiểm tra cấu hình seed hiện tại trước khi đăng nhập và đổi thông tin xác thực khi dùng ngoài máy phát triển.

Google Sign-In yêu cầu cùng một OAuth Web Client ID trong `GOOGLE_CLIENT_ID` của server và `NEXT_PUBLIC_GOOGLE_CLIENT_ID` của client. Thêm các origin local cần thiết trong Google Cloud Console:

- `http://localhost:3001` khi chạy local.
- `http://localhost` khi chạy toàn bộ bằng Docker.

## Kiểm tra mã nguồn

Client:

```powershell
cd client
npm.cmd run format:check
npx.cmd tsc --noEmit
npm.cmd run build
```

Server:

```powershell
cd server
npm.cmd run typecheck
npm.cmd run build:check
```

`build:check` biên dịch vào thư mục tạm rồi tự dọn, vì vậy có thể chạy khi thư mục `dist`
đang được tiến trình development sử dụng. CI cũng chạy Prisma validate, migration trên PostgreSQL sạch,
format check, typecheck và production build của client.
