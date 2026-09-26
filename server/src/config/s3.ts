import { S3Client } from "@aws-sdk/client-s3";
import { ApiError } from "@utils/ApiError";

export const APPEAL_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const APPEAL_EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const s3Client = new S3Client({ region: process.env.AWS_REGION ?? "ap-southeast-1" });

export function appealBucket(): string {
  const bucket = process.env.AWS_S3_APPEAL_BUCKET;
  if (!bucket) throw new ApiError(503, "Appeal evidence storage is not configured");
  return bucket;
}
