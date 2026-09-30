import "dotenv/config";

import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const tempDir = resolve(process.cwd(), "tests/.artifacts");
const sourceDir = resolve(process.env.ATTENDANCE_REPORT_SOURCE_DIR ?? tempDir);
const runId = process.env.ATTENDANCE_TEST_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = resolve(
  process.env.ATTENDANCE_REPORT_OUTPUT_DIR ??
    resolve(process.cwd(), "../Docs/testing-results", runId),
);
const reportName = "ATTENDANCE_TEST_REPORT.docx";
const reportPath = resolve(outputDir, reportName);

type K6 = {
  state?: { testRunDurationMs?: number };
  metrics?: Record<string, { values?: Record<string, number> }>;
};
type Verification = {
  pass: boolean;
  expectedRecords: number;
  recordCount: number;
  pending: number;
  duplicateRecordGroups: number;
  conductEntries: number;
  unpublishedOutbox: number;
  queueDrainSeconds: number;
  requestGroups: Array<{ source: string; status: string; _count: { _all: number } }>;
};
type Junit = { tests: number; failures: number; errors: number; skipped: number };
type Scenario = { label: string; summary: K6 | null; verification: Verification | null };

const C = {
  blue: "154A9B",
  dark: "102A50",
  gray: "66758A",
  white: "FFFFFF",
  line: "CDD9E7",
  alternate: "F3F6FA",
  green: "15803D",
  greenBg: "DCFCE7",
  red: "B91C1C",
  redBg: "FEE2E2",
  yellow: "A16207",
  yellowBg: "FEF3C7",
};

async function optionalText(name: string): Promise<string | null> {
  try {
    return await readFile(resolve(sourceDir, name), "utf8");
  } catch {
    return null;
  }
}

async function optionalJson<T>(name: string): Promise<T | null> {
  const raw = await optionalText(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseJunit(xml: string | null): Junit | null {
  if (!xml) return null;
  const suites = [...xml.matchAll(/<testsuite\b([^>]*)>/g)];
  if (!suites.length) return null;
  const attr = (source: string, name: string) =>
    Number(source.match(new RegExp(`${name}="([0-9]+)"`))?.[1] ?? 0);
  return suites.reduce<Junit>(
    (sum, suite) => ({
      tests: sum.tests + attr(suite[1], "tests"),
      failures: sum.failures + attr(suite[1], "failures"),
      errors: sum.errors + attr(suite[1], "errors"),
      skipped: sum.skipped + attr(suite[1], "skipped"),
    }),
    { tests: 0, failures: 0, errors: 0, skipped: 0 },
  );
}

function metric(summary: K6 | null, name: string, key: string): number | null {
  const value = summary?.metrics?.[name]?.values?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function number(value: number | null, digits = 2): string {
  if (value === null) return "Chưa có dữ liệu";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(value);
}

function run(value: string, bold = false, color = C.dark, size = 21): TextRun {
  return new TextRun({ text: value, bold, color, size, font: "Arial" });
}

function p(
  value: string,
  options: { bold?: boolean; center?: boolean; color?: string } = {},
): Paragraph {
  return new Paragraph({
    alignment: options.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: 100 },
    children: [run(value, options.bold, options.color)],
  });
}

function h(
  value: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1,
): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 220, after: 120 },
    children: [run(value, true, C.blue, level === HeadingLevel.HEADING_1 ? 29 : 24)],
  });
}

function cell(value: string, header = false, alternate = false): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill: header ? C.blue : alternate ? C.alternate : C.white },
    margins: { top: 80, right: 80, bottom: 80, left: 80 },
    children: [
      new Paragraph({
        alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [run(value, header, header ? C.white : C.dark, 18)],
      }),
    ],
  });
}

function grid(headers: string[], rows: string[][]): Table {
  const border = { style: BorderStyle.SINGLE, color: C.line, size: 4 };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((value) => cell(value, true)) }),
      ...rows.map(
        (row, index) =>
          new TableRow({ children: row.map((value) => cell(value, false, index % 2 === 1)) }),
      ),
    ],
  });
}

function card(label: string, value: string, status: "pass" | "fail" | "neutral"): TableCell {
  const fill = status === "pass" ? C.greenBg : status === "fail" ? C.redBg : C.yellowBg;
  const color = status === "pass" ? C.green : status === "fail" ? C.red : C.yellow;
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill },
    margins: { top: 160, right: 120, bottom: 160, left: 120 },
    children: [
      p(label, { bold: true, center: true, color: C.gray }),
      p(value, { bold: true, center: true, color }),
    ],
  });
}

function requestCount(value: Verification | null): number | null {
  return value?.requestGroups.reduce((sum, group) => sum + group._count._all, 0) ?? null;
}

function scenarioPass(value: Scenario): boolean {
  return (
    (metric(value.summary, "checks", "rate") ?? 0) >= 0.99 &&
    (metric(value.summary, "http_req_failed", "rate") ?? 1) < 0.01 &&
    (metric(value.summary, "http_req_duration", "p(95)") ?? Infinity) <= 1_000 &&
    value.verification?.pass === true &&
    value.verification.pending === 0 &&
    value.verification.duplicateRecordGroups === 0 &&
    value.verification.unpublishedOutbox === 0
  );
}

async function cleanSuccessfulReport(): Promise<void> {
  const outputFiles = await readdir(outputDir, { withFileTypes: true });
  await Promise.all(
    outputFiles
      .filter((entry) => entry.name !== reportName)
      .map((entry) => rm(resolve(outputDir, entry.name), { force: true, recursive: true })),
  );
  if (sourceDir !== outputDir && sourceDir === tempDir) {
    const temporaryFiles = await readdir(sourceDir).catch(() => []);
    await Promise.all(
      temporaryFiles.map((name) => rm(resolve(sourceDir, name), { force: true, recursive: true })),
    );
  }
}

async function main(): Promise<void> {
  const [functional, integration, qr, barcode2, barcode3, qrCheck, barcode2Check, barcode3Check] =
    await Promise.all([
      optionalText("attendance-functional-junit.xml").then(parseJunit),
      optionalText("attendance-integration-junit.xml").then(parseJunit),
      optionalJson<K6>("qr-1000-k6-summary.json"),
      optionalJson<K6>("barcode-2-scanners-summary.json"),
      optionalJson<K6>("barcode-3-scanners-summary.json"),
      optionalJson<Verification>("qr-1000-verification.json"),
      optionalJson<Verification>("barcode-2-scanners-verification.json"),
      optionalJson<Verification>("barcode-3-scanners-verification.json"),
    ]);
  const scenarios: Scenario[] = [
    { label: "QR – 1.000 sinh viên", summary: qr, verification: qrCheck },
    { label: "Barcode – 2 scanner", summary: barcode2, verification: barcode2Check },
    { label: "Barcode – 3 scanner", summary: barcode3, verification: barcode3Check },
  ];
  const evidenceComplete = Boolean(
    functional && integration && scenarios.every((item) => item.summary && item.verification),
  );
  const functionalFailures =
    (functional?.failures ?? 0) +
    (functional?.errors ?? 0) +
    (integration?.failures ?? 0) +
    (integration?.errors ?? 0);
  const overallPass = evidenceComplete && functionalFailures === 0 && scenarios.every(scenarioPass);
  const totalTests = (functional?.tests ?? 0) + (integration?.tests ?? 0);
  const skipped = (functional?.skipped ?? 0) + (integration?.skipped ?? 0);
  const totalRequests = scenarios.reduce(
    (sum, scenario) => sum + (metric(scenario.summary, "http_reqs", "count") ?? 0),
    0,
  );
  const totalErrors = scenarios.reduce(
    (sum, scenario) =>
      sum +
      Math.round(
        (metric(scenario.summary, "http_reqs", "count") ?? 0) *
          (metric(scenario.summary, "http_req_failed", "rate") ?? 0),
      ),
    0,
  );
  const highestP95 = Math.max(
    ...scenarios.map((scenario) => metric(scenario.summary, "http_req_duration", "p(95)") ?? 0),
  );
  const unique = scenarios.every((scenario) => scenario.verification?.duplicateRecordGroups === 0);
  const drained = scenarios.every(
    (scenario) =>
      scenario.verification?.pending === 0 && scenario.verification?.unpublishedOutbox === 0,
  );
  const testRows = [
    [
      "Unit – Geofence, QR token, Worker",
      number(functional?.tests ?? null, 0),
      number(
        functional
          ? functional.tests - functional.failures - functional.errors - functional.skipped
          : null,
        0,
      ),
      number(functional ? functional.failures + functional.errors : null, 0),
      number(functional?.skipped ?? null, 0),
    ],
    [
      "Integration – luồng điểm danh",
      number(integration?.tests ?? null, 0),
      number(
        integration
          ? integration.tests - integration.failures - integration.errors - integration.skipped
          : null,
        0,
      ),
      number(integration ? integration.failures + integration.errors : null, 0),
      number(integration?.skipped ?? null, 0),
    ],
  ];
  const performanceRows = scenarios.map((scenario) => [
    scenario.label,
    number(metric(scenario.summary, "http_reqs", "count"), 0),
    `${number((scenario.summary?.state?.testRunDurationMs ?? 0) / 1_000)} s`,
    `${number(metric(scenario.summary, "http_req_duration", "avg"))} ms`,
    `${number(metric(scenario.summary, "http_req_duration", "med"))} ms`,
    `${number(metric(scenario.summary, "http_req_duration", "p(90)"))} ms`,
    `${number(metric(scenario.summary, "http_req_duration", "p(95)"))} ms`,
    `${number(metric(scenario.summary, "http_req_duration", "max"))} ms`,
    number(metric(scenario.summary, "http_reqs", "rate")),
    `${number((metric(scenario.summary, "checks", "rate") ?? 0) * 100)}%`,
    scenarioPass(scenario) ? "ĐẠT" : "KHÔNG ĐẠT",
  ]);

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 220 },
      children: [run("TDTU CONDUCT SCORE MANAGEMENT SYSTEM", true, C.blue, 34)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [run("BÁO CÁO KIỂM THỬ HIỆU SUẤT ĐIỂM DANH", true, C.dark, 31)],
    }),
    p(`Mã lần chạy: ${runId}`, { center: true }),
    p(
      `Thời điểm tạo: ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())}`,
      { center: true },
    ),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
      children: [
        run(
          overallPass ? "KẾT QUẢ: ĐẠT" : "KẾT QUẢ: KHÔNG ĐẠT",
          true,
          overallPass ? C.green : C.red,
          38,
        ),
      ],
    }),
    h("1. Tổng quan kết quả"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            card("Tổng request", number(totalRequests, 0), totalRequests ? "pass" : "neutral"),
            card("Request lỗi", number(totalErrors, 0), totalErrors ? "fail" : "pass"),
            card(
              "Test chức năng",
              totalTests
                ? `${totalTests - functionalFailures - skipped}/${totalTests}`
                : "Thiếu dữ liệu",
              functionalFailures === 0 && totalTests ? "pass" : "neutral",
            ),
          ],
        }),
      ],
    }),
    p(""),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            card("p95 cao nhất", `${number(highestP95)} ms`, highestP95 <= 1_000 ? "pass" : "fail"),
            card("Dữ liệu trùng", unique ? "0" : "Có", unique ? "pass" : "fail"),
            card("Hàng đợi", drained ? "Đã xử lý hết" : "Còn tồn", drained ? "pass" : "fail"),
          ],
        }),
      ],
    }),
    h("2. Kiểm thử chức năng"),
    grid(["Nhóm", "Tổng", "Đạt", "Thất bại", "Bỏ qua"], testRows),
    ...(!evidenceComplete
      ? [
          p("Lưu ý: thiếu một hoặc nhiều artifact; báo cáo không tự suy đoán kết quả.", {
            color: C.yellow,
          }),
        ]
      : []),
    h("3. Kiểm thử hiệu suất"),
    grid(
      [
        "Kịch bản",
        "Request",
        "Thời gian",
        "Average",
        "Median",
        "p90",
        "p95",
        "Max",
        "Req/s",
        "Thành công",
        "Kết quả",
      ],
      performanceRows,
    ),
    h("4. Flow xử lý và đối soát"),
  ];
  for (const scenario of scenarios) {
    const check = scenario.verification;
    const requests = requestCount(check);
    children.push(
      h(scenario.label, HeadingLevel.HEADING_2),
      p(`${number(requests, 0)} lượt gửi từ thiết bị`, { bold: true, center: true }),
      p("↓", { center: true, color: C.blue }),
      p(`${number(requests, 0)} ScanRequest được API tiếp nhận`, { center: true }),
      p("↓", { center: true, color: C.blue }),
      p(`${number(check?.recordCount ?? null, 0)} AttendanceRecord duy nhất`, {
        bold: true,
        center: true,
      }),
      p("↓", { center: true, color: C.blue }),
      p(
        `${number(check?.duplicateRecordGroups ?? null, 0)} nhóm trùng · ${number(check?.pending ?? null, 0)} pending · ${number(check?.unpublishedOutbox ?? null, 0)} outbox tồn`,
        { center: true },
      ),
      grid(
        ["Đối soát", "Giá trị"],
        [
          [
            "Record mong đợi / thực tế",
            `${number(check?.expectedRecords ?? null, 0)} / ${number(check?.recordCount ?? null, 0)}`,
          ],
          [
            "Thời gian queue drain",
            check ? `${number(check.queueDrainSeconds, 3)} giây` : "Chưa có dữ liệu",
          ],
          [
            "Conduct Score",
            check?.conductEntries
              ? number(check.conductEntries, 0)
              : "Không đánh giá trong kịch bản này",
          ],
        ],
      ),
    );
  }
  children.push(
    h("5. So sánh hai và ba scanner"),
    p(
      `Hai scanner đạt ${number(metric(barcode2, "http_reqs", "rate"))} request/giây; ba scanner đạt ${number(metric(barcode3, "http_reqs", "rate"))} request/giây. Request lớn hơn 1.000 vì các scanner cố tình quét giao nhau để kiểm tra đồng thời và chống ghi trùng.`,
    ),
    h("6. Giải thích chỉ số"),
    p("• Average là thời gian phản hồi trung bình; Median là giá trị của request ở vị trí 50%."),
    p("• p90 và p95 cho biết 90% hoặc 95% request phản hồi không chậm hơn giá trị tương ứng."),
    p("• Request/giây thể hiện khả năng tiếp nhận trung bình của hệ thống."),
    p("• Queue drain là thời gian Worker cần thêm để xử lý hết hàng đợi sau khi ngừng gửi tải."),
    p("• Duplicate là bản ghi trùng cùng sinh viên, sự kiện và chiều điểm danh."),
    h("7. Nhận xét và kết luận"),
    p(
      `Kịch bản QR xử lý 1.000 sinh viên với p95 ${number(metric(qr, "http_req_duration", "p(95)"))} ms.`,
    ),
    p(
      `p95 cao nhất là ${number(highestP95)} ms, ${highestP95 <= 1_000 ? "đạt" : "không đạt"} ngưỡng 1.000 ms.`,
    ),
    p(
      unique
        ? "Không phát hiện AttendanceRecord trùng."
        : "Phát hiện AttendanceRecord trùng, cần điều tra.",
    ),
    p(
      drained
        ? "RabbitMQ, Worker và Outbox đã xử lý hết dữ liệu."
        : "Vẫn còn dữ liệu pending hoặc Outbox chưa publish.",
    ),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300 },
      children: [
        run(
          overallPass ? "KẾT LUẬN NGHIỆM THU: ĐẠT" : "KẾT LUẬN NGHIỆM THU: KHÔNG ĐẠT",
          true,
          overallPass ? C.green : C.red,
          30,
        ),
      ],
    }),
  );

  const document = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 21, color: C.dark } } } },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: "landscape" },
            margin: { top: 650, right: 500, bottom: 650, left: 500 },
          },
        },
        children,
      },
    ],
  });
  await mkdir(outputDir, { recursive: true });
  const buffer = await Packer.toBuffer(document);
  if (buffer.length < 1_000 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("DOCX được tạo không hợp lệ");
  }
  await writeFile(reportPath, buffer);
  if ((await stat(reportPath)).size !== buffer.length) throw new Error("DOCX chưa được ghi đầy đủ");
  await cleanSuccessfulReport();
  process.stdout.write(`${reportPath}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
