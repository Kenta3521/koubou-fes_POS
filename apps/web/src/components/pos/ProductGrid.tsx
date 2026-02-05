/**
 * ProductGrid Component
 * Phase 2: P2-005 商品グリッド
 * 商品カードをグリッドで表示（レスポンシブ対応）
 */

import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/hooks/useProducts';

interface ProductGridProps {
    products: Product[];
    isLoading: boolean;
    cartQuantities: { [productId: string]: number };
    onProductTap: (product: { id: string; name: string; price: number; categoryId: string }) => void;
}

export function ProductGrid({ products, isLoading, cartQuantities, onProductTap }: ProductGridProps) {
    // ローディング中のスケルトン
    if (isLoading) {
        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-3">
                {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
            </div>
        );
    }

    // 商品がないとき
    if (products.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-gray-500">
                商品がありません
            </div>
        );
    }

    return (
        <div className="p-3 pb-20 md:pb-4">
            {/* 
               グリッドレイアウトの最適化:
               - モバイル: 3列
               - タブレット: 4列
               - PC: カードサイズが大きくなりすぎないように列数を増やす or max-width制限
            */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-w-[1200px] mx-auto">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        isActive={product.isActive}
                        categoryId={product.categoryId}
                        quantityInCart={cartQuantities[product.id] || 0}
                        onTap={onProductTap}
                    />
                ))}
            </div>
        </div>
    );
}
