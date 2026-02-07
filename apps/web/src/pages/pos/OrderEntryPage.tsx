/**
 * OrderEntryPage (Enhanced)
 * Phase 2: P-001 注文入力画面
 * - 商品カードにバッジ表示
 * - モバイル: 折りたたみ式ボトムシートカート
 * - PC: 右側サイドバーカート
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useAutoDiscounts } from '@/hooks/useAutoDiscounts';
import { useCartStore } from '@/stores/cartStore';
import { useIsMobile } from '@/hooks/use-mobile';

export default function OrderEntryPage() {
    const navigate = useNavigate();
    const { can } = usePermission();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const isDesktop = !isMobile;

    // 権限チェック (取引作成権限がない場合はダッシュボードへ)
    useEffect(() => {
        if (!can('create', 'transaction') && !can('management', 'transaction') && !can('manage', 'all')) {
            toast({
                title: 'アクセス拒否',
                description: 'レジ操作を行う権限がありません',
                variant: 'destructive'
            });
            navigate('/access-denied');
        }
    }, [can, navigate, toast]);

    // カテゴリフィルター
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // APIデータ取得
    const { data: categories = [], isLoading: categoriesLoading } = useCategories();
    const { data: products = [], isLoading: productsLoading } = useProducts();
    const { data: autoDiscounts = [] } = useAutoDiscounts();

    // カートストア
    const {
        items: cartItems,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
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

    // 商品の割引情報マップ
    const productDiscounts = useMemo(() => {
        const discountMap: { [productId: string]: { name: string; type: string; value: number } | null } = {};

        products.forEach(product => {
            const applicableDiscount = autoDiscounts.find(d => {
                if (d.targetType === 'SPECIFIC_PROD' && d.targetProductId === product.id) {
                    return true;
                }
                if (d.targetType === 'CATEGORY' && d.targetCategoryId === product.categoryId) {
                    return true;
                }
                return false;
            });

            discountMap[product.id] = applicableDiscount ? {
                name: applicableDiscount.name,
                type: applicableDiscount.type,
                value: applicableDiscount.value
            } : null;
        });

        return discountMap;
    }, [products, autoDiscounts]);

    // 割引を適用した合計金額を計算
    const discountedTotal = useMemo(() => {
        return cartItems.reduce((total, item) => {
            const discount = productDiscounts[item.productId];
            const discountedPrice = discount
                ? discount.type === 'PERCENT'
                    ? Math.floor(item.price * (1 - discount.value / 100))
                    : item.price - discount.value
                : item.price;
            return total + discountedPrice * item.quantity;
        }, 0);
    }, [cartItems, productDiscounts]);

    // 商品追加ハンドラ
    const handleProductTap = (product: { id: string; name: string; price: number; categoryId: string; stock: number }) => {
        addItem(product);
        // 追加フィードバック (振動APIがあれば)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    // 数量更新ハンドラ
    const handleUpdateQuantity = (productId: string, quantity: number) => {
        const product = products.find(p => p.id === productId);
        updateQuantity(productId, quantity, product?.stock);
    };

    // アイテム削除ハンドラ
    const handleRemoveItem = (productId: string) => {
        removeItem(productId);
    };

    // カートクリアハンドラ
    const handleClearCart = () => {
        clearCart();
    };

    // 会計へ進む
    const handleCheckout = () => {
        // 在庫チェック
        for (const item of cartItems) {
            const product = products.find(p => p.id === item.productId);
            if (product && item.quantity > product.stock) {
                toast({
                    title: '在庫不足',
                    description: `${product.name} の在庫が不足しています（現在の在庫: ${product.stock}）`,
                    variant: 'destructive'
                });
                return;
            }
        }
        navigate('/pos/confirm');
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-gray-100 overflow-hidden">
            {/* 商品選択エリア */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
                {/* カテゴリタブ */}
                <div className="shrink-0 bg-white border-b border-gray-200 px-2 py-2">
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
                            total={discountedTotal}
                            itemCount={getItemCount()}
                            isMobile={true}
                            productDiscounts={productDiscounts}
                            onUpdateQuantity={handleUpdateQuantity}
                            onRemoveItem={handleRemoveItem}
                            onClearCart={handleClearCart}
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
                        total={discountedTotal}
                        itemCount={getItemCount()}
                        isMobile={false}
                        productDiscounts={productDiscounts}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemoveItem={handleRemoveItem}
                        onClearCart={handleClearCart}
                        onCheckout={handleCheckout}
                    />
                </div>
            )}
        </div>
    );
}
