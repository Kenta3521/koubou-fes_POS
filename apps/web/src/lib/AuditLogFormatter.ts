
import { AuditLog } from '@koubou-fes-pos/shared';

/**
 * 監査ログのアクションとペイロードを人間が読みやすい形式に変換する
 */
export const formatAuditLogMessage = (log: AuditLog): string => {
    const { action } = log;
    const payload = log.payload as {
        name?: string;
        price?: number;
        stock?: number;
        email?: string;
        inviteCode?: string;
        changes?: Record<string, { old: unknown; new: unknown }>;
    };

    switch (action) {
        // 認証・ユーザー関連
        case 'LOGIN':
            return 'ログインしました。';
        case 'USER_CREATE':
            return `ユーザー「${payload?.email || '不明'}」が作成されました。`;
        case 'MEMBER_JOIN':
            return `団体に加入しました（招待コード: ${payload?.inviteCode || '直参加'}）。`;
        case 'PASSWORD_RESET_REQ':
            return 'パスワードリセットの申請が行われました。';
        case 'PASSWORD_RESET':
            return 'パスワードをリセットしました。';

        // 商品関連
        case 'PRODUCT_CREATE':
            return `商品「${payload?.name || '名称不明'}」を作成しました（価格: ${payload?.price}円, 在庫: ${payload?.stock ?? 0}）。`;
        case 'PRODUCT_UPDATE': {
            const name = payload?.name || log.targetId;
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
            return `商品「${payload?.name || log.targetId}」を削除しました。`;

        // カテゴリ関連
        case 'CATEGORY_CREATE':
            return `カテゴリ「${payload?.name || '名称不明'}」を作成しました（順序: ${payload?.sortOrder}）。`;
        case 'CATEGORY_UPDATE': {
            const name = payload?.name || log.targetId;
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
            return `カテゴリ「${payload?.name || log.targetId}」を削除しました。`;
        case 'CATEGORY_REORDER':
            return 'カテゴリの並び替えを行いました。';

        // 会計・取引関連
        case 'TRANS_CREATE':
            return `取引を開始しました（点数: ${payload?.itemsCount || 0}, 支払額: ${payload?.totalPayable || 0}円）。`;
        case 'TRANS_COMPLETE':
            return `取引を完了しました（取引ID: ${log.targetId}）。`;
        case 'TRANS_CANCEL':
            return `取引をキャンセルしました（取引ID: ${log.targetId}）。`;
        case 'TRANS_REFUND':
            return `取引を返金処理しました（取引ID: ${log.targetId}）。`;

        // 割引・設定関連
        case 'DISCOUNT_CREATE':
            return `割引「${payload?.name || '名称不明'}」を作成しました（${payload?.type === 'PERCENT' ? `${payload?.value}%引` : `${payload?.value}円引`}）。`;
        case 'DISCOUNT_UPDATE': {
            const name = payload?.name || log.targetId;
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
            return `割引「${payload?.name || log.targetId}」を削除しました。`;

        // 権限・ロール関連
        case 'ROLE_CREATE':
            return `ロール「${payload?.name}」を作成しました。`;
        case 'ROLE_UPDATE':
            return `ロール「${log.targetId}」を更新しました（権限: ${Array.isArray(payload?.permissions) ? payload.permissions.join(', ') : '変更なし'}）。`;
        case 'ROLE_DELETE':
            return `ロール「${log.targetId}」を削除しました。`;
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
