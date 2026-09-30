-- TDTU Training Point Management System - Postgres bootstrap.
-- Chạy một lần lúc khởi động container đầu tiên qua docker-entrypoint-initdb.d.
-- LƯU Ý: file này KHÔNG được tạo bảng - schema thuộc về Prisma
-- migrations, được áp dụng bởi service `db-migrate` trong compose.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optimize for barcode scan ingestion (short concurrent transactions).
ALTER SYSTEM SET max_connections = 150;
ALTER SYSTEM SET work_mem = '32MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET synchronous_commit = off;
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET checkpoint_timeout = '300s';

-- Health check role used by docker-compose healthcheck.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '_health') THEN
    EXECUTE 'CREATE ROLE _health WITH LOGIN';
  END IF;
END
$$;
