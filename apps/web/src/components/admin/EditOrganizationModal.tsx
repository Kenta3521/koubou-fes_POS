import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Organization {
    id: string;
    name: string;
    inviteCode: string;
    isActive: boolean;
    createdAt: string;
}

interface EditOrganizationModalProps {
    organization: Organization | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditOrganizationModal({ organization, open, onOpenChange, onSuccess }: EditOrganizationModalProps) {
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (organization) {
            setName(organization.name);
            setIsActive(organization.isActive);
            setInviteCode(organization.inviteCode);
        }
    }, [organization]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization || !name.trim()) return;

        setIsLoading(true);
        try {
            await api.patch(`/organizations/${organization.id}`, { name, isActive });
            toast({
                title: '更新完了',
                description: '団体の情報を更新しました。',
            });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to update organization:', error);
            toast({
                title: 'エラー',
                description: '団体の更新に失敗しました。',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateInviteClick = () => {
        setIsConfirmOpen(true);
    };

    const handleRegenerateInviteConfirm = async () => {
        if (!organization) return;

        setIsRegenerating(true);
        try {
            const response = await api.post(`/organizations/${organization.id}/regenerate-invite`);
            const newCode = response.data.data.newInviteCode;
            setInviteCode(newCode);
            toast({
                title: '再発行完了',
                description: `新しい招待コード: ${newCode}`,
            });
            onSuccess(); // Refresh parent list
        } catch (error) {
            console.error('Failed to regenerate invite code:', error);
            toast({
                title: 'エラー',
                description: '招待コードの再発行に失敗しました。',
                variant: 'destructive',
            });
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>団体情報の編集</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">
                                団体名
                            </Label>
                            <Input
                                id="edit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="is-active" className="text-right">
                                有効状態
                            </Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Switch
                                    id="is-active"
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                    disabled={isLoading}
                                />
                                <Label htmlFor="is-active">
                                    {isActive ? '有効 (利用可能)' : '無効 (停止中)'}
                                </Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">招待コード</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                    {inviteCode}
                                </code>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRegenerateInviteClick}
                                    disabled={isRegenerating || isLoading}
                                >
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                                    再発行
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={isLoading || !name.trim()}>
                            {isLoading ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </form>

                <ConfirmDialog
                    open={isConfirmOpen}
                    onOpenChange={setIsConfirmOpen}
                    title="招待コードの再発行"
                    description="招待コードを再発行しますか？ 古いコードは無効になります。"
                    confirmText="再発行"
                    onConfirm={handleRegenerateInviteConfirm}
                />
            </DialogContent>
        </Dialog>
    );
}
