"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Locale } from "@/i18n/messages";

const titles: Record<Locale, Record<string, string>> = {
  vi: {
    "/": "Quản lý điểm rèn luyện TDTU",
    "/login": "Đăng nhập",
    "/admin": "Đăng nhập",
    "/dashboard": "Quản lý điểm rèn luyện TDTU",
    "/events": "Sự kiện | TDTU",
    "/events/check-in": "Điểm danh sự kiện | TDTU",
    "/profile": "Thông tin cá nhân | TDTU",
    "/conduct-scores": "Điểm rèn luyện | TDTU",
    "/qr-scan": "Quét mã QR | TDTU",
    "/schedule": "Thời khóa biểu | TDTU",
    "/appeals": "Khiếu nại | TDTU",
    "/notifications": "Thông báo | TDTU",
    "/admin/dashboard": "Tổng quan quản lý | TDTU",
    "/admin/events": "Quản lý sự kiện | TDTU",
    "/admin/attendance": "Quản lý điểm danh | TDTU",
    "/admin/conduct-scores": "Quản lý điểm rèn luyện | TDTU",
    "/admin/criteria": "Danh mục tiêu chí | TDTU",
    "/admin/semesters": "Danh mục học kỳ | TDTU",
    "/admin/organizers": "Danh mục tổ chức | TDTU",
    "/admin/users": "Quản lý người dùng | TDTU",
    "/admin/roles": "Danh mục vai trò | TDTU",
    "/admin/permissions": "Danh mục quyền | TDTU",
    "/admin/academic/faculties": "Danh mục khoa | TDTU",
    "/admin/academic/majors": "Danh mục ngành | TDTU",
    "/admin/academic/classes": "Danh mục lớp | TDTU",
  },
  en: {
    "/": "Conduct Score Management TDTU",
    "/login": "Login",
    "/admin": "Login",
    "/dashboard": "Conduct Score Management TDTU",
    "/events": "Events | TDTU",
    "/events/check-in": "Event Check-in | TDTU",
    "/profile": "Personal Profile | TDTU",
    "/conduct-scores": "Conduct Score | TDTU",
    "/qr-scan": "QR Scanner | TDTU",
    "/schedule": "Class Schedule | TDTU",
    "/appeals": "Appeals | TDTU",
    "/notifications": "Notifications | TDTU",
    "/admin/dashboard": "Management Dashboard | TDTU",
    "/admin/events": "Event Management | TDTU",
    "/admin/attendance": "Attendance Management | TDTU",
    "/admin/conduct-scores": "Conduct Score Management | TDTU",
    "/admin/criteria": "Criteria Catalog | TDTU",
    "/admin/semesters": "Semester Catalog | TDTU",
    "/admin/organizers": "Organizer Catalog | TDTU",
    "/admin/users": "User Management | TDTU",
    "/admin/roles": "Role Catalog | TDTU",
    "/admin/permissions": "Permission Catalog | TDTU",
    "/admin/academic/faculties": "Faculty Catalog | TDTU",
    "/admin/academic/majors": "Major Catalog | TDTU",
    "/admin/academic/classes": "Class Catalog | TDTU",
  },
};

function getRouteTitle(pathname: string, locale: Locale): string {
  const exactTitle = titles[locale][pathname];
  if (exactTitle) return exactTitle;

  if (/^\/admin\/events\/[^/]+\/registrations$/.test(pathname)) {
    return locale === "vi" ? "Danh sách đăng ký sự kiện | TDTU" : "Event Registrations | TDTU";
  }
  if (/^\/admin\/attendance\/[^/]+$/.test(pathname)) {
    return locale === "vi" ? "Điểm danh sự kiện | TDTU" : "Event Attendance | TDTU";
  }
  if (/^\/admin\/conduct-scores\/[^/]+$/.test(pathname)) {
    return locale === "vi" ? "Chi tiết điểm rèn luyện | TDTU" : "Conduct Score Details | TDTU";
  }

  return titles[locale]["/"];
}

export function RouteTitle() {
  const pathname = usePathname();
  const { locale } = useLanguage();

  useEffect(() => {
    document.title = getRouteTitle(pathname, locale);
  }, [locale, pathname]);

  return null;
}
