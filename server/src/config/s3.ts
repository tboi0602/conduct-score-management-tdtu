import { S3Client } from "@aws-sdk/client-s3";
import { ApiError } from "@utils/ApiError";
import { env } from "@config/env";

export const APPEAL_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const APPEAL_EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const s3Client = new S3Client({ region: env.awsRegion });

export function appealBucket(): string {
  const bucket = env.awsAppealBucket;
  if (!bucket) throw new ApiError(503, "Appeal evidence storage is not configured");
  return bucket;
}
