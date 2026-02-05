import { Category } from './category.js';

export interface Product {
    id: string;
    organizationId: string;
    categoryId: string | null;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    isActive: boolean;
    imageUrl: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    category?: Category | null;
    _count?: {
        orderItems: number;
    };
}

export interface CreateProductRequest {
    name: string;
    description?: string;
    price: number;
    stock?: number;
    categoryId?: string;
    isActive?: boolean;
    imageUrl?: string;
}

export type UpdateProductRequest = Partial<CreateProductRequest>;
