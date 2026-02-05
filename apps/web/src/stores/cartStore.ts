/**
 * Cart Store
 * Phase 2: P2-007 カート状態管理
 * POSレジのカート状態をZustandで管理
 */

import { create } from 'zustand';

// カート内の商品アイテム
export interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    categoryId: string;
}

// カート状態
interface CartState {
    items: CartItem[];
    currentOrganizationId: string | null; // 現在のカートが属する組織ID

    // Actions
    addItem: (product: { id: string; name: string; price: number; categoryId: string }) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    setOrganization: (organizationId: string) => void; // 組織切り替え時にカートをクリア

    // Getters (computed values)
    getTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    currentOrganizationId: null,

    // 商品をカートに追加（既存の場合は数量+1）
    addItem: (product) => set((state) => {
        const existingItem = state.items.find(item => item.productId === product.id);

        if (existingItem) {
            // 既存アイテムの数量を+1
            return {
                items: state.items.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            };
        }

        // 新規アイテムを追加
        return {
            items: [...state.items, {
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                categoryId: product.categoryId,
            }]
        };
    }),

    // 商品をカートから削除
    removeItem: (productId) => set((state) => ({
        items: state.items.filter(item => item.productId !== productId)
    })),

    // 商品の数量を変更
    updateQuantity: (productId, quantity) => set((state) => {
        if (quantity <= 0) {
            // 数量が0以下の場合は削除
            return {
                items: state.items.filter(item => item.productId !== productId)
            };
        }

        return {
            items: state.items.map(item =>
                item.productId === productId
                    ? { ...item, quantity }
                    : item
            )
        };
    }),

    // カートをクリア
    clearCart: () => set({ items: [] }),

    // 組織を設定（組織が変わった場合はカートをクリア）
    setOrganization: (organizationId: string) => set((state) => {
        if (state.currentOrganizationId && state.currentOrganizationId !== organizationId) {
            // 組織が変更された場合、カートをクリア
            console.log(`Organization changed from ${state.currentOrganizationId} to ${organizationId}. Clearing cart.`);
            return {
                currentOrganizationId: organizationId,
                items: []
            };
        }
        // 初回設定または同じ組織の場合
        return {
            currentOrganizationId: organizationId
        };
    }),

    // 合計金額を取得
    getTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
    },

    // カート内の商品点数を取得
    getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
    },
}));
