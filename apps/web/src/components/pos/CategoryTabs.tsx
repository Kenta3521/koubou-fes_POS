/**
 * CategoryTabs Component
 * Phase 2: P2-004 カテゴリタブ
 * 横スクロール可能なカテゴリタブバー
 */

import { cn } from '@/lib/utils';
import type { Category } from '@/hooks/useCategories';

interface CategoryTabsProps {
    categories: Category[];
    selectedCategoryId: string | null; // null = 全商品
    onCategoryChange: (categoryId: string | null) => void;
    isLoading?: boolean;
}

export function CategoryTabs({
    categories,
    selectedCategoryId,
    onCategoryChange,
    isLoading = false,
}: CategoryTabsProps) {
    if (isLoading) {
        return (
            <div className="flex gap-2 p-2 overflow-x-auto bg-gray-50 border-b">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse shrink-0"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-2 p-2 overflow-x-auto bg-gray-50 border-b scrollbar-hide">
            {/* 全商品タブ */}
            <button
                onClick={() => onCategoryChange(null)}
                className={cn(
                    "shrink-0 px-4 py-2.5 rounded-lg font-bold text-sm",
                    "transition-all duration-150 touch-manipulation",
                    "min-h-[44px]", // モバイル最適化
                    selectedCategoryId === null
                        ? "bg-orange-500 text-white shadow-md"
                        : "bg-white border border-gray-300 text-gray-700 active:bg-gray-100"
                )}
            >
                全商品
            </button>

            {/* カテゴリタブ */}
            {categories.map((category) => (
                <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    className={cn(
                        "shrink-0 px-4 py-2.5 rounded-lg font-bold text-sm",
                        "transition-all duration-150 touch-manipulation",
                        "min-h-[44px]", // モバイル最適化
                        selectedCategoryId === category.id
                            ? "bg-orange-500 text-white shadow-md"
                            : "bg-white border border-gray-300 text-gray-700 active:bg-gray-100"
                    )}
                >
                    {category.name}
                </button>
            ))}
        </div>
    );
}
