/**
 * ProductCard Component
 * Phase 2: P2-005 商品グリッド / P2-006 売り切れ表示
 * 個別の商品カード（タップで追加）
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
    id: string;
    name: string;
    price: number;
    isActive: boolean;
    categoryId: string;
    quantityInCart?: number;
    onTap: (product: { id: string; name: string; price: number; categoryId: string }) => void;
}

export function ProductCard({
    id,
    name,
    price,
    isActive,
    categoryId,
    quantityInCart = 0,
    onTap
}: ProductCardProps) {
    const handleClick = () => {
        if (!isActive) return; // 売り切れは追加不可
        onTap({ id, name, price, categoryId });
    };

    return (
        <button
            onClick={handleClick}
            disabled={!isActive}
            className={cn(
                // ベーススタイル（モバイル最適化）
                "relative flex flex-col items-center justify-center",
                "w-full aspect-square rounded-xl",
                "text-center transition-all duration-150",
                "touch-manipulation select-none",
                "min-h-[100px]",
                // アクティブ時のスタイル
                isActive && [
                    "bg-white border-2 border-gray-200",
                    "shadow-sm hover:shadow-md",
                    "active:scale-95 active:bg-gray-50",
                ],
                // 売り切れ時のスタイル
                !isActive && [
                    "bg-gray-100 border-2 border-gray-200",
                    "opacity-60 cursor-not-allowed",
                ]
            )}
        >
            {/* 売り切れバッジ (左上) */}
            {!isActive && (
                <Badge
                    variant="destructive"
                    className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 z-10"
                >
                    SOLD
                </Badge>
            )}

            {/* カート内数量バッジ (右上) */}
            {quantityInCart > 0 && (
                <div className="absolute top-[-8px] right-[-8px] z-10">
                    <span className="flex items-center justify-center min-w-[28px] h-[28px] bg-orange-500 text-white text-xs font-bold rounded-full border-2 border-white shadow-sm px-1">
                        {quantityInCart}
                    </span>
                </div>
            )}

            {/* 商品名 */}
            <span className={cn(
                "font-bold text-sm leading-tight px-2 w-full break-words",
                "line-clamp-2",
                isActive ? "text-gray-900" : "text-gray-500"
            )}>
                {name}
            </span>

            {/* 価格 */}
            <span className={cn(
                "text-base font-bold mt-1.5",
                isActive ? "text-orange-600" : "text-gray-400"
            )}>
                ¥{price.toLocaleString()}
            </span>
        </button>
    );
}
