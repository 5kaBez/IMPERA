import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Set user with TG ID 1038062816 as admin
  const user = await prisma.user.upsert({
    where: { telegramId: '1038062816' },
    update: { role: 'admin' },
    create: {
      telegramId: '1038062816',
      firstName: 'Admin',
      username: 'bogtradinga',
      role: 'admin',
    },
  });

  console.log(`✅ Admin user set: ${user.firstName} (@${user.username}) — role: ${user.role}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
