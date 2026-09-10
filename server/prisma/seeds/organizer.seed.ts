import type { PrismaClient } from "@prisma/client";

const studentOrganizations: Array<{ name: string; facultyCode?: string }> = [
  { name: "Đội Thanh niên Xung Kích" },
  { name: "Câu lạc bộ Lý luận trẻ" },
  { name: "Đội Văn phòng Đoàn - Hội TDTU" },
  { name: "Đội Phong trào Đoàn - Hội Trường Đại học Tôn Đức Thắng" },
  { name: "Đội Nhảy Trường Đại học Tôn Đức Thắng" },
  { name: "Ban Nhạc Trường Đại học Tôn Đức Thắng" },
  { name: "Câu lạc bộ Khởi nghiệp Trường Đại học Tôn Đức Thắng" },
  { name: "Câu lạc bộ Guitar G4U" },
  { name: "Câu lạc bộ Nhật ngữ Nigoto" },
  { name: "Đội Cheerleading Stone Squad TDTU" },
  { name: "Đội Công tác xã hội" },
  { name: "Đội Kịch" },
  { name: "Nhóm Học thuật Tiếng Anh Believe in yourself (BY Group)" },
  { name: "Câu lạc bộ Kỹ năng sống" },
  { name: "Câu lạc bộ TDT MC" },
  { name: "Đội Tổ chức sự kiện Trường Đại học Tôn Đức Thắng" },
  { name: "Đội Lễ tân Đại học Tôn Đức Thắng" },
  { name: "Đội Đại sứ" },
  { name: "Ban Liên lạc cựu học sinh Trường THPT đã ký kết tại Đại học Tôn Đức Thắng" },
  { name: "Đội Múa Trường Đại học Tôn Đức Thắng" },
  { name: "Đội Hát Trường Đại học Tôn Đức Thắng" },
  { name: "Đội Sinh viên Truyền thông Trường Đại học Tôn Đức Thắng" },
  { name: "Câu lạc bộ Sức khỏe tâm lý" },
  { name: "Đội Sinh viên tự quản Nhà thi đấu - Sân vận động" },
  { name: "Câu lạc bộ Đồng hành cùng sách" },
  { name: "Nhóm Sinh viên tình nguyện We Grow" },
  { name: "Câu lạc bộ Học thuật IT-Zone" },
  { name: "Câu lạc bộ Văn nghệ Khoa Ngoại ngữ", facultyCode: "FFL" },
  { name: "Câu lạc bộ Tiếng Trung Khoa Ngoại ngữ", facultyCode: "FFL" },
  { name: "Câu lạc bộ Tiếng Anh Khoa Ngoại ngữ", facultyCode: "FFL" },
  { name: "Câu lạc bộ Nghiên cứu khoa học (ARC)", facultyCode: "AAF" },
  { name: "Câu lạc bộ Tổ chức sự kiện (EAC)", facultyCode: "AAF" },
  { name: "Câu lạc bộ Ngoại ngữ (LAC)", facultyCode: "AAF" },
  { name: "Câu lạc bộ Kế toán trẻ (YAC)", facultyCode: "AAF" },
  { name: "Câu lạc bộ Lý luận chính trị", facultyCode: "SSH" },
  { name: "Câu lạc bộ Xã hội học", facultyCode: "SSH" },
  { name: "Câu lạc bộ Kết nối trái tim", facultyCode: "SSH" },
  { name: "Câu lạc bộ Việt ngữ học", facultyCode: "SSH" },
  { name: "Câu lạc bộ Du lịch", facultyCode: "SSH" },
  { name: "Câu lạc bộ Điện tử", facultyCode: "FEEE" },
  { name: "Câu lạc bộ Công tác sự kiện", facultyCode: "IT" },
  { name: "Câu lạc bộ Dare to Open khoa Khoa học ứng dụng Trường Đại học Tôn Đức Thắng", facultyCode: "FAS" },
  { name: "Câu lạc bộ Faculty of Applied Science's English Club", facultyCode: "FAS" },
  { name: "Câu lạc bộ Vườn ươm - Nhà nấm", facultyCode: "FAS" },
  { name: "Câu lạc bộ MIC BAC", facultyCode: "FBA" },
  { name: "Câu lạc bộ BAC MARKETING", facultyCode: "FBA" },
  { name: "Câu lạc bộ BAC - HOSPITALITY", facultyCode: "FBA" },
  { name: "Đội Truyền thông Khoa Quản trị kinh doanh", facultyCode: "FBA" },
  { name: "Đội Văn nghệ Khoa Quản trị kinh doanh", facultyCode: "FBA" },
  { name: "Câu lạc bộ BAC - Human Resrource Management", facultyCode: "FBA" },
  { name: "Câu lạc bộ BAC - Internaltional Business", facultyCode: "FBA" },
  { name: "Câu lạc bộ Quy hoạch kiến trúc", facultyCode: "CIVIL" },
  { name: "Câu lạc bộ Creative Zone", facultyCode: "CIVIL" },
  { name: "Câu lạc bộ Safety – Enviroment", facultyCode: "ENLABSAFE" },
  { name: "Câu lạc bộ Truyền thông", facultyCode: "LRTU" },
  { name: "Câu lạc bộ Đầu tư Chứng khoán Trẻ", facultyCode: "FINANCE" },
  { name: "Câu lạc bộ Anh ngữ Dược khoa", facultyCode: "FOP" },
  { name: "Câu lạc bộ Kỹ năng Skill for you", facultyCode: "FOP" },
  { name: "Câu lạc bộ Văn nghệ - Phân hiệu Khánh Hòa" },
  { name: "Đội Công tác xã hội - Phân hiệu Khánh Hòa" },
  { name: "Đội Sinh viên tự quản Ký túc xá - Phân hiệu Khánh Hòa" },
  { name: "Đội Truyền thông - Phân hiệu Khánh Hòa" },
  { name: "Câu lạc bộ Tin học - Phân hiệu Khánh Hòa" },
  { name: "Đội Cờ đỏ - Phân hiệu Khánh Hòa" },
  { name: "Đội Lễ tân - Phân hiệu Khánh Hòa" },
  { name: "Đội Tổ chức sự kiện - Phân hiệu Khánh Hòa" },
  { name: "Đội Thư viện - Phân hiệu Khánh Hòa" },
  { name: "Câu lạc bộ ENGLISH ZONE - Phân hiệu Khánh Hòa" },
];

export async function seedOrganizingUnits(prisma: PrismaClient): Promise<void> {
  await prisma.organizingUnit.upsert({
    where: { code: "TDTU" },
    update: { type: "UNIVERSITY", name: "Đại học Tôn Đức Thắng", facultyId: null, classId: null },
    create: { type: "UNIVERSITY", code: "TDTU", name: "Đại học Tôn Đức Thắng" },
  });
  const faculties = await prisma.faculty.findMany({ select: { id: true, code: true } });
  for (const faculty of faculties) {
    await prisma.organizingUnit.upsert({
      where: { code: `FACULTY:${faculty.code}` },
      update: { type: "FACULTY", name: null, facultyId: faculty.id, classId: null },
      create: { type: "FACULTY", code: `FACULTY:${faculty.code}`, facultyId: faculty.id },
    });
  }
  const classes = await prisma.class.findMany({ select: { id: true, code: true, major: { select: { facultyId: true } } } });
  for (const academicClass of classes) {
    await prisma.organizingUnit.upsert({
      where: { code: `CLASS:${academicClass.code}` },
      update: { type: "CLASS", name: null, facultyId: academicClass.major.facultyId, classId: academicClass.id },
      create: { type: "CLASS", code: `CLASS:${academicClass.code}`, facultyId: academicClass.major.facultyId, classId: academicClass.id },
    });
  }

  const facultiesByCode = new Map(faculties.map((faculty) => [faculty.code, faculty.id]));
  for (const [index, organization] of studentOrganizations.entries()) {
    const code = `TDTU-CLUB-${String(index + 1).padStart(3, "0")}`;
    const facultyId = organization.facultyCode
      ? facultiesByCode.get(organization.facultyCode)
      : undefined;
    if (organization.facultyCode && !facultyId) {
      throw new Error(`Faculty ${organization.facultyCode} is required by organizing unit ${code}`);
    }
    await prisma.organizingUnit.upsert({
      where: { code },
      update: { type: "CLUB", name: organization.name, facultyId: facultyId ?? null, classId: null },
      create: { type: "CLUB", code, name: organization.name, facultyId: facultyId ?? null },
    });
  }
}
