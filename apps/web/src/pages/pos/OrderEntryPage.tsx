/**
 * OrderEntryPage (Enhanced)
 * Phase 2: P-001 注文入力画面
 * - 商品カードにバッジ表示
 * - モバイル: 折りたたみ式ボトムシートカート
 * - PC: 右側サイドバーカート
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useCartStore } from '@/stores/cartStore';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export default function OrderEntryPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const isDesktop = !isMobile;

    // カテゴリフィルター
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // APIデータ取得
    const { data: categories = [], isLoading: categoriesLoading } = useCategories();
    const { data: products = [], isLoading: productsLoading } = useProducts();

    // カートストア
    const {
        items: cartItems,
        addItem,
        updateQuantity,
        removeItem,
        getTotal,
        getItemCount,
    } = useCartStore();

    // カテゴリでフィルタされた商品
    const filteredProducts = useMemo(() => {
        if (!selectedCategoryId) {
            return products;
        }
        return products.filter(p => p.categoryId === selectedCategoryId);
    }, [products, selectedCategoryId]);

    // カート内の商品数量マップ
    const cartQuantities = useMemo(() => {
        const quantities: { [productId: string]: number } = {};
        cartItems.forEach(item => {
            quantities[item.productId] = item.quantity;
        });
        return quantities;
    }, [cartItems]);

    // 商品追加ハンドラ
    const handleProductTap = (product: { id: string; name: string; price: number; categoryId: string }) => {
        addItem(product);
        // 追加フィードバック (振動APIがあれば)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    // 数量変更ハンドラ
    const handleUpdateQuantity = (productId: string, quantity: number) => {
        updateQuantity(productId, quantity);
    };

    // アイテム削除ハンドラ
    const handleRemoveItem = (productId: string) => {
        removeItem(productId);
        toast({
            title: 'カートから削除しました',
            duration: 1500,
        });
    };

    // 会計へ進む
    const handleCheckout = () => {
        navigate('/pos/confirm');
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-gray-100 overflow-hidden">
            {/* 商品選択エリア */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
                {/* カテゴリタブ */}
                <div className="shrink-0 z-10 bg-gray-100">
                    <CategoryTabs
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onCategoryChange={setSelectedCategoryId}
                        isLoading={categoriesLoading}
                    />
                </div>

                {/* 商品グリッド（スクロール可能エリア） */}
                {/* モバイルの場合はカートの折りたたみヘッダー分の余白を下部に確保 */}
                <div className="flex-1 overflow-y-auto pb-20 md:pb-4">
                    <ProductGrid
                        products={filteredProducts}
                        isLoading={productsLoading}
                        cartQuantities={cartQuantities}
                        onProductTap={handleProductTap}
                    />
                </div>

                {/* モバイル用カート: absolute配置で下部に固定 */}
                {!isDesktop && (
                    <div className="absolute bottom-0 left-0 right-0 z-20">
                        <CartPanel
                            items={cartItems}
                            total={getTotal()}
                            itemCount={getItemCount()}
                            isMobile={true}
                            onUpdateQuantity={handleUpdateQuantity}
                            onRemoveItem={handleRemoveItem}
                            onCheckout={handleCheckout}
                        />
                    </div>
                )}
            </div>

            {/* PC用カート: 右側に固定表示 */}
            {isDesktop && (
                <div className="w-[320px] lg:w-[360px] shrink-0 border-l border-gray-200">
                    <CartPanel
                        items={cartItems}
                        total={getTotal()}
                        itemCount={getItemCount()}
                        isMobile={false}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemoveItem={handleRemoveItem}
                        onCheckout={handleCheckout}
                    />
                </div>
            )}
        </div>
    );
}
