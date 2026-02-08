import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { UserPlus, UserMinus, Loader2, Search, ArrowLeft, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    initialAddMode?: boolean;
    isAddOnly?: boolean;
    onSuccess?: () => void;
}

export function RoleMemberAssignmentModal({
    isOpen,
    onClose,
    orgId,
    roleId,
    roleName,
    initialAddMode = false,
    isAddOnly = false,
    onSuccess
}: RoleMemberAssignmentModalProps) {
    const { toast } = useToast();
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [assignedMembers, setAssignedMembers] = useState<RoleMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        if (!isOpen) return;
        setIsLoading(true);
        try {
            const [allRes, assignedRes] = await Promise.all([
                // If roleId is empty, we are adding to the organization, so we need ALL system users to search from
                !roleId ? api.get(`/admin/users`) : (orgId ? api.get(`/organizations/${orgId}/members`) : api.get(`/admin/users`)),
                roleId ? (orgId ? api.get(`/organizations/${orgId}/roles/${roleId}/members`) : api.get(`/admin/roles/${roleId}/members`)) : Promise.resolve({ data: { success: true, data: [] } })
            ]);

            if (allRes.data.success) {
                // Formatting for both org members and system users
                const members = allRes.data.data.map((m: any) => ({
                    id: m.userId || m.id,
                    name: m.user?.name || m.name,
                    email: m.user?.email || m.email
                }));
                setAllMembers(members);
            }

            if (assignedRes.data.success) {
                setAssignedMembers(assignedRes.data.data);
            }
        } catch (error) {
            // エラーはグローバルインターセプターで処理
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, orgId, roleId]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            setIsAddMode(initialAddMode || isAddOnly);
            setSearchQuery('');
        }
    }, [isOpen, fetchData, initialAddMode, isAddOnly]);

    const handleAssign = async (userId: string) => {
        setIsActionLoading(userId);
        try {
            const endpoint = roleId
                ? (orgId ? `/organizations/${orgId}/roles/${roleId}/members` : `/admin/roles/${roleId}/members`)
                : `/organizations/${orgId}/members`;

            const res = await api.post(endpoint, { userId });
            if (res.data.success) {
                toast({ title: roleId ? '割当完了' : '登録完了', description: roleId ? 'ロールを割り当てました' : 'メンバーを団体に追加しました' });
                fetchData();
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            // エラーはグローバルインターセプターで処理
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleRemove = async (userId: string) => {
        setIsActionLoading(userId);
        try {
            const endpoint = orgId
                ? `/organizations/${orgId}/roles/${roleId}/members/${userId}`
                : `/admin/roles/${roleId}/members/${userId}`;
            const res = await api.delete(endpoint);
            if (res.data.success) {
                toast({ title: '解除完了', description: 'ロールの割り当てを解除しました' });
                fetchData();
            }
        } catch (error) {
            // エラーはグローバルインターセプターで処理
        } finally {
            setIsActionLoading(null);
        }
    };

    const unassignedMembers = useMemo(() => {
        const assignedIds = new Set(assignedMembers.map(m => m.id));
        return allMembers.filter(m => !assignedIds.has(m.id));
    }, [allMembers, assignedMembers]);

    const filteredList = useMemo(() => {
        const list = isAddMode ? unassignedMembers : assignedMembers;
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q)
        );
    }, [isAddMode, unassignedMembers, assignedMembers, searchQuery]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl flex items-center gap-2">
                                {isAddMode && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setIsAddMode(false)}>
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                )}
                                ロール割当: <Badge variant="secondary" className="text-lg">{roleName}</Badge>
                            </DialogTitle>
                            <DialogDescription>
                                {isAddMode ? 'このロールを新しく割り当てるメンバーを検索して選択してください。' : '現在このロールが割り当てられているメンバーの一覧です。'}
                            </DialogDescription>
                        </div>
                        {!isAddMode && !isAddOnly && (
                            <Button onClick={() => setIsAddMode(true)} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                メンバー追加
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="px-6 py-2 border-b flex items-center gap-2 bg-muted/30">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="名前やメールアドレスで検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 border-none bg-transparent focus-visible:ring-0 shadow-none"
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground italic">
                            {searchQuery ? '検索条件に一致するメンバーが見つかりません。' : (isAddMode ? '追加可能なメンバーがいません。' : 'メンバーが割り当てられていません。')}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>名前</TableHead>
                                    <TableHead>メールアドレス</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredList.map((member) => (
                                    <TableRow key={member.id} className="group">
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                                        <TableCell className="text-right">
                                            {isAddMode ? (
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleAssign(member.id)}
                                                    disabled={!!isActionLoading}
                                                    className="transition-opacity"
                                                >
                                                    {isActionLoading === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                                                    割り当てる
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10 transition-opacity"
                                                    onClick={() => handleRemove(member.id)}
                                                    disabled={!!isActionLoading}
                                                >
                                                    {isActionLoading === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4 mr-1" />}
                                                    解除
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-muted/10">
                    <Button variant="outline" onClick={onClose}>
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
