
import prisma from '../utils/prisma';

async function main() {
    const discounts = await prisma.discount.findMany({
        include: {
            category: true,
            product: true
        }
    });

    console.log('--- Discounts ---');
    discounts.forEach(d => {
        console.log(`ID: ${d.id}`);
        console.log(`Name: ${d.name}`);
        console.log(`Type: ${d.type}`);
        console.log(`Trigger: ${d.triggerType}`);
        console.log(`TargetType: ${d.targetType}`);
        console.log(`TargetProduct: ${d.product?.name}`);
        console.log(`TargetCategory: ${d.category?.name}`);
        console.log(`Condition: ${d.conditionType} ${d.conditionValue}`);
        console.log('---');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
