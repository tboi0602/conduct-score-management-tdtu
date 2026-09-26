import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const permissionDescriptions = {
  "*": "Toàn quyền truy cập và quản lý hệ thống",
  "user.read": "Xem danh sách và thông tin người dùng",
  "user.create": "Tạo tài khoản người dùng mới",
  "user.update": "Cập nhật thông tin và vai trò người dùng",
  "user.delete": "Xóa tài khoản người dùng",
  "role.read": "Xem danh sách và chi tiết vai trò",
  "role.create": "Tạo vai trò mới",
  "role.update": "Cập nhật tên và quyền của vai trò",
  "role.delete": "Xóa vai trò khỏi hệ thống",
  "permission.read": "Xem danh sách quyền trong hệ thống",
  "permission.create": "Tạo quyền mới",
  "permission.update": "Cập nhật tên và mô tả quyền",
  "permission.delete": "Xóa quyền khỏi hệ thống",
  "auth.login": "Đăng nhập vào hệ thống",
  "event.read": "Xem danh sách và thông tin sự kiện",
  "event.create": "Tạo sự kiện mới",
  "event.update": "Cập nhật thông tin sự kiện",
  "event.delete": "Xóa sự kiện và dữ liệu liên quan",
  "event.manage-any-unit": "Quản lý sự kiện của mọi đơn vị tổ chức",
  "event-registration.read": "Xem các đăng ký sự kiện của sinh viên",
  "event-registration.create": "Đăng ký tham gia sự kiện",
  "event-registration.delete": "Hủy đăng ký tham gia sự kiện",
  "event-registration.manage": "Quản lý danh sách sinh viên đăng ký sự kiện",
  "organizer.read": "Xem danh mục đơn vị tổ chức",
  "organizer.create": "Tạo câu lạc bộ hoặc đoàn hội",
  "organizer.update": "Cập nhật câu lạc bộ hoặc đoàn hội",
  "organizer.delete": "Xóa câu lạc bộ hoặc đoàn hội chưa sử dụng",
  "academic.read": "Xem danh mục khoa, ngành và lớp",
  "academic.create": "Tạo khoa, ngành và lớp",
  "academic.update": "Cập nhật khoa, ngành và lớp",
  "academic.delete": "Xóa khoa, ngành và lớp chưa được sử dụng",
  "criteria.read": "Xem danh sách và thông tin tiêu chí",
  "criteria.create": "Tạo tiêu chí điểm rèn luyện",
  "criteria.update": "Cập nhật tiêu chí điểm rèn luyện",
  "criteria.delete": "Xóa tiêu chí chưa được sử dụng",
  "semester.read": "Xem danh mục học kỳ",
  "semester.create": "Tạo học kỳ",
  "semester.update": "Cập nhật học kỳ",
  "semester.delete": "Xóa học kỳ chưa được sử dụng",
  "attendance.create": "Tạo bản ghi điểm danh sự kiện",
  "attendance.read": "Xem thông tin và lịch sử điểm danh",
  "attendance.manage": "Quản lý quét mã và kết quả điểm danh",
  "attendance.session.manage": "Mở và đóng phiên QR điểm danh",
  "dashboard.read": "Xem thống kê tổng quan theo phạm vi được cấp",
  "student.read": "Xem danh sách và thông tin sinh viên",
  "schedule.read-own": "Xem thời khóa biểu của bản thân",
  "schedule.update-own": "Cập nhật thời khóa biểu của bản thân",
  "appeal.create-own": "Gửi khiếu nại điểm danh của bản thân",
  "appeal.read-own": "Xem khiếu nại điểm danh của bản thân",
  "appeal.read": "Xem khiếu nại điểm danh trong phạm vi quản lý",
  "appeal.manage": "Duyệt hoặc từ chối khiếu nại điểm danh",
} as const;

const conductScorePermissionDescriptions = {
  "academic.class.create": "Tạo lớp trong khoa được gán",
  "academic.class.update": "Cập nhật lớp trong khoa được gán",
  "student.create": "Tạo sinh viên trong khoa được gán",
  "student.update": "Cập nhật sinh viên trong khoa được gán",
  "student.delete": "Xóa sinh viên trong khoa được gán",
  "faculty-staff.read": "Xem nhân sự Ban tổ chức trong khoa",
  "faculty-staff.create": "Tạo nhân sự Ban tổ chức trong khoa",
  "faculty-staff.update": "Cập nhật nhân sự Ban tổ chức trong khoa",
  "faculty-staff.disable": "Khóa hoặc mở khóa nhân sự Ban tổ chức trong khoa",
  "faculty-staff.assign-event-organizer": "Gán vai trò Ban tổ chức trong khoa",
  "conduct-score.read": "Xem điểm rèn luyện trong phạm vi",
  "conduct-score.manage": "Điều chỉnh điểm rèn luyện trong phạm vi",
  "conduct-score.finalize": "Chốt điểm rèn luyện trong phạm vi",
  "conduct-score.reopen": "Mở lại điểm rèn luyện đã chốt",
  "conduct-score.read-own": "Xem điểm rèn luyện của bản thân",
} as const;

const allPermissionDescriptions = {
  ...permissionDescriptions,
  ...conductScorePermissionDescriptions,
} as const;

const permissionsByRole = {
  ADMIN: ["*"],
  EVENT_ORGANIZER: [
    "auth.login",
    "dashboard.read",
    "event.read",
    "event.create",
    "event.update",
    "event.delete",
    "event-registration.read",
    "event-registration.manage",
    "attendance.read",
    "attendance.manage",
    "attendance.session.manage",
    "appeal.read",
    "appeal.manage",
    "organizer.read",
    "academic.read",
    "criteria.read",
    "semester.read",
  ],
  STUDENT_AFFAIRS: [
    "auth.login",
    "dashboard.read",
    "event.read",
    "event.create",
    "event.update",
    "event.delete",
    "event-registration.read",
    "event-registration.manage",
    "attendance.read",
    "attendance.manage",
    "attendance.session.manage",
    "appeal.read",
    "appeal.manage",
    "organizer.read",
    "academic.read",
    "academic.class.create",
    "academic.class.update",
    "criteria.read",
    "semester.read",
    "student.read",
    "student.create",
    "student.update",
    "student.delete",
    "faculty-staff.read",
    "faculty-staff.create",
    "faculty-staff.update",
    "faculty-staff.disable",
    "faculty-staff.assign-event-organizer",
    "conduct-score.read",
    "conduct-score.manage",
    "conduct-score.finalize",
    "conduct-score.reopen",
  ],
  STUDENT: [
    "auth.login",
    "event.read",
    "event-registration.read",
    "event-registration.create",
    "event-registration.delete",
    "attendance.create",
    "organizer.read",
    "academic.read",
    "criteria.read",
    "semester.read",
    "conduct-score.read-own",
    "schedule.read-own",
    "schedule.update-own",
    "appeal.create-own",
    "appeal.read-own",
  ],
} as const;

export async function seedAuthData(prisma: PrismaClient): Promise<void> {
  for (const [permission, description] of Object.entries(allPermissionDescriptions)) {
    await prisma.permission.upsert({
      where: { permission },
      update: { description },
      create: { permission, description },
    });
  }
  for (const [roleName, permissionNames] of Object.entries(permissionsByRole)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    for (const permissionName of permissionNames) {
      const description = allPermissionDescriptions[permissionName];
      const permission = await prisma.permission.upsert({
        where: { permission: permissionName },
        update: { description },
        create: { permission: permissionName, description },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
    const expected = await prisma.permission.findMany({
      where: { permission: { in: [...permissionNames] } },
      select: { id: true },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: expected.map(({ id }) => id) } },
    });
  }

  const supportedRoles = Object.keys(permissionsByRole);
  const obsoleteRoles = await prisma.role.findMany({
    where: { name: { notIn: supportedRoles } },
    select: { id: true, name: true, _count: { select: { userRoles: true } } },
  });
  const assignedObsolete = obsoleteRoles.filter(({ _count }) => _count.userRoles > 0);
  if (assignedObsolete.length) {
    throw new Error(
      `Unsupported assigned roles: ${assignedObsolete.map(({ name }) => name).join(", ")}`,
    );
  }
  await prisma.role.deleteMany({ where: { id: { in: obsoleteRoles.map(({ id }) => id) } } });
  await prisma.permission.deleteMany({ where: { permission: "training-point.read" } });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
  const password = await bcrypt.hash("admin", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin" },
    update: { name: "Administrator", password, status: "ACTIVE" },
    create: { email: "admin", name: "Administrator", password, status: "ACTIVE" },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });
}
