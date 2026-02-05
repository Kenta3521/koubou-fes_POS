/**
 * CartPanel Component (Final)
 * Phase 2: P2-008 カートUI
 * - レスポンシブ: モバイル(折りたたみ) / デスクトップ(フルハイト)
 * - 数量直接編集
 * - 縦並びリスト
 */

import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingCart, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CartItem } from '@/stores/cartStore';

interface CartPanelProps {
    items: CartItem[];
    total: number;
    itemCount: number;
    isMobile?: boolean; // モバイルモードかどうか
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemoveItem: (productId: string) => void;
    onCheckout: () => void;
}

export function CartPanel({
    items,
    total,
    itemCount,
    isMobile = false,
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
}: CartPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingQuantity, setEditingQuantity] = useState<{ [key: string]: string }>({});
    const hasItems = itemCount > 0;

    // 数量入力ハンドラ
    const handleQuantityChange = (productId: string, value: string) => {
        if (value === '' || /^\d+$/.test(value)) {
            setEditingQuantity(prev => ({ ...prev, [productId]: value }));
        }
    };

    const handleQuantityBlur = (productId: string) => {
        const value = editingQuantity[productId];
        if (value) {
            const quantity = parseInt(value, 10);
            if (quantity > 0) {
                onUpdateQuantity(productId, quantity);
            } else {
                onRemoveItem(productId);
            }
        }
        setEditingQuantity(prev => {
            const newState = { ...prev };
            delete newState[productId];
            return newState;
        });
    };

    const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    // カート内アイテムリストのレンダリング（共通）
    const renderCartItems = () => (
        <div className={cn(
            "overflow-y-auto px-4 py-2",
            isMobile ? "max-h-[50vh] min-h-[150px]" : "flex-1"
        )}>
            {!hasItems ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                    <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
                    <span className="text-sm">カートは空です</span>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {items.map((item) => {
                        const isEditing = editingQuantity[item.productId] !== undefined;
                        const displayQuantity = isEditing
                            ? editingQuantity[item.productId]
                            : item.quantity.toString();

                        return (
                            <div key={item.productId} className="py-3">
                                {/* 商品名と小計 */}
                                <div className="flex items-start justify-between mb-2">
                                    <span className="font-medium text-sm text-gray-900 leading-tight pr-2">
                                        {item.name}
                                    </span>
                                    <span className="font-bold text-base text-gray-900 shrink-0">
                                        ¥{(item.price * item.quantity).toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        @¥{item.price.toLocaleString()}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => item.quantity === 1 ? onRemoveItem(item.productId) : onUpdateQuantity(item.productId, item.quantity - 1)}
                                            className={cn(
                                                "h-10 w-10 p-0 rounded-lg shrink-0",
                                                item.quantity === 1 && "text-red-500 border-red-200 hover:bg-red-50"
                                            )}
                                        >
                                            {item.quantity === 1 ? <Trash2 className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                                        </Button>

                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            value={displayQuantity}
                                            onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                                            onBlur={() => handleQuantityBlur(item.productId)}
                                            onKeyDown={(e) => handleQuantityKeyDown(e)}
                                            className="h-10 w-16 text-center text-lg font-bold p-0"
                                        />

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                                            className="h-10 w-10 p-0 rounded-lg shrink-0"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    // モバイルレイアウト（ボトムシート風）
    if (isMobile) {
        return (
            <div className="bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] rounded-t-xl overflow-hidden flex flex-col w-full border-t border-gray-200">
                {/* ヘッダー（タップで開閉） */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 active:bg-gray-100 transition-colors w-full"
                >
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-gray-600" />
                        <span className="font-bold text-gray-900">カート</span>
                        {hasItems && (
                            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {itemCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-gray-900">
                            ¥{total.toLocaleString()}
                        </span>
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronUp className="h-5 w-5 text-gray-500" />}
                    </div>
                </button>

                {/* 展開時のみリスト表示 */}
                {isExpanded && renderCartItems()}

                {/* 会計ボタンエリア（常に表示） */}
                <div className="p-3 bg-white border-t border-gray-100 safe-area-bottom">
                    <Button
                        onClick={onCheckout}
                        disabled={!hasItems}
                        className={cn(
                            "w-full h-12 text-lg font-bold rounded-xl shadow-sm",
                            hasItems ? "bg-orange-500 hover:bg-orange-600 active:scale-[0.98]" : "bg-gray-300"
                        )}
                    >
                        {hasItems ? '会計へ進む' : '商品を選択'}
                    </Button>
                </div>
            </div>
        );
    }

    // デスクトップレイアウト（フルハイトサイドバー）
    return (
        <div className="flex flex-col h-full bg-white shadow-lg">
            {/* ヘッダー */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
                <ShoppingCart className="h-5 w-5 text-gray-600" />
                <span className="font-bold text-gray-900">カート</span>
                {hasItems && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {itemCount}
                    </span>
                )}
            </div>

            {/* リスト */}
            {renderCartItems()}

            {/* フッター */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-700">合計</span>
                    <span className="text-2xl font-bold text-gray-900">
                        ¥{total.toLocaleString()}
                    </span>
                </div>
                <Button
                    onClick={onCheckout}
                    disabled={!hasItems}
                    className={cn(
                        "w-full h-12 text-lg font-bold rounded-xl shadow-sm",
                        hasItems ? "bg-orange-500 hover:bg-orange-600 active:scale-[0.98]" : "bg-gray-300"
                    )}
                >
                    {hasItems ? '会計へ進む' : '商品を選択'}
                </Button>
            </div>
        </div>
    );
}
