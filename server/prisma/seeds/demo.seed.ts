import type { PrismaClient, Ranking, AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const demoStudents = [
  ["Nguyễn Minh Anh", "student01@tdtu.edu.vn", "SV20260001"],
  ["Trần Hoàng Nam", "student02@tdtu.edu.vn", "SV20260002"],
  ["Lê Khánh Linh", "student03@tdtu.edu.vn", "SV20260003"],
  ["Phạm Gia Huy", "student04@tdtu.edu.vn", "SV20260004"],
  ["Võ Thảo Vy", "student05@tdtu.edu.vn", "SV20260005"],
  ["Đặng Tuấn Kiệt", "student06@tdtu.edu.vn", "SV20260006"],
  ["Bùi Ngọc Hà", "student07@tdtu.edu.vn", "SV20260007"],
  ["Hồ Nhật Minh", "student08@tdtu.edu.vn", "SV20260008"],
  ["Ngô Quỳnh Mai", "student09@tdtu.edu.vn", "SV20260009"],
  ["Đỗ Thành Đạt", "student10@tdtu.edu.vn", "SV20260010"],
  ["Phan Yến Nhi", "student11@tdtu.edu.vn", "SV20260011"],
  ["Huỳnh Đức Long", "student12@tdtu.edu.vn", "SV20260012"],
] as const;

const rankingFor = (score: number): Ranking => {
  if (score >= 90) return "EXCELLENT";
  if (score >= 80) return "GOOD";
  if (score >= 65) return "FAIR";
  if (score >= 50) return "AVERAGE";
  return "POOR";
};

export async function seedDemoData(prisma: PrismaClient): Promise<void> {
  const [studentRole, semester, classes, events, criteria] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: "STUDENT" } }),
    prisma.semester.findUniqueOrThrow({ where: { year_type: { year: 2026, type: "HK1" } } }),
    prisma.class.findMany({ take: 12, orderBy: { code: "asc" }, select: { id: true } }),
    prisma.event.findMany({
      take: 12,
      orderBy: { timeStart: "asc" },
      select: {
        id: true,
        criteriaId: true,
        points: true,
        timeStart: true,
        timeEnd: true,
        checkInMode: true,
      },
    }),
    prisma.criteria.findMany({ take: 5, orderBy: { createdAt: "asc" }, select: { id: true } }),
  ]);

  const password = await bcrypt.hash("student", 12);
  const students = [];

  for (const [index, [name, email, studentCode]] of demoStudents.entries()) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, password, status: "ACTIVE", primaryFacultyId: null },
      create: { email, name, password, status: "ACTIVE" },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: studentRole.id } },
      update: {},
      create: { userId: user.id, roleId: studentRole.id },
    });
    const student = await prisma.student.upsert({
      where: { studentCode },
      update: {
        userId: user.id,
        classId: classes[index % Math.max(classes.length, 1)]?.id ?? null,
      },
      create: {
        userId: user.id,
        studentCode,
        classId: classes[index % Math.max(classes.length, 1)]?.id ?? null,
        phone: `09000000${String(index + 1).padStart(2, "0")}`,
        address: index % 2 === 0 ? "TP. Hồ Chí Minh" : "Khánh Hòa",
        dateOfBirth: new Date(
          `${2002 + (index % 3)}-${String((index % 9) + 1).padStart(2, "0")}-15`,
        ),
      },
    });
    students.push(student);
  }

  for (const [studentIndex, student] of students.entries()) {
    const score = 42 + ((studentIndex * 11) % 56);
    const conductScore = await prisma.conductScore.upsert({
      where: { studentId_semesterId: { studentId: student.id, semesterId: semester.id } },
      update: {
        totalScore: score,
        ranking: rankingFor(score),
        status: studentIndex % 4 === 0 ? "FINAL" : "DRAFT",
      },
      create: {
        studentId: student.id,
        semesterId: semester.id,
        totalScore: score,
        ranking: rankingFor(score),
        status: studentIndex % 4 === 0 ? "FINAL" : "DRAFT",
      },
    });

    const criteriaId = criteria[studentIndex % Math.max(criteria.length, 1)]?.id;
    if (criteriaId) {
      await prisma.conductScoreCriterionTotal.upsert({
        where: { conductScoreId_criteriaId: { conductScoreId: conductScore.id, criteriaId } },
        update: { rawScore: score, cappedScore: Math.min(score, 20) },
        create: {
          conductScoreId: conductScore.id,
          criteriaId,
          rawScore: score,
          cappedScore: Math.min(score, 20),
        },
      });
      await prisma.conductScoreEntry.upsert({
        where: { idempotencyKey: `demo-default-${student.studentCode}` },
        update: { points: score, criteriaId },
        create: {
          conductScoreId: conductScore.id,
          criteriaId,
          points: score,
          source: "DEFAULT_CRITERION",
          reason: "Dữ liệu điểm mẫu học kỳ HK1 2026",
          idempotencyKey: `demo-default-${student.studentCode}`,
        },
      });
    }

    if (score < 50) {
      await prisma.conductScoreWarning.upsert({
        where: { studentId_semesterId: { studentId: student.id, semesterId: semester.id } },
        update: { observedScore: score, status: "ACTIVE" },
        create: {
          studentId: student.id,
          semesterId: semester.id,
          observedScore: score,
          threshold: 50,
        },
      });
    }

    for (const [eventIndex, event] of events.entries()) {
      if ((studentIndex + eventIndex) % 3 === 0) continue;
      const registered = (studentIndex + eventIndex) % 5 !== 0;
      await prisma.eventRegistration.upsert({
        where: { eventId_studentId: { eventId: event.id, studentId: student.id } },
        update: {
          status: registered ? "REGISTERED" : "CANCELLED",
          cancelledAt: registered ? null : event.timeStart,
        },
        create: {
          eventId: event.id,
          studentId: student.id,
          status: registered ? "REGISTERED" : "CANCELLED",
          cancelledAt: registered ? null : event.timeStart,
        },
      });

      if (event.timeEnd < new Date() && registered) {
        const attendanceStatus: AttendanceStatus =
          (studentIndex + eventIndex) % 7 === 0 ? "LATE" : "ATTENDED";
        await prisma.attendanceRecord.upsert({
          where: {
            studentId_eventId_direction: {
              studentId: student.id,
              eventId: event.id,
              direction: "CHECK_IN",
            },
          },
          update: {
            status: attendanceStatus,
            pointsEarned:
              attendanceStatus === "LATE" ? Math.max(event.points - 1, 0) : event.points,
            timeChecking: event.timeStart,
          },
          create: {
            studentId: student.id,
            eventId: event.id,
            direction: "CHECK_IN",
            status: attendanceStatus,
            pointsEarned:
              attendanceStatus === "LATE" ? Math.max(event.points - 1, 0) : event.points,
            timeChecking: new Date(
              event.timeStart.getTime() + (attendanceStatus === "LATE" ? 12 * 60_000 : 5 * 60_000),
            ),
          },
        });
        if (event.checkInMode === "TWO_WAY") {
          await prisma.attendanceRecord.upsert({
            where: {
              studentId_eventId_direction: {
                studentId: student.id,
                eventId: event.id,
                direction: "CHECK_OUT",
              },
            },
            update: {
              status: attendanceStatus,
              pointsEarned: 0,
              timeChecking: event.timeEnd,
            },
            create: {
              studentId: student.id,
              eventId: event.id,
              direction: "CHECK_OUT",
              status: attendanceStatus,
              pointsEarned: 0,
              timeChecking: new Date(event.timeEnd.getTime() - 5 * 60_000),
            },
          });
        }
      }
    }
  }

  for (const event of events) {
    const registeredCount = await prisma.eventRegistration.count({
      where: { eventId: event.id, status: "REGISTERED" },
    });
    await prisma.event.update({ where: { id: event.id }, data: { registeredCount } });
  }
}
