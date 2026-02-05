import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { useToast } from '../ui/use-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@koubou-fes-pos/shared';
import { Loader2 } from 'lucide-react';

interface CategoryEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    category?: Category | null; // If null, create mode
}

export const CategoryEditModal = ({
    isOpen,
    onClose,
    onSuccess,
    category
}: CategoryEditModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const { activeOrganizationId } = useAuthStore();
    const { toast } = useToast();

    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string }>();

    useEffect(() => {
        if (isOpen) {
            reset({
                name: category ? category.name : '',
            });
        }
    }, [isOpen, category, reset]);

    const onSubmit = async (data: { name: string }) => {
        if (!activeOrganizationId) return;

        setIsLoading(true);
        try {
            if (category) {
                // Update
                const payload: UpdateCategoryRequest = { name: data.name };
                await api.patch(`/organizations/${activeOrganizationId}/categories/${category.id}`, payload);
                toast({ title: 'カテゴリを更新しました' });
            } else {
                // Create
                const payload: CreateCategoryRequest = { name: data.name };
                await api.post(`/organizations/${activeOrganizationId}/categories`, payload);
                toast({ title: 'カテゴリを作成しました' });
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Category save error:', error);
            toast({
                title: 'エラーが発生しました',
                description: error.response?.data?.error?.message || '保存に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{category ? 'カテゴリ編集' : 'カテゴリ作成'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">カテゴリ名</label>
                        <Input
                            id="name"
                            placeholder="例: フード, ドリンク"
                            {...register('name', { required: 'カテゴリ名は必須です' })}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name.message}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {category ? '更新' : '作成'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
