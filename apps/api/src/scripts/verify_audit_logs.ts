
import axios from 'axios';
import prisma from '../utils/prisma.js';

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function main() {
    console.log('--- 監査ログ 網羅的検証スクリプト 開始 ---');

    try {
        // 1. システム管理者としてログイン (LOGIN ログ期待)
        console.log('[1] システム管理者としてログイン中...');
        const adminLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@koubou-fes.example.com',
            password: 'password123'
        });
        const adminToken = adminLogin.data.data.token;
        const adminId = adminLogin.data.data.user.id;
        console.log('   ログイン成功。');

        // 2. 団体管理者としてログイン (LOGIN ログ期待)
        console.log('[2] 団体管理者としてログイン中...');
        const leaderLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'leader@yakisoba.example.com',
            password: 'password123'
        });
        const leaderToken = leaderLogin.data.data.token;
        const leaderId = leaderLogin.data.data.user.id;
        const orgId = leaderLogin.data.data.user.organizations[0].id;
        console.log(`   ログイン成功。団体ID: ${orgId}`);

        // 3. 商品操作 (PRODUCT_CREATE, PRODUCT_UPDATE ログ期待)
        console.log('[3] 商品操作を実行中...');
        const productRes = await axios.post(`${API_BASE_URL}/organizations/${orgId}/products`, {
            name: '監査テスト商品',
            price: 500,
            stock: 10
        }, { headers: { Authorization: `Bearer ${leaderToken}` } });
        const productId = productRes.data.data.id;

        await axios.patch(`${API_BASE_URL}/organizations/${orgId}/products/${productId}`, {
            price: 600
        }, { headers: { Authorization: `Bearer ${leaderToken}` } });
        console.log('   商品作成・更新完了。');

        // 4. 取引操作 (TRANS_CREATE ログ期待)
        console.log('[4] 取引操作を実行中...');
        const transRes = await axios.post(`${API_BASE_URL}/organizations/${orgId}/transactions`, {
            items: [{ productId, quantity: 1, price: 600 }],
            paymentMethod: 'CASH'
        }, { headers: { Authorization: `Bearer ${leaderToken}` } });
        const transId = transRes.data.data.id;
        console.log(`   取引作成完了。ID: ${transId}`);

        // 5. 割引操作 (DISCOUNT_CREATE ログ期待)
        console.log('[5] 割引操作を実行中...');
        const discountRes = await axios.post(`${API_BASE_URL}/organizations/${orgId}/discounts`, {
            name: '監査テスト割引',
            type: 'FIXED',
            value: 100,
            isActive: true
        }, { headers: { Authorization: `Bearer ${leaderToken}` } });
        const discountId = discountRes.data.data.id;
        console.log(`   割引作成完了。ID: ${discountId}`);

        // 6. カテゴリ操作 (CATEGORY_CREATE ログ期待)
        console.log('[6] カテゴリ操作を実行中...');
        const categoryRes = await axios.post(`${API_BASE_URL}/organizations/${orgId}/categories`, {
            name: '監査テストカテゴリ'
        }, { headers: { Authorization: `Bearer ${leaderToken}` } });
        const categoryId = categoryRes.data.data.id;
        console.log(`   カテゴリ作成完了。ID: ${categoryId}`);

        // 7. ユーザー登録操作 (USER_CREATE, MEMBER_JOIN ログ期待)
        console.log('[7] ユーザー登録操作を実行中...');
        const tempEmail = `audit-test-${Date.now()}@example.com`;
        const registerRes = await axios.post(`${API_BASE_URL}/auth/register`, {
            email: tempEmail,
            password: 'password123',
            name: '監査テスト一般ユーザー',
            inviteCode: 'YAKISOBA2026'
        });
        const tempUserId = registerRes.data.data.user.id;
        const tempToken = registerRes.data.data.token;
        console.log(`   ユーザー登録完了。Email: ${tempEmail}, ID: ${tempUserId}`);

        // 8. ユーザー更新操作 (USER_UPDATE ログ期待)
        console.log('[8] ユーザー更新操作を実行中...');
        await axios.patch(`${API_BASE_URL}/users/me`, {
            name: '監査テスト更新後'
        }, { headers: { Authorization: `Bearer ${tempToken}` } });
        console.log('   ユーザー情報更新完了。');

        // 9. ロール作成操作 (ROLE_CREATE ログ期待)
        console.log('[9] ロール作成操作を実行中...');
        const roleRes = await axios.post(`${API_BASE_URL}/admin/roles`, {
            name: '監査テストロール',
            description: '監査ログ検証用のロールです',
            permissionCodes: ['read:product'],
            organizationId: orgId
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const roleId = roleRes.data.data.id;
        console.log(`   ロール作成完了。ID: ${roleId}`);

        // 10. システム管理操作 (ORG_UPDATE ログ期待)
        console.log('[10] システム管理操作を実行中...');
        await axios.patch(`${API_BASE_URL}/organizations/${orgId}`, {
            name: '焼きそば部（監査テスト中）'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log('   組織情報更新完了。');

        // 非同期のログ記録を待つために少し待機
        console.log('   ログ同期を待機中 (2秒)...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 11. DBから監査ログを検証
        console.log('[11] データベース内のログを検証中...');
        const latestLogs = await prisma.auditLog.findMany({
            where: {
                createdAt: { gte: new Date(Date.now() - 120000) } // 直近2分間
            },
            orderBy: { createdAt: 'desc' }
        });

        const requiredActions = [
            { action: 'LOGIN', userId: adminId },
            { action: 'LOGIN', userId: leaderId },
            { action: 'PRODUCT_CREATE', userId: leaderId },
            { action: 'PRODUCT_UPDATE', userId: leaderId },
            { action: 'TRANS_CREATE', userId: leaderId },
            { action: 'DISCOUNT_CREATE', userId: leaderId },
            { action: 'CATEGORY_CREATE', userId: leaderId },
            { action: 'USER_CREATE', userId: tempUserId },
            { action: 'MEMBER_JOIN', userId: tempUserId },
            { action: 'USER_UPDATE', userId: tempUserId },
            { action: 'ROLE_CREATE', userId: adminId },
            { action: 'ORG_UPDATE', userId: adminId }
        ];

        let allFound = true;
        for (const req of requiredActions) {
            const found = latestLogs.some(l => l.action === req.action && l.userId === req.userId);
            if (found) {
                console.log(`   ✅ Action ${req.action} by User ${req.userId} found.`);
            } else {
                console.error(`   ❌ Action ${req.action} by User ${req.userId} NOT found.`);
                allFound = false;
            }
        }

        if (allFound) {
            console.log('✅ すべての期待されるアクションが正しくログに記録されています。');
        } else {
            console.error('❌ 一部のログが欠落しています。');
        }

        // isSystemAdminAction のチェック
        const adminActionLogs = latestLogs.filter(l => l.isSystemAdminAction);
        console.log(`   システム管理者フラグ付きのログ数: ${adminActionLogs.length}`);
        if (adminActionLogs.length > 0) {
            console.log('✅ システム管理者アクションのフラグ付けが機能しています。');
        } else {
            console.warn('⚠️ システム管理者アクションのフラグが確認できませんでした。');
        }

        // 後片付け
        console.log('[12] クリーンアップ中...');
        try {
            await axios.delete(`${API_BASE_URL}/organizations/${orgId}/products/${productId}`, {
                headers: { Authorization: `Bearer ${leaderToken}` }
            });
            await axios.delete(`${API_BASE_URL}/organizations/${orgId}/discounts/${discountId}`, {
                headers: { Authorization: `Bearer ${leaderToken}` }
            });
            await axios.delete(`${API_BASE_URL}/organizations/${orgId}/categories/${categoryId}`, {
                headers: { Authorization: `Bearer ${leaderToken}` }
            });
            // ロール削除
            await axios.delete(`${API_BASE_URL}/admin/roles/${roleId}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            // 組織名を戻す
            await axios.patch(`${API_BASE_URL}/organizations/${orgId}`, {
                name: '焼きそば部'
            }, { headers: { Authorization: `Bearer ${adminToken}` } });

            // テストユーザーの削除
            await prisma.userOrganizationRole.deleteMany({ where: { userId: tempUserId } });
            await prisma.userOrganization.deleteMany({ where: { userId: tempUserId } });
            await prisma.user.delete({ where: { id: tempUserId } });

            console.log('   完了。');
        } catch (cleanupError) {
            console.warn('   Cleanup failed (non-fatal):', cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
        }

    } catch (error: any) {
        console.error('❌ 検証中にエラーが発生しました:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`   Message: ${error.message}`);
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
