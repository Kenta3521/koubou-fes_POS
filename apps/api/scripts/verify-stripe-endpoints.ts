/**
 * Stripe エンドポイント動作確認スクリプト (iOS-3-1)
 * 実行: npx ts-node --esm scripts/verify-stripe-endpoints.ts
 */
import 'dotenv/config';

const BASE_URL = 'http://localhost:3001/api/v1';

async function main() {
    // 1. ログイン（管理者ロールのユーザー: enable_tap_to_pay 権限あり）
    console.log('\n=== Step 1: ログイン (管理者) ===');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'leader@yakisoba.example.com', password: 'password123' }),
    });
    const loginData = (await loginRes.json()) as any;
    if (!loginData.success) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    const { token } = loginData.data;
    const orgId = loginData.data.user.organizations[0].id;
    const permissions: string[] = loginData.data.user.organizations[0].permissions ?? [];
    console.log(`✅ ログイン成功 orgId=${orgId}`);
    console.log(`   権限: ${permissions.slice(0, 5).join(', ')}...`);
    const hasTTP = permissions.includes('enable_tap_to_pay');
    console.log(`   enable_tap_to_pay: ${hasTTP ? '✅ あり' : '❌ なし'}`);

    // 2. connection-token 取得
    console.log('\n=== Step 2: connection-token 取得 ===');
    const ctRes = await fetch(`${BASE_URL}/stripe/connection-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const ctData = (await ctRes.json()) as any;
    if (!ctData.success) {
        console.error(`❌ connection-token 失敗: ${JSON.stringify(ctData)}`);
    } else {
        console.log(`✅ connection-token 取得成功`);
        console.log(`   secret: ${String(ctData.data.secret).substring(0, 20)}...`);
    }

    // 3. 取引作成 (TAP_TO_PAY)
    console.log('\n=== Step 3: TAP_TO_PAY 取引作成 ===');
    const productsRes = await fetch(`${BASE_URL}/organizations/${orgId}/products`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const productsData = (await productsRes.json()) as any;
    const product = productsData.data?.[0];
    if (!product) throw new Error('商品が見つかりません');
    console.log(`   使用商品: ${product.name} (¥${product.price})`);

    const txRes = await fetch(`${BASE_URL}/organizations/${orgId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            items: [{ productId: product.id, quantity: 1 }],
            paymentMethod: 'TAP_TO_PAY',
        }),
    });
    const txData = (await txRes.json()) as any;
    if (!txData.success) throw new Error(`取引作成失敗: ${JSON.stringify(txData)}`);
    const transactionId = txData.data.id;
    const totalAmount = txData.data.totalAmount;
    console.log(`✅ 取引作成成功 id=${transactionId} total=¥${totalAmount}`);

    // 4. create-payment-intent
    console.log('\n=== Step 4: create-payment-intent ===');
    const piRes = await fetch(`${BASE_URL}/stripe/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, transactionId }),
    });
    const piData = (await piRes.json()) as any;
    if (!piData.success) {
        console.error(`❌ create-payment-intent 失敗: ${JSON.stringify(piData)}`);
    } else {
        console.log(`✅ PaymentIntent 作成成功`);
        console.log(`   paymentIntentId: ${piData.data.paymentIntentId}`);
        console.log(`   clientSecret: ${String(piData.data.clientSecret).substring(0, 30)}...`);
    }
    const paymentIntentId = piData.data?.paymentIntentId;

    // 5. 冪等性チェック: 同じ transactionId で再度呼ぶと同じ PaymentIntent が返る
    if (paymentIntentId) {
        console.log('\n=== Step 5: 冪等性チェック（同じ取引で再度 create-payment-intent）===');
        const pi2Res = await fetch(`${BASE_URL}/stripe/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ orgId, transactionId }),
        });
        const pi2Data = (await pi2Res.json()) as any;
        if (!pi2Data.success) {
            console.error(`❌ 冪等性チェック失敗: ${JSON.stringify(pi2Data)}`);
        } else {
            const same = pi2Data.data.paymentIntentId === paymentIntentId;
            console.log(`${same ? '✅' : '❌'} 同じ PaymentIntentId が返却: ${same}`);
        }
    }

    // 6. cancel-payment-intent
    if (paymentIntentId) {
        console.log('\n=== Step 6: cancel-payment-intent ===');
        const cancelRes = await fetch(`${BASE_URL}/stripe/cancel-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ paymentIntentId }),
        });
        const cancelData = (await cancelRes.json()) as any;
        if (!cancelData.success) {
            console.error(`❌ cancel-payment-intent 失敗: ${JSON.stringify(cancelData)}`);
        } else {
            console.log(`✅ PaymentIntent キャンセル成功 status=${cancelData.data.status}`);
        }
    }

    // 7. 権限なしユーザーでテスト（スタッフロール）
    console.log('\n=== Step 7: 権限なしユーザー（スタッフ）でのアクセス拒否確認 ===');
    const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'staff@yakisoba.example.com', password: 'password123' }),
    });
    const staffLoginData = (await staffLoginRes.json()) as any;
    const staffToken = staffLoginData.data?.token;
    const staffOrgId = staffLoginData.data?.user?.organizations?.[0]?.id;
    const staffPerms: string[] = staffLoginData.data?.user?.organizations?.[0]?.permissions ?? [];
    console.log(`   スタッフ権限: ${staffPerms.join(', ')}`);
    const staffHasTTP = staffPerms.includes('enable_tap_to_pay');
    console.log(`   enable_tap_to_pay: ${staffHasTTP ? '⚠️ あり（予期外）' : '✅ なし（期待通り）'}`);

    if (staffToken && staffOrgId) {
        // スタッフが取引作成後 create-payment-intent を呼ぶ → 403 期待
        const staffTxRes = await fetch(`${BASE_URL}/organizations/${staffOrgId}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
            body: JSON.stringify({
                items: [{ productId: product.id, quantity: 1 }],
                paymentMethod: 'TAP_TO_PAY',
            }),
        });
        const staffTxData = (await staffTxRes.json()) as any;
        if (staffTxData.success) {
            const staffTxId = staffTxData.data.id;
            const denyRes = await fetch(`${BASE_URL}/stripe/create-payment-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
                body: JSON.stringify({ orgId: staffOrgId, transactionId: staffTxId }),
            });
            const denyData = (await denyRes.json()) as any;
            if (!denyData.success && denyData.error?.code === 'PERMISSION_DENIED') {
                console.log('✅ スタッフは 403 PERMISSION_DENIED で拒否された');
            } else if (denyData.success) {
                console.log('⚠️ スタッフが create-payment-intent に成功（スタッフに enable_tap_to_pay 権限がある場合は正常）');
            } else {
                console.log(`ℹ️ レスポンス: ${JSON.stringify(denyData)}`);
            }
        }
    }

    console.log('\n=== ✅ 全テスト完了 ===\n');
}

main().catch(err => {
    console.error('\n❌ テスト失敗:', err.message || err);
    process.exit(1);
});
