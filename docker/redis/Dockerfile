FROM redis:7-alpine

# Redis tuning for high-frequency idempotency + rate-limit workloads.
COPY redis.conf /usr/local/etc/redis/redis.conf
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]