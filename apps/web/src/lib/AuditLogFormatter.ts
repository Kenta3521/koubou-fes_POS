
import { AuditLog } from '@koubou-fes-pos/shared';

/**
 * 監査ログのアクションとペイロードを人間が読みやすい形式に変換する
 */
export const formatAuditLogMessage = (log: AuditLog): string => {
    const { action } = log;
    const payload = log.payload as {
        name?: string;
        productName?: string;
        categoryName?: string;
        discountName?: string;
        roleName?: string;
        price?: number;
        stock?: number;
        email?: string;
        inviteCode?: string;
        newMemberId?: string;
        targetUserId?: string;
        reason?: string;
        amount?: number;
        totalAmount?: number;
        theoretical?: number;
        actual?: number;
        diff?: number;
        sortOrder?: number;
        type?: string;
        value?: number;
        permissions?: string[];
        description?: string;
        isActive?: boolean;
        changes?: Record<string, unknown>;
    };

    switch (action) {
        // 認証・ユーザー関連
        case 'LOGIN_SUCCESS':
            return 'ログインしました。';
        case 'LOGIN_FAILURE':
            return `ログインに失敗しました（メール: ${payload?.email || '不明'}）。`;
        case 'USER_REGISTER':
            return `ユーザー「${payload?.email || '不明'}」が新規登録されました。`;
        case 'USER_PROFILE_UPDATE':
            return 'プロフィール情報を更新しました。';
        case 'PASSWORD_CHANGE':
            return 'パスワードを変更しました。';
        case 'MEMBER_JOIN':
            return `団体に加入しました（招待コード: ${payload?.inviteCode || '直参加'}）。`;
        case 'MEMBER_ADD':
            return `メンバー「${payload?.newMemberId || '不明'}」を追加しました。`;
        case 'MEMBER_UPDATE':
            return `メンバー「${payload?.targetUserId || log.targetId}」の情報を更新しました。`;
        case 'MEMBER_REMOVE':
            return `メンバー「${payload?.targetUserId || log.targetId}」を強制脱退させました（理由: ${payload?.reason || '未記載'}）。`;
        case 'MEMBER_LEAVE':
            return `団体から脱退しました（理由: ${payload?.reason || '未記載'}）。`;

        // 商品関連
        case 'PRODUCT_CREATE':
            return `商品「${payload?.productName || '名称不明'}」を作成しました（価格: ${payload?.price}円, 在庫: ${payload?.stock ?? 0}）。`;
        case 'PRODUCT_UPDATE': {
            const name = payload?.productName || log.targetId;
            const changes = payload?.changes || {};
            const changeKeys = Object.keys(changes);

            if (changeKeys.length === 0) {
                return `商品「${name}」を更新しました。`;
            }

            const fieldMap: Record<string, string> = {
                name: '商品名',
                price: '価格',
                stock: '在庫',
                isActive: '有効状態',
                categoryId: 'カテゴリ',
            };

            const changeDesc = changeKeys
                .map(key => fieldMap[key] || key)
                .join(', ');

            return `商品「${name}」の${changeDesc}を更新しました。`;
        }
        case 'PRODUCT_DELETE':
            return `商品「${payload?.productName || log.targetId}」を削除しました。`;

        // カテゴリ関連
        case 'CATEGORY_CREATE':
            return `カテゴリ「${payload?.name || '名称不明'}」を作成しました（順序: ${payload?.sortOrder}）。`;
        case 'CATEGORY_UPDATE': {
            const name = payload?.categoryName || log.targetId;
            const changes = payload?.changes || {};
            const changeKeys = Object.keys(changes);

            if (changeKeys.length === 0) {
                return `カテゴリ「${name}」を更新しました。`;
            }

            const fieldMap: Record<string, string> = {
                name: 'カテゴリ名',
                sortOrder: '表示順',
            };

            const changeDesc = changeKeys
                .map(key => fieldMap[key] || key)
                .join(', ');

            return `カテゴリ「${name}」の${changeDesc}を更新しました。`;
        }
        case 'CATEGORY_DELETE':
            return `カテゴリ「${payload?.categoryName || log.targetId}」を削除しました。`;
        case 'CATEGORY_REORDER':
            return 'カテゴリの並び替えを行いました。';

        // 会計・取引関連
        case 'TRANSACTION_CANCEL':
            return `取引をキャンセルしました（取引ID: ${log.targetId}、理由: ${payload?.reason || '未記載'}）。`;
        case 'TRANSACTION_REFUND':
            return `取引を返金処理しました（取引ID: ${log.targetId}、金額: ${payload?.amount || 0}円、理由: ${payload?.reason || '未記載'}）。`;
        case 'CASH_REPORT_CREATE':
            return `レジ締めを実施しました（理論値: ${payload?.theoretical || 0}円、実際: ${payload?.actual || 0}円、差異: ${payload?.diff || 0}円）。`;

        // 割引・設定関連
        case 'DISCOUNT_CREATE':
            return `割引「${payload?.discountName || '名称不明'}」を作成しました（${payload?.type === 'PERCENT' ? `${payload?.value}%引` : `${payload?.value}円引`}）。`;
        case 'DISCOUNT_UPDATE': {
            const name = payload?.discountName || log.targetId;
            const changes = payload?.changes || {};
            const changeKeys = Object.keys(changes);

            const fieldMap: Record<string, string> = {
                name: '割引名',
                type: '種類',
                value: '値',
                isActive: '有効状態',
            };

            const changeDesc = changeKeys.length > 0
                ? `${changeKeys.map(key => fieldMap[key] || key).join(', ')}を更新しました`
                : '設定を変更しました';

            return `割引「${name}」の${changeDesc}。`;
        }
        case 'DISCOUNT_DELETE':
            return `割引「${payload?.discountName || log.targetId}」を削除しました。`;

        // 権限・ロール関連
        case 'ROLE_CREATE':
            return `ロール「${payload?.roleName || '名称不明'}」を作成しました。`;
        case 'ROLE_UPDATE':
            return `ロール「${payload?.roleName || log.targetId}」を更新しました。`;
        case 'ROLE_DELETE':
            return `ロール「${payload?.roleName || log.targetId}」を削除しました。`;
        case 'ROLE_PERM_SET':
            return `ロール「${log.targetId}」の権限をセットしました。`;
        case 'PERMISSION_DEF':
            return `権限「${log.targetId}」の定義を更新しました（説明: ${payload?.description}）。`;

        // 組織・システム管理
        case 'ORG_CREATE':
            return `団体「${payload?.name}」を新規作成しました。`;
        case 'ORG_UPDATE':
            if (payload?.inviteCode === 'regenerated') {
                return '団体の招待コードを再発行しました。';
            }
            return `団体「${log.targetId}」の設定を更新しました（${payload?.name ? `名称: ${payload.name}` : ''} ${payload?.isActive !== undefined ? `状態: ${payload.isActive ? '有効' : '無効'}` : ''}）。`;

        default:
            return `${action} (ペイロード: ${JSON.stringify(payload)})`;
    }
};
