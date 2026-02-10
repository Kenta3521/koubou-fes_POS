import prisma from '../utils/prisma.js';

async function checkUser() {
    const user = await prisma.user.findUnique({
        where: { id: '434a7ad7-f028-468d-a6a0-6e9c0c802d5f' },
        include: { organizations: true }
    });
    console.log(JSON.stringify(user, null, 2));
    await prisma.$disconnect();
}

checkUser();
