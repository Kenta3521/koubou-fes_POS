import prisma from '../src/utils/prisma.js';
import fs from 'fs/promises';
import path from 'path';

async function main() {
    console.log('Exporting database data...');

    const markdownLines: string[] = [];
    markdownLines.push('# 現在のDB登録データ一覧');
    markdownLines.push(`作成日時: ${new Date().toLocaleString('ja-JP')}`);
    markdownLines.push('');

    // 1. Users
    console.log('Fetching Users...');
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            status: true,
            isSystemAdmin: true,
            createdAt: true,
            organizations: {
                include: {
                    organization: true
                }
            }
        }
    });

    markdownLines.push('## ユーザー一覧');
    markdownLines.push('| ID | 名前 | Email | 権限 | ステータス | 所属団体 |');
    markdownLines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    users.forEach(u => {
        const orgs = u.organizations.map(uo => `${uo.organization.name}(${uo.role})`).join(', ') || 'なし';
        const role = u.isSystemAdmin ? 'システム管理者' : '一般';
        markdownLines.push(`| ${u.id} | ${u.name} | ${u.email} | ${role} | ${u.status} | ${orgs} |`);
    });
    markdownLines.push('');

    // 2. Organizations
    console.log('Fetching Organizations...');
    const orgs = await prisma.organization.findMany({
        include: {
            _count: {
                select: { products: true, discounts: true, members: true }
            }
        }
    });

    markdownLines.push('## 団体一覧');
    markdownLines.push('| ID | 名前 | 招待コード | 状態 | メンバー数 | 商品数 | 割引数 |');
    markdownLines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
    orgs.forEach(o => {
        markdownLines.push(`| ${o.id} | ${o.name} | ${o.inviteCode} | ${o.isActive ? '有効' : '無効'} | ${o._count.members} | ${o._count.products} | ${o._count.discounts} |`);
    });
    markdownLines.push('');

    // 3. Categories & Products by Organization
    console.log('Fetching Products...');
    markdownLines.push('## 団体別商品・カテゴリ一覧');

    for (const org of orgs) {
        markdownLines.push(`### ${org.name}`);

        const categories = await prisma.category.findMany({
            where: { organizationId: org.id },
            include: { products: true }
        });

        const productsNoCat = await prisma.product.findMany({
            where: { organizationId: org.id, categoryId: null }
        });

        if (categories.length === 0 && productsNoCat.length === 0) {
            markdownLines.push('データなし');
            markdownLines.push('');
            continue;
        }

        // Products without category
        if (productsNoCat.length > 0) {
            markdownLines.push('#### カテゴリなし');
            markdownLines.push('| 商品名 | 価格 | 在庫 | 状態 | ID |');
            markdownLines.push('| :--- | :--- | :--- | :--- | :--- |');
            productsNoCat.forEach(p => {
                markdownLines.push(`| ${p.name} | ¥${p.price.toLocaleString()} | ${p.stock} | ${p.isActive ? '販売中' : '停止'} | ${p.id} |`);
            });
            markdownLines.push('');
        }

        // Products by category
        for (const cat of categories) {
            markdownLines.push(`#### カテゴリ: ${cat.name}`);
            if (cat.products.length > 0) {
                markdownLines.push('| 商品名 | 価格 | 在庫 | 状態 | ID |');
                markdownLines.push('| :--- | :--- | :--- | :--- | :--- |');
                cat.products.forEach(p => {
                    markdownLines.push(`| ${p.name} | ¥${p.price.toLocaleString()} | ${p.stock} | ${p.isActive ? '販売中' : '停止'} | ${p.id} |`);
                });
            } else {
                markdownLines.push('商品なし');
            }
            markdownLines.push('');
        }
    }

    // 4. Discounts
    console.log('Fetching Discounts...');
    markdownLines.push('## 割引設定一覧');
    const discounts = await prisma.discount.findMany({
        include: { organization: true, product: true }
    });

    if (discounts.length === 0) {
        markdownLines.push('登録なし');
    } else {
        markdownLines.push('| 団体 | 割引名 | タイプ | 値 | 対象 | 条件 | トリガー | 有効期間 | 状態 |');
        markdownLines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
        discounts.forEach(d => {
            const typeStr = d.type === 'FIXED' ? `¥${d.value}引き` : `${d.value}%OFF`;
            let targetStr = d.targetType;
            if (d.targetType === 'SPECIFIC_PROD' && d.product) {
                targetStr = `商品: ${d.product.name}`;
            }
            const conditionStr = d.conditionType === 'NONE' ? 'なし' : `${d.conditionType} (${d.conditionValue})`;
            const validPeriod = d.validFrom || d.validTo ? `${d.validFrom?.toLocaleString() || '開始なし'} ~ ${d.validTo?.toLocaleString() || '終了なし'}` : '無期限';

            markdownLines.push(`| ${d.organization.name} | ${d.name} | ${typeStr} | ${d.value} | ${targetStr} | ${conditionStr} | ${d.triggerType} | ${validPeriod} | ${d.isActive ? '有効' : '無効'} |`);
        });
    }
    markdownLines.push('');


    // Write file
    const outputPath = path.resolve(process.cwd(), '../../開発資料/DBデータ一覧.md');
    await fs.writeFile(outputPath, markdownLines.join('\n'));
    console.log(`Successfully exported data to ${outputPath}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
