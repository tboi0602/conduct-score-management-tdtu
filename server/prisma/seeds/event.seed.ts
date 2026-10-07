import type { CheckInMode, EventDeliveryMode, EventType, PrismaClient } from "@prisma/client";

type SeedEvent = {
  id: string;
  name: string;
  description: string;
  images?: string[];
  location: string;
  deliveryMode: EventDeliveryMode;
  organizerCode: string;
  criterionId: string;
  timeStart: Date;
  timeEnd: Date;
  registrationStart: Date;
  registrationEnd: Date;
  capacity: number | null;
  points: number;
  checkInMode: CheckInMode;
};

const vietnamTime = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`);

const events: SeedEvent[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Workshop Kỹ năng quản lý thời gian",
    description: "Workshop thực hành các phương pháp lập kế hoạch và quản lý thời gian hiệu quả.",
    images: [
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Hội trường A, TDTU",
    deliveryMode: "OFFLINE",
    organizerCode: "TDTU",
    criterionId: "10000000-0000-4000-8000-000000000003",
    timeStart: vietnamTime("2026-09-28", "13:00"),
    timeEnd: vietnamTime("2026-09-28", "15:00"),
    registrationStart: vietnamTime("2026-09-27", "08:00"),
    registrationEnd: vietnamTime("2026-09-28", "11:30"),
    capacity: 250,
    points: 3,
    checkInMode: "TWO_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    name: "Chạy bộ Vì sức khỏe cộng đồng",
    description:
      "Hoạt động chạy bộ nâng cao sức khỏe và lan tỏa lối sống tích cực trong sinh viên.",
    images: [
      "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Sân vận động TDTU",
    deliveryMode: "OFFLINE",
    organizerCode: "TDTU-CLUB-010",
    criterionId: "10000000-0000-4000-8000-000000000003",
    timeStart: vietnamTime("2026-09-29", "07:30"),
    timeEnd: vietnamTime("2026-09-29", "09:00"),
    registrationStart: vietnamTime("2026-09-20", "08:00"),
    registrationEnd: vietnamTime("2026-09-28", "20:00"),
    capacity: 500,
    points: 5,
    checkInMode: "TWO_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    name: "Chuyên đề An toàn thông tin cho sinh viên",
    description: "Nhận diện rủi ro trên không gian mạng và thực hành bảo vệ tài khoản cá nhân.",
    images: [
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Phòng C004",
    deliveryMode: "OFFLINE",
    organizerCode: "FACULTY:IT",
    criterionId: "10000000-0000-4000-8000-000000000001",
    timeStart: vietnamTime("2026-09-30", "09:30"),
    timeEnd: vietnamTime("2026-09-30", "11:30"),
    registrationStart: vietnamTime("2026-09-22", "08:00"),
    registrationEnd: vietnamTime("2026-09-29", "20:00"),
    capacity: 180,
    points: 4,
    checkInMode: "ONE_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    name: "Ngày hội Hiến máu tình nguyện",
    description: "Chương trình hiến máu nhân đạo dành cho sinh viên đủ điều kiện sức khỏe.",
    images: [
      "https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Nhà thi đấu TDTU",
    deliveryMode: "OFFLINE",
    organizerCode: "TDTU-CLUB-011",
    criterionId: "10000000-0000-4000-8000-000000000004",
    timeStart: vietnamTime("2026-10-01", "15:30"),
    timeEnd: vietnamTime("2026-10-01", "17:30"),
    registrationStart: vietnamTime("2026-09-23", "08:00"),
    registrationEnd: vietnamTime("2026-09-30", "18:00"),
    capacity: 300,
    points: 5,
    checkInMode: "TWO_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    name: "Chủ nhật xanh tại khuôn viên trường",
    description: "Cùng thu gom rác, phân loại chất thải và chăm sóc mảng xanh trong khuôn viên.",
    images: [
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Cổng D, TDTU",
    deliveryMode: "OFFLINE",
    organizerCode: "TDTU-CLUB-001",
    criterionId: "10000000-0000-4000-8000-000000000004",
    timeStart: vietnamTime("2026-10-03", "08:00"),
    timeEnd: vietnamTime("2026-10-03", "11:00"),
    registrationStart: vietnamTime("2026-09-25", "08:00"),
    registrationEnd: vietnamTime("2026-10-02", "20:00"),
    capacity: 120,
    points: 5,
    checkInMode: "TWO_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    name: "Đêm nhạc gây quỹ học bổng",
    description: "Chương trình âm nhạc gây quỹ hỗ trợ sinh viên có hoàn cảnh khó khăn.",
    images: [
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Hội trường 2A",
    deliveryMode: "OFFLINE",
    organizerCode: "TDTU-CLUB-006",
    criterionId: "10000000-0000-4000-8000-000000000003",
    timeStart: vietnamTime("2026-10-04", "18:30"),
    timeEnd: vietnamTime("2026-10-04", "20:00"),
    registrationStart: vietnamTime("2026-09-26", "08:00"),
    registrationEnd: vietnamTime("2026-10-04", "12:00"),
    capacity: null,
    points: 3,
    checkInMode: "ONE_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000007",
    name: "Cuộc thi Ý tưởng khởi nghiệp sinh viên",
    description:
      "Trình bày và phản biện các ý tưởng kinh doanh sáng tạo trước hội đồng chuyên môn.",
    images: [
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Phòng họp C010",
    deliveryMode: "OFFLINE",
    organizerCode: "TDTU-CLUB-007",
    criterionId: "10000000-0000-4000-8000-000000000005",
    timeStart: vietnamTime("2026-10-06", "13:00"),
    timeEnd: vietnamTime("2026-10-06", "16:00"),
    registrationStart: vietnamTime("2026-09-24", "08:00"),
    registrationEnd: vietnamTime("2026-10-05", "17:00"),
    capacity: 100,
    points: 5,
    checkInMode: "TWO_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000008",
    name: "Tập huấn kỹ năng sơ cấp cứu",
    description: "Hướng dẫn xử lý các tình huống sơ cấp cứu thường gặp trong học tập và sinh hoạt.",
    images: [
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Phòng thực hành B005",
    deliveryMode: "OFFLINE",
    organizerCode: "TDTU-CLUB-014",
    criterionId: "10000000-0000-4000-8000-000000000004",
    timeStart: vietnamTime("2026-10-10", "07:00"),
    timeEnd: vietnamTime("2026-10-10", "10:00"),
    registrationStart: vietnamTime("2026-09-28", "08:00"),
    registrationEnd: vietnamTime("2026-10-09", "18:00"),
    capacity: 80,
    points: 4,
    checkInMode: "TWO_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000009",
    name: "Webinar Phương pháp tự học đại học",
    description: "Chia sẻ phương pháp ghi chú, đọc tài liệu và xây dựng kế hoạch tự học hiệu quả.",
    images: [
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Microsoft Teams",
    deliveryMode: "ONLINE",
    organizerCode: "TDTU",
    criterionId: "10000000-0000-4000-8000-000000000001",
    timeStart: vietnamTime("2026-09-27", "19:00"),
    timeEnd: vietnamTime("2026-09-27", "21:00"),
    registrationStart: vietnamTime("2026-09-20", "08:00"),
    registrationEnd: vietnamTime("2026-09-27", "17:00"),
    capacity: null,
    points: 2,
    checkInMode: "ONE_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000010",
    name: "Thử thách trực tuyến 48 giờ sống xanh",
    description: "Ghi nhận các hành động bảo vệ môi trường và chia sẻ kết quả trong vòng 48 giờ.",
    images: [
      "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Cổng hoạt động sinh viên trực tuyến",
    deliveryMode: "ONLINE",
    organizerCode: "TDTU-CLUB-011",
    criterionId: "10000000-0000-4000-8000-000000000004",
    timeStart: vietnamTime("2026-09-30", "19:00"),
    timeEnd: vietnamTime("2026-10-02", "19:00"),
    registrationStart: vietnamTime("2026-09-23", "08:00"),
    registrationEnd: vietnamTime("2026-09-30", "17:00"),
    capacity: null,
    points: 4,
    checkInMode: "ONE_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000011",
    name: "Chuỗi học trực tuyến Kỹ năng nghề nghiệp",
    description: "Chuỗi chuyên đề về CV, phỏng vấn và giao tiếp trong môi trường doanh nghiệp.",
    images: [
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Zoom Webinar",
    deliveryMode: "ONLINE",
    organizerCode: "FACULTY:FBA",
    criterionId: "10000000-0000-4000-8000-000000000001",
    timeStart: vietnamTime("2026-10-05", "19:00"),
    timeEnd: vietnamTime("2026-10-07", "21:00"),
    registrationStart: vietnamTime("2026-09-26", "08:00"),
    registrationEnd: vietnamTime("2026-10-05", "17:00"),
    capacity: 500,
    points: 5,
    checkInMode: "ONE_WAY",
  },
  {
    id: "20000000-0000-4000-8000-000000000012",
    name: "Talkshow trực tuyến Sức khỏe tinh thần",
    description: "Trao đổi cùng chuyên gia về quản lý căng thẳng và cân bằng cuộc sống sinh viên.",
    images: [
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
    ],
    location: "Google Meet",
    deliveryMode: "ONLINE",
    organizerCode: "TDTU-CLUB-023",
    criterionId: "10000000-0000-4000-8000-000000000003",
    timeStart: vietnamTime("2026-10-12", "19:00"),
    timeEnd: vietnamTime("2026-10-12", "21:00"),
    registrationStart: vietnamTime("2026-09-29", "08:00"),
    registrationEnd: vietnamTime("2026-10-12", "17:00"),
    capacity: 300,
    points: 3,
    checkInMode: "ONE_WAY",
  },
];

export async function seedEvents(prisma: PrismaClient): Promise<void> {
  const semester = await prisma.semester.findUnique({
    where: { year_type: { year: 2026, type: "HK1" } },
    select: { id: true },
  });
  if (!semester) throw new Error("Semester HK1 2026 is required before seeding events");

  const organizerCodes = [...new Set(events.map((event) => event.organizerCode))];
  const organizers = await prisma.organizingUnit.findMany({
    where: { code: { in: organizerCodes } },
    select: { id: true, code: true, type: true },
  });
  const organizersByCode = new Map(organizers.map((organizer) => [organizer.code, organizer]));

  for (const event of events) {
    const organizer = organizersByCode.get(event.organizerCode);
    if (!organizer) throw new Error(`Organizing unit ${event.organizerCode} is required`);
    const data = {
      criteriaId: event.criterionId,
      semesterId: semester.id,
      organizerId: organizer.id,
      name: event.name,
      description: event.description,
      descriptionPreview: event.description.slice(0, 500),
      images: event.images ?? [],
      location: event.location,
      deliveryMode: event.deliveryMode,
      timeStart: event.timeStart,
      timeEnd: event.timeEnd,
      registrationStart: event.registrationStart,
      registrationEnd: event.registrationEnd,
      capacity: event.capacity,
      points: event.points,
      type: organizer.type as EventType,
      checkInMode: event.checkInMode,
      attendanceRadiusMeters: 100,
    };
    await prisma.event.upsert({
      where: { id: event.id },
      update: data,
      create: { id: event.id, ...data },
    });
  }
}
