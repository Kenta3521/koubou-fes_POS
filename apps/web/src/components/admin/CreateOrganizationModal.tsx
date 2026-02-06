import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

interface CreateOrganizationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CreateOrganizationModal({ open, onOpenChange, onSuccess }: CreateOrganizationModalProps) {
    const [name, setName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resultCode, setResultCode] = useState<string | null>(null);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            const response = await api.post('/organizations', { name, inviteCode });
            const newOrg = response.data.data;

            toast({
                title: '作成完了',
                description: '新しい団体を作成しました。',
            });
            setName('');
            setResultCode(newOrg.inviteCode);
            onSuccess();
            // onOpenChange(false); // Don't close immediately
        } catch (error: any) {
            console.error('Failed to create organization:', error);
            if (error.response?.data?.error?.code === 'INVITE_CODE_EXISTS') {
                toast({
                    title: 'エラー',
                    description: 'この招待コードは既に使用されています。',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'エラー',
                    description: '団体の作成に失敗しました。',
                    variant: 'destructive',
                });
            }
            // onOpenChange(false); // Creating failed, keep open
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setResultCode(null);
        onOpenChange(false);
    };

    if (resultCode) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>団体作成完了</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 text-center">
                        <p className="mb-4 text-sm text-muted-foreground">以下の招待コードを管理者に共有してください。</p>
                        <div className="flex justify-center">
                            <code className="relative rounded bg-muted px-4 py-2 font-mono text-2xl font-semibold tracking-widest">
                                {resultCode}
                            </code>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleClose}>閉じる</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>新規団体作成</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                団体名
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="例: 建築学科3年"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="inviteCode" className="text-right">
                                招待コード
                                <span className="text-xs text-muted-foreground block">(任意)</span>
                            </Label>
                            <Input
                                id="inviteCode"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                className="col-span-3"
                                placeholder="半角英数字 (空欄で自動生成)"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={isLoading || !name.trim()}>
                            {isLoading ? '作成中...' : '作成'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
