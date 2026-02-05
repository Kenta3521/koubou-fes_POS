import prisma from '../utils/prisma.js';
import { CalculationResult, CalculatedItem, DiscountSummary } from '@koubou-fes-pos/shared';
import { Discount, DiscountTargetType, DiscountConditionType, DiscountTriggerType, DiscountType } from '@prisma/client';

export const calculateOrder = async (
    organizationId: string,
    items: { productId: string; quantity: number }[],
    manualDiscountId?: string
): Promise<CalculationResult> => {
    // 1. 商品情報の取得
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
        where: {
            organizationId,
            id: { in: productIds },
        },
    });

    // 商品マップ作成
    const productMap = new Map(products.map(p => [p.id, p]));

    // 組織外商品チェック & 有効性チェック (P4-017)
    for (const item of items) {
        if (!productMap.has(item.productId)) {
            // 商品が見つからない場合、別組織の商品かチェック
            const productInOtherOrg = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { organizationId: true, name: true }
            });

            if (productInOtherOrg && productInOtherOrg.organizationId !== organizationId) {
                throw new Error(`商品「${productInOtherOrg.name}」は別の組織に属しています。カートをクリアしてください。`);
            }
            // 商品が存在しない場合は後続の処理でエラーになる
        } else {
            const product = productMap.get(item.productId);
            // 本来は削除済み商品はfindManyで取れない可能性があるが、prismaの仕様次第（デフォルトではdeletedAt!=nullも取るはずだか、論理削除フィルタが入っていないか確認必要）
            // 明示的にチェックする
            if (product) {
                if (product.deletedAt) {
                    throw new Error(`PRODUCT_NOT_AVAILABLE: ${product.name} (削除済み)`);
                }
                if (!product.isActive) {
                    throw new Error(`PRODUCT_NOT_AVAILABLE: ${product.name} (販売停止中)`);
                }
            }
        }
    }

    // 2. 有効な割引の取得 (AUTO)
    const now = new Date();
    const allDiscounts = await prisma.discount.findMany({
        where: {
            organizationId,
            isActive: true,
        },
    });

    const activeAutoDiscounts = allDiscounts.filter(d => {
        if (d.triggerType !== DiscountTriggerType.AUTO) return false;
        if (d.validFrom && d.validFrom > now) return false;
        if (d.validTo && d.validTo < now) return false;
        return true;
    });

    // 3. 各商品の計算（自動割引適用）
    const calculatedItems: CalculatedItem[] = items.map(item => {
        const product = productMap.get(item.productId);
        if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
        }

        const originalPrice = product.price;
        let unitPrice = originalPrice;
        let discountAmount = 0;
        let appliedDiscount: DiscountSummary | null = null;

        // 商品対象の自動割引を検索
        const applicableDiscounts = activeAutoDiscounts.filter(d => {
            // 対象チェック
            if (d.targetType === DiscountTargetType.SPECIFIC_PROD && d.targetProductId === item.productId) {
                // 条件チェック
                if (d.conditionType === DiscountConditionType.MIN_QUANTITY) {
                    return item.quantity >= d.conditionValue;
                }
                // 他の条件 (MIN_AMOUNT等) は商品単位だと小計判定？ ここではQuantityのみ対応
                return true;
            }
            // カテゴリ対象等は未実装
            return false;
        });

        // 優先度順にソートして適用
        if (applicableDiscounts.length > 0) {
            applicableDiscounts.sort((a, b) => b.priority - a.priority);
            const bestDiscount = applicableDiscounts[0];

            if (bestDiscount.type === DiscountType.FIXED) {
                discountAmount = bestDiscount.value;
            } else if (bestDiscount.type === DiscountType.PERCENT) {
                discountAmount = Math.floor(originalPrice * (bestDiscount.value / 100));
            }

            // マイナス価格防止
            if (originalPrice - discountAmount < 0) {
                discountAmount = originalPrice;
            }

            unitPrice = originalPrice - discountAmount;
            appliedDiscount = {
                id: bestDiscount.id,
                name: bestDiscount.name,
                type: bestDiscount.type,
                value: bestDiscount.value
            };
        }

        return {
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity,
            originalPrice,
            unitPrice,
            discountAmount,
            appliedDiscount
        } as CalculatedItem;
    });

    // 4. 小計計算
    const grossTotal = calculatedItems.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
    const netTotalAfterItemDiscount = calculatedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const totalItemDiscount = calculatedItems.reduce((sum, item) => sum + (item.discountAmount * item.quantity), 0);

    // 5. 手動割引 / 全体割引の適用
    let totalAmount = netTotalAfterItemDiscount;
    let appliedOrderDiscount: DiscountSummary | null = null;
    let orderDiscountValue = 0;

    if (manualDiscountId) {
        // マニュアル割引の検索と検証
        const manualDiscount = allDiscounts.find(d => d.id === manualDiscountId);

        let isValid = false;
        if (manualDiscount && manualDiscount.triggerType === DiscountTriggerType.MANUAL && manualDiscount.isActive) {
            // 期間チェック
            if ((!manualDiscount.validFrom || manualDiscount.validFrom <= now) &&
                (!manualDiscount.validTo || manualDiscount.validTo >= now)) {

                // 対象チェック (ORDER_TOTALのみ対応とする。SPECIFIC_PRODの手動適用は複雑なため)
                if (manualDiscount.targetType === DiscountTargetType.ORDER_TOTAL) {
                    // 条件チェック
                    if (manualDiscount.conditionType === DiscountConditionType.MIN_AMOUNT) {
                        isValid = netTotalAfterItemDiscount >= manualDiscount.conditionValue;
                    } else {
                        isValid = true;
                    }
                }
            }
        }

        if (isValid && manualDiscount) {
            if (manualDiscount.type === DiscountType.FIXED) {
                orderDiscountValue = manualDiscount.value;
            } else if (manualDiscount.type === DiscountType.PERCENT) {
                orderDiscountValue = Math.floor(netTotalAfterItemDiscount * (manualDiscount.value / 100));
            }

            if (totalAmount - orderDiscountValue < 0) orderDiscountValue = totalAmount;
            totalAmount -= orderDiscountValue;

            appliedOrderDiscount = {
                id: manualDiscount.id,
                name: manualDiscount.name,
                type: manualDiscount.type,
                value: manualDiscount.value
            };
        }
    }

    const totalDiscountAmount = totalItemDiscount + orderDiscountValue;

    return {
        totalAmount,
        subtotalAmount: grossTotal,
        totalDiscountAmount,
        items: calculatedItems,
        appliedOrderDiscount
    };
};
