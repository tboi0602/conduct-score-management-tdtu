type NodeEnvironment = "development" | "test" | "production";

function numberValue(name: string, fallback: number, minimum = 0): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} must be a number greater than or equal to ${minimum}`);
  }
  return value;
}

function nodeEnvironment(): NodeEnvironment {
  const value = process.env.NODE_ENV ?? "development";
  if (value !== "development" && value !== "test" && value !== "production") {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  return value;
}

export const env = {
  nodeEnv: nodeEnvironment(),
  apiPort: numberValue("PORT", numberValue("API_PORT", 3000, 1), 1),
  workerHealthPort: numberValue("WORKER_HEALTH_PORT", 9101, 1),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3001",
  logLevel: process.env.LOG_LEVEL ?? "info",
  hostname: process.env.HOSTNAME ?? "local-api",
  jwtSecret: process.env.JWT_SECRET ?? "change_me_rs256_signing_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  attendanceQrSecret: process.env.ATTENDANCE_QR_SECRET ?? "change_me_attendance_qr_secret",
  attendanceOrganizerMaxAccuracyMeters: numberValue(
    "ATTENDANCE_ORGANIZER_MAX_GPS_ERROR_METERS",
    500,
    1,
  ),
  attendanceSseTicketTtlSeconds: numberValue("ATTENDANCE_SSE_TICKET_TTL_SECONDS", 60, 1),
  attendanceRateLimitWindow: numberValue("ATTENDANCE_RATE_LIMIT_WINDOW", 10, 1),
  attendanceStudentRateLimitMax: numberValue("ATTENDANCE_STUDENT_RATE_LIMIT_MAX", 6, 1),
  attendanceManagerRateLimitMax: numberValue("ATTENDANCE_MANAGER_RATE_LIMIT_MAX", 60, 1),
  eventRegistrationRateLimitMax: numberValue("EVENT_REGISTRATION_RATE_LIMIT_MAX", 6, 1),
  eventRegistrationRateLimitWindow: numberValue("EVENT_REGISTRATION_RATE_LIMIT_WINDOW", 10, 1),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  redisIdempotencyTtl: numberValue("REDIS_IDEMPOTENCY_TTL", 86_400, 1),
  redisLockTtlMs: numberValue("REDIS_LOCK_TTL_MS", 1_000, 1),
  redisCacheTtl: numberValue("REDIS_CACHE_TTL", 300, 1),
  redisRateLimitWindow: numberValue("REDIS_RATE_LIMIT_WINDOW", 10, 1),
  redisRateLimitMax: numberValue("REDIS_RATE_LIMIT_MAX", 10, 1),
  rabbitUrl: process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672",
  rabbitExchange: process.env.RABBITMQ_EXCHANGE ?? "conduct-score.events",
  rabbitPrefetch: numberValue("RABBITMQ_PREFETCH", 20, 1),
  rabbitMaxRetries: numberValue("RABBITMQ_MAX_RETRIES", 3),
  rabbitConnectionRetries: numberValue("RABBITMQ_RETRIES", 10),
  awsRegion: process.env.AWS_REGION ?? "ap-southeast-1",
  awsAppealBucket: process.env.AWS_S3_APPEAL_BUCKET,
  appealCleanupIntervalMs: numberValue("APPEAL_CLEANUP_INTERVAL_MS", 60 * 60 * 1000, 1000),
  conductScoreSyncIntervalMs: numberValue("CONDUCT_SCORE_EVENT_SYNC_INTERVAL_MS", 30_000, 1000),
  warningMaintenanceIntervalMs: numberValue(
    "WARNING_MAINTENANCE_INTERVAL_MS",
    24 * 60 * 60 * 1000,
    1000,
  ),
} as const;

export function validateRuntimeEnv(): void {
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(env.clientOrigin);
  } catch {
    throw new Error("CLIENT_ORIGIN must be an absolute HTTP(S) URL");
  }
  if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
    throw new Error("CLIENT_ORIGIN must use HTTP or HTTPS");
  }

  const required = ["DATABASE_URL", "REDIS_URL", "RABBITMQ_URL"];
  if (env.nodeEnv === "production") {
    required.push("JWT_SECRET", "ATTENDANCE_QR_SECRET");
  }
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length)
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}
