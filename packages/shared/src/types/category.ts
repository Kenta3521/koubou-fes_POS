export interface Category {
    id: string;
    organizationId: string;
    name: string;
    sortOrder: number;
    _count?: {
        products: number;
    };
}

export type CreateCategoryRequest = {
    name: string;
};

export type UpdateCategoryRequest = {
    name?: string;
    sortOrder?: number;
};

export type ReorderCategoriesRequest = {
    categoryIds: string[];
};
