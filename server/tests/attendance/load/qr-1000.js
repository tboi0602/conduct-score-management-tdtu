import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";

const manifest = JSON.parse(open("../../.artifacts/attendance-load-manifest.json"));
const apiBaseUrl = __ENV.API_BASE_URL || "http://localhost";
const count = Math.min(Number(__ENV.STUDENT_COUNT || 1000), manifest.students.length);
const rampUpSeconds = Number(__ENV.RAMP_UP_SECONDS || 60);

export const options = {
  scenarios: {
    qr_1000: {
      executor: "shared-iterations",
      vus: count,
      iterations: count,
      maxDuration: "2m",
      gracefulStop: "30s",
    },
  },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const iteration = exec.scenario.iterationInTest % count;
  const student = manifest.students[iteration];
  // Keep exactly one request per student while spreading the 1,000 requests
  // across the configured ramp-up window. This models students arriving over
  // one minute instead of opening 1,000 sockets in the same millisecond.
  sleep((iteration / count) * rampUpSeconds);
  const response = http.post(
    `${apiBaseUrl}/api/v1/attendance/scan/qr`,
    JSON.stringify({
      token: manifest.qrToken,
      latitude: manifest.coordinates.latitude,
      longitude: manifest.coordinates.longitude,
      accuracyMeters: manifest.coordinates.accuracyMeters,
      clientAttemptId: student.clientAttemptId,
    }),
    {
      headers: {
        Authorization: `Bearer ${student.token}`,
        "Content-Type": "application/json",
        "X-Client-Attempt-ID": student.clientAttemptId,
      },
      tags: { flow: "student_qr" },
    },
  );
  check(response, { "QR accepted asynchronously": (result) => result.status === 202 });
}

export function handleSummary(data) {
  const output = __ENV.K6_SUMMARY_PATH || "../../.artifacts/qr-1000-k6-summary.json";
  return { [output]: JSON.stringify(data, null, 2), stdout: "QR load test completed\n" };
}
