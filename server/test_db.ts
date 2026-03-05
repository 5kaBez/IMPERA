
import { PrismaClient } from '@prisma/client';

async function testConnection() {
    const prisma = new PrismaClient();
    try {
        console.log('Testing connection...');
        const userCount = await prisma.user.count();
        console.log('Success! User count:', userCount);

        const devUser = await prisma.user.findUnique({
            where: { telegramId: '123456' }
        });
        console.log('Dev user:', devUser);
    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
