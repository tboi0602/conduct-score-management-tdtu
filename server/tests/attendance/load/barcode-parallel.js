import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";

const manifest = JSON.parse(open("../../.artifacts/attendance-load-manifest.json"));
const apiBaseUrl = __ENV.API_BASE_URL || "http://localhost";
const scannerCount = Math.max(2, Math.min(3, Number(__ENV.SCANNER_COUNT || 3)));
const students = manifest.students.slice(0, Number(__ENV.STUDENT_COUNT || 1000));

function scannerLists() {
  if (scannerCount === 2) {
    return [
      [...students.slice(0, 100), ...students.slice(100, 500)],
      [...students.slice(0, 100), ...students.slice(500)],
    ];
  }
  return [
    [...students.slice(0, 100), ...students.slice(100, 400)],
    [...students.slice(0, 100), ...students.slice(400, 700)],
    [...students.slice(0, 100), ...students.slice(700)],
  ];
}

const lists = scannerLists();
const scenarios = {};
for (let index = 0; index < scannerCount; index += 1) {
  scenarios[`scanner_${String.fromCharCode(97 + index)}`] = {
    executor: "shared-iterations",
    exec: `scanner${String.fromCharCode(65 + index)}`,
    vus: 1,
    iterations: lists[index].length,
    maxDuration: "3m",
    gracefulStop: "30s",
  };
}

export const options = {
  scenarios,
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

function scan(scannerIndex) {
  const student = lists[scannerIndex][exec.scenario.iterationInTest];
  const organizer = manifest.organizers[scannerIndex];
  const response = http.post(
    `${apiBaseUrl}/api/v1/attendance/events/${manifest.eventId}/scan`,
    JSON.stringify({
      studentCode: student.studentCode,
      direction: "CHECK_IN",
      source: "STAFF_BARCODE",
      status: "ATTENDED",
    }),
    {
      headers: {
        Authorization: `Bearer ${organizer.token}`,
        "Content-Type": "application/json",
        "X-Scanner-ID": `scanner-${String.fromCharCode(65 + scannerIndex)}`,
      },
      tags: { flow: "staff_barcode", scanner: `scanner_${scannerIndex + 1}` },
    },
  );
  check(response, { "barcode queued": (result) => result.status === 202 });
  sleep(0.1);
}

export function scannerA() {
  scan(0);
}
export function scannerB() {
  scan(1);
}
export function scannerC() {
  scan(2);
}

export function handleSummary(data) {
  const defaultName = `../../.artifacts/barcode-${scannerCount}-scanners-summary.json`;
  return { [__ENV.K6_SUMMARY_PATH || defaultName]: JSON.stringify(data, null, 2) };
}
