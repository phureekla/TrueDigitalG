import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // Create Users
  const user1 = await prisma.user.create({ data: { name: 'Alice' } });
  const user2 = await prisma.user.create({ data: { name: 'Bob' } });

  // Create Content
  const content1 = await prisma.content.create({ data: { title: 'Movie A', category: 'Action' } });
  const content2 = await prisma.content.create({ data: { title: 'Movie B', category: 'Comedy' } });
  const content3 = await prisma.content.create({ data: { title: 'Movie C', category: 'Drama' } });
  const content4 = await prisma.content.create({ data: { title: 'Movie D', category: 'Action' } });
  const content5 = await prisma.content.create({ data: { title: 'Movie E', category: 'Sci-Fi' } });

  // Create Watch History
  await prisma.userWatchHistory.createMany({
    data: [
      { userId: user1.id, contentId: content1.id },
      { userId: user1.id, contentId: content2.id },
      { userId: user2.id, contentId: content3.id },
    ],
  });

  console.log('Data seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
