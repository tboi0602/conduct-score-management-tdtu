# Amazon S3 for attendance appeal evidence

Create a private S3 bucket in the same AWS region as the API. Keep Block Public Access enabled.

Configure the server environment:

```env
AWS_REGION=ap-southeast-1
AWS_S3_APPEAL_BUCKET=your-private-bucket
AWS_ACCESS_KEY_ID=local-development-only
AWS_SECRET_ACCESS_KEY=local-development-only
APPEAL_CLEANUP_INTERVAL_MS=3600000
```

Use an IAM role in production. The API role needs only these actions on
`arn:aws:s3:::your-private-bucket/appeals/*`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-private-bucket/appeals/*"
    }
  ]
}
```

Allow direct browser uploads from the client origin:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["POST"],
    "AllowedOrigins": ["http://localhost:3001"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

Replace the local origin with the production HTTPS origin before deployment. Evidence objects remain
private; authenticated API endpoints return five-minute presigned download URLs. The worker deletes
the S3 object and appeal row after an approved or rejected appeal has been retained for three days.
