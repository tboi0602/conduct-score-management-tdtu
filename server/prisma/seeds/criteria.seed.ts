import type { PrismaClient } from "@prisma/client";

const trainingCriteria = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    title: "Việc tham gia học tập và tham gia các hoạt động chuyên môn học thuật",
    defaultPoints: 0,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    title: "Việc chấp hành nội quy, quy chế, quy định trong Trường",
    defaultPoints: 20,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    title:
      "Việc tham gia các hoạt động chính trị, xã hội, văn hóa, văn nghệ, thể thao; phòng chống tội phạm và các tệ nạn xã hội; hoạt động phong trào",
    defaultPoints: 0,
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    title: "Việc tham gia các hoạt động cộng đồng, công tác xã hội, công tác tình nguyện",
    defaultPoints: 0,
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    title: "Tinh thần tiên phong, gương mẫu",
    defaultPoints: 0,
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    title: "Điểm thưởng",
    defaultPoints: 0,
  },
] as const;

export async function seedTrainingCriteria(prisma: PrismaClient): Promise<void> {
  for (const criterion of trainingCriteria) {
    await prisma.criteria.upsert({
      where: { id: criterion.id },
      update: {
        title: criterion.title,
        maxPoints: 20,
        defaultPoints: criterion.defaultPoints,
      },
      create: {
        id: criterion.id,
        title: criterion.title,
        maxPoints: 20,
        defaultPoints: criterion.defaultPoints,
      },
    });
  }
}
