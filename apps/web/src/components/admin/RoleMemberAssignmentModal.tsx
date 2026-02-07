import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';

interface Member {
    id: string;
    name: string;
    email: string;
}

interface RoleMember {
    id: string; // User ID
    name: string;
    email: string;
    assignedAt: string;
}

interface RoleMemberAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
    roleId: string;
    roleName: string;
}

export function RoleMemberAssignmentModal({
    isOpen,
    onClose,
    orgId,
    roleId,
    roleName
}: RoleMemberAssignmentModalProps) {
    const { toast } = useToast();
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [assignedMembers, setAssignedMembers] = useState<RoleMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!isOpen) return;
        setIsLoading(true);
        try {
            const [allRes, assignedRes] = await Promise.all([
                api.get(`/organizations/${orgId}/members`),
                api.get(`/organizations/${orgId}/roles/${roleId}/members`)
            ]);

            if (allRes.data.success) {
                // Flatten member structure from staff list
                const members = allRes.data.data.map((m: { userId: string; user: { name: string; email: string } }) => ({
                    id: m.userId,
                    name: m.user.name,
                    email: m.user.email
                }));
                setAllMembers(members);
            }

            if (assignedRes.data.success) {
                setAssignedMembers(assignedRes.data.data);
            }
        } catch (error) {
            toast({
                title: 'エラー',
                description: 'データの取得に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, orgId, roleId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAssign = async (userId: string) => {
        setIsActionLoading(userId);
        try {
            const res = await api.post(`/organizations/${orgId}/roles/${roleId}/members`, { userId });
            if (res.data.success) {
                toast({ title: '割当完了', description: 'ロールを割り当てました' });
                fetchData();
            }
        } catch (error) {
            toast({
                title: 'エラー',
                description: '割当に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleRemove = async (userId: string) => {
        setIsActionLoading(userId);
        try {
            const res = await api.delete(`/organizations/${orgId}/roles/${roleId}/members/${userId}`);
            if (res.data.success) {
                toast({ title: '解除完了', description: 'ロールの割り当てを解除しました' });
                fetchData();
            }
        } catch (error) {
            const message = (error as { response?: { data?: { error?: { message?: string } } } })
                .response?.data?.error?.message || '解除に失敗しました';
            toast({
                title: 'エラー',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsActionLoading(null);
        }
    };

    const isAssigned = (userId: string) => assignedMembers.some(m => m.id === userId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>メンバー割当: {roleName}</DialogTitle>
                    <DialogDescription>
                        このロールを割り当てるメンバーを選択してください。
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>名前</TableHead>
                                <TableHead>メールアドレス</TableHead>
                                <TableHead className="text-right">割当状況</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allMembers.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell className="text-sm">{member.email}</TableCell>
                                    <TableCell className="text-right">
                                        {isAssigned(member.id) ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemove(member.id)}
                                                disabled={!!isActionLoading}
                                            >
                                                {isActionLoading === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4 mr-1" />}
                                                解除
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => handleAssign(member.id)}
                                                disabled={!!isActionLoading}
                                            >
                                                {isActionLoading === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                                                割り当てる
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
        </Dialog>
    );
}
