
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface ReasonInputModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    onSubmit: (reason: string) => Promise<void>;
    isLoading?: boolean;
    confirmText?: string;
    cancelText?: string;
}

export function ReasonInputModal({
    open,
    onOpenChange,
    title,
    description,
    onSubmit,
    isLoading = false,
    confirmText = '実行',
    cancelText = 'キャンセル',
}: ReasonInputModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('理由を入力してください');
            return;
        }
        setError('');
        await onSubmit(reason);
        setReason(''); // Reset on success (modal closes or controlled by parent)
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setReason('');
            setError('');
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason">理由</Label>
                        <Textarea
                            id="reason"
                            placeholder="理由を入力してください（例：商品不備のため、テスト注文のため）"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
                        {cancelText}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? '処理中...' : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
