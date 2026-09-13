import type { PrismaClient } from "@prisma/client";

type AcademicFaculty = {
  code: string;
  name: string;
  majors: Array<{ code: string; name: string }>;
};

const academicFaculties: AcademicFaculty[] = [
  {
    code: "IT",
    name: "Khoa Công nghệ thông tin",
    majors: [
      { code: "7480101", name: "Khoa học máy tính" },
      { code: "7480102", name: "Mạng máy tính và truyền thông dữ liệu" },
      { code: "7480103", name: "Kỹ thuật phần mềm" },
      { code: "7480104", name: "Hệ thống thông tin" },
    ],
  },

  {
    code: "FOP",
    name: "Khoa Dược",
    majors: [{ code: "7720201", name: "Dược học" }],
  },

  {
    code: "FEEE",
    name: "Khoa Điện - Điện tử",
    majors: [
      { code: "7520201", name: "Kỹ thuật điện" },
      { code: "7520207", name: "Kỹ thuật điện tử - viễn thông" },
      {
        code: "7520207T",
        name: "Kỹ thuật điện tử - viễn thông - Kỹ thuật thiết kế vi mạch bán dẫn",
      },
      { code: "7520216", name: "Kỹ thuật điều khiển và tự động hóa" },
      { code: "7520114", name: "Kỹ thuật cơ điện tử" },
    ],
  },

  {
    code: "AAF",
    name: "Khoa Kế toán",
    majors: [
      { code: "7340301", name: "Kế toán" },
      {
        code: "7340302",
        name: "Kiểm toán - Kiểm toán và Phân tích dữ liệu",
      },
    ],
  },

  {
    code: "FSS",
    name: "Khoa Khoa học thể thao",
    majors: [
      {
        code: "7810301",
        name: "Quản lý thể dục thể thao - Kinh doanh thể thao và tổ chức sự kiện",
      },
      {
        code: "7810301G",
        name: "Quản lý thể dục thể thao - Golf",
      },
      {
        code: "7810301T",
        name: "Quản lý thể dục thể thao - Truyền thông và tiếp thị thể thao",
      },
    ],
  },

  {
    code: "FAS",
    name: "Khoa Khoa học ứng dụng",
    majors: [
      { code: "7420204", name: "Khoa học y sinh" },
      { code: "7420201", name: "Công nghệ sinh học" },
      { code: "7520301", name: "Kỹ thuật hóa học" },
    ],
  },

  {
    code: "SSH",
    name: "Khoa Khoa học xã hội và Nhân văn",
    majors: [
      {
        code: "7810101",
        name: "Du lịch - Quản lý du lịch",
      },
      {
        code: "7810101H",
        name: "Du lịch - Hướng dẫn du lịch",
      },
      { code: "7310301", name: "Xã hội học" },
      { code: "7760101", name: "Công tác xã hội" },
      { code: "7310206", name: "Quan hệ quốc tế" },
      { code: "7310630", name: "Việt Nam học" },
    ],
  },

  {
    code: "CIVIL",
    name: "Khoa Kỹ thuật công trình",
    majors: [
      { code: "7580201", name: "Kỹ thuật xây dựng" },
      {
        code: "7580205",
        name: "Kỹ thuật xây dựng công trình giao thông",
      },
      { code: "7580302", name: "Quản lý xây dựng" },
      { code: "7580101", name: "Kiến trúc" },
      { code: "7580104", name: "Kiến trúc đô thị" },
      { code: "7580105", name: "Quy hoạch vùng và đô thị" },
    ],
  },

  {
    code: "LRTU",
    name: "Khoa Lao động và Công đoàn",
    majors: [
      { code: "7340404", name: "Quản trị nhân lực" },
      {
        code: "7340408",
        name: "Quan hệ lao động - Quản lý quan hệ lao động và Hành vi tổ chức",
      },
    ],
  },

  {
    code: "LAW",
    name: "Khoa Luật",
    majors: [{ code: "7380101", name: "Luật" }],
  },

  {
    code: "ENLABSAFE",
    name: "Khoa Môi trường và Bảo hộ lao động",
    majors: [
      { code: "7850201", name: "Bảo hộ lao động" },
      { code: "7440301", name: "Khoa học môi trường" },
      {
        code: "7520320",
        name: "Kỹ thuật môi trường - Môi trường và Phát triển bền vững",
      },
    ],
  },

  {
    code: "IFA",
    name: "Khoa Mỹ thuật công nghiệp",
    majors: [
      { code: "7580108", name: "Thiết kế nội thất" },
      { code: "7210403", name: "Thiết kế đồ họa" },
      { code: "7210404", name: "Thiết kế thời trang" },
      {
        code: "7210408",
        name: "Nghệ thuật số - Thiết kế truyền thông số",
      },
    ],
  },

  {
    code: "FFL",
    name: "Khoa Ngoại ngữ",
    majors: [
      { code: "7220201", name: "Ngôn ngữ Anh" },
      { code: "7220204", name: "Ngôn ngữ Trung Quốc" },
    ],
  },

  {
    code: "FBA",
    name: "Khoa Quản trị kinh doanh",
    majors: [
      {
        code: "7340101",
        name: "Quản trị kinh doanh - Quản trị nhà hàng - khách sạn",
      },
      {
        code: "7340101C",
        name: "Quản trị kinh doanh - Quản trị chuỗi cung ứng",
      },
      { code: "7340115", name: "Marketing" },
      { code: "7340120", name: "Kinh doanh quốc tế" },
    ],
  },

  {
    code: "FINANCE",
    name: "Khoa Tài chính - Ngân hàng",
    majors: [
      { code: "7340201", name: "Tài chính - Ngân hàng" },
      {
        code: "7340201Q",
        name: "Tài chính - Ngân hàng - Tài chính quốc tế",
      },
      { code: "7340205", name: "Công nghệ tài chính" },
    ],
  },

  {
    code: "FMS",
    name: "Khoa Toán - Thống kê",
    majors: [
      { code: "7460112", name: "Toán ứng dụng" },
      { code: "7460201", name: "Thống kê" },
      { code: "7460108", name: "Khoa học dữ liệu" },
    ],
  },
];

export async function seedAcademicData(prisma: PrismaClient): Promise<void> {
  for (const facultyData of academicFaculties) {
    const faculty = await prisma.faculty.upsert({
      where: { code: facultyData.code },
      update: { name: facultyData.name },
      create: { code: facultyData.code, name: facultyData.name },
    });

    for (const majorData of facultyData.majors) {
      const major = await prisma.major.upsert({
        where: { code: majorData.code },
        update: { name: majorData.name, facultyId: faculty.id },
        create: { code: majorData.code, name: majorData.name, facultyId: faculty.id },
      });

      for (const sequence of [1, 2]) {
        const suffix = String(sequence).padStart(2, "0");
        const code = `K2026-${majorData.code}-${suffix}`;
        await prisma.class.upsert({
          where: { code },
          update: { name: code, majorId: major.id },
          create: { code, name: code, majorId: major.id },
        });
      }
    }
  }
}
