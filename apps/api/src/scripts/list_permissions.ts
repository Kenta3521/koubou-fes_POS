import prisma from '../utils/prisma.js';

async function main() {
    const permissions = await prisma.permission.findMany();
    // Sort by category then name
    permissions.sort((a, b) => {
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;
        if (a.code < b.code) return -1;
        if (a.code > b.code) return 1;
        return 0;
    });
    console.log(JSON.stringify(permissions, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        // We don't want to close the shared prisma instance if other things are running,
        // but for a script it's fine. 
        // Actually, seed_rbac doesn't export closePrisma, but utils/prisma does.
    });
