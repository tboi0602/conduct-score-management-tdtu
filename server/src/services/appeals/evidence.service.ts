import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

import {
  APPEAL_EVIDENCE_MAX_BYTES,
  APPEAL_EVIDENCE_TYPES,
  appealBucket,
  s3Client,
} from "@config/s3";
import { ApiError } from "@utils/ApiError";

export async function createEvidenceUpload(userId: string, mime: string) {
  if (!APPEAL_EVIDENCE_TYPES.includes(mime as (typeof APPEAL_EVIDENCE_TYPES)[number])) {
    throw new ApiError(400, "Only JPG, PNG and WebP evidence is allowed");
  }
  const key = `appeals/${userId}/${randomUUID()}`;
  const upload = await createPresignedPost(s3Client, {
    Bucket: appealBucket(),
    Key: key,
    Expires: 300,
    Fields: { "Content-Type": mime, "x-amz-meta-owner": userId },
    Conditions: [
      ["content-length-range", 1, APPEAL_EVIDENCE_MAX_BYTES],
      ["eq", "$Content-Type", mime],
      ["eq", "$x-amz-meta-owner", userId],
    ],
  });
  return { ...upload, key, maxBytes: APPEAL_EVIDENCE_MAX_BYTES };
}

export async function verifyEvidence(userId: string, key: string, mime: string, size: number) {
  if (!key.startsWith(`appeals/${userId}/`)) throw new ApiError(400, "Invalid evidence key");
  if (size < 1 || size > APPEAL_EVIDENCE_MAX_BYTES)
    throw new ApiError(400, "Invalid evidence size");
  if (!APPEAL_EVIDENCE_TYPES.includes(mime as (typeof APPEAL_EVIDENCE_TYPES)[number])) {
    throw new ApiError(400, "Invalid evidence type");
  }
  const head = await s3Client.send(new HeadObjectCommand({ Bucket: appealBucket(), Key: key }));
  if (head.Metadata?.owner !== userId || head.ContentType !== mime || head.ContentLength !== size) {
    throw new ApiError(400, "Evidence metadata does not match the uploaded object");
  }
}

export const evidenceUrl = (key: string) =>
  getSignedUrl(s3Client, new GetObjectCommand({ Bucket: appealBucket(), Key: key }), {
    expiresIn: 300,
  });

export async function deleteEvidence(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: appealBucket(), Key: key }));
}
