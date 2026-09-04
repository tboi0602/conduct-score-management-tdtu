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
  "attendance.create": "Tạo bản ghi điểm danh sự kiện",
  "attendance.read": "Xem thông tin và lịch sử điểm danh",
  "training-point.read": "Xem điểm rèn luyện",
  "student.read": "Xem danh sách và thông tin sinh viên",
} as const;

const permissionsByRole = {
  ADMIN: [
    "*",
    "user.read",
    "user.create",
    "user.update",
    "user.delete",
    "role.read",
    "role.create",
    "role.update",
    "role.delete",
    "permission.read",
    "permission.create",
    "permission.update",
    "permission.delete",
  ],
  STUDENT: ["auth.login", "event.read", "attendance.create", "training-point.read"],
  LECTURER: [
    "auth.login",
    "student.read",
    "event.read",
    "attendance.read",
    "training-point.read",
  ],
} as const;

export async function seedAuthData(prisma: PrismaClient): Promise<void> {
  for (const [roleName, permissionNames] of Object.entries(permissionsByRole)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    for (const permissionName of permissionNames) {
      const description = permissionDescriptions[permissionName];
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
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
  const password = await bcrypt.hash("admin", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin" },
    update: { name: "Administrator", password },
    create: { email: "admin", name: "Administrator", password },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });
}
