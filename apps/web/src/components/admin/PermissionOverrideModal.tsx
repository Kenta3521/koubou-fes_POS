import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface PermissionOverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
    roleName: string;
    currentOverride: string[] | null; // null means using role defaults
    rolePermissions: string[];
    onSave: (memberId: string, newPermissions: string[] | null) => Promise<void>;
}

interface PermissionDef {
    id: string;
    code: string;
    description: string;
    category: string;
}

export function PermissionOverrideModal({
    isOpen,
    onClose,
    memberId,
    memberName,
    roleName,
    currentOverride,
    rolePermissions,
    onSave
}: PermissionOverrideModalProps) {
    const { toast } = useToast();
    const [allPermissions, setAllPermissions] = useState<PermissionDef[]>([]);
    const [loading, setLoading] = useState(false);

    // Local state for checkboxes
    // If currentOverride is null, we initialize with rolePermissions BUT track that we are in "default" mode?
    // Actually, distinct mode is better. "Customized" vs "Default".
    const [isCustomized, setIsCustomized] = useState(currentOverride !== null);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
        currentOverride !== null ? currentOverride : rolePermissions
    );
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPermissions = async () => {
            setLoading(true);
            try {
                const res = await api.get('/permissions');
                if (res.data.success) {
                    setAllPermissions(res.data.data);
                }
            } catch (error) {
                toast({
                    title: 'エラー',
                    description: '権限リストの取得に失敗しました',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchPermissions();
            setIsCustomized(currentOverride !== null);
            setSelectedPermissions(currentOverride !== null ? currentOverride : rolePermissions);
        }
    }, [isOpen, currentOverride, rolePermissions, toast]);

    const handleToggle = (code: string, category: string) => {
        // If toggling while not customized, switch to custom mode immediately
        if (!isCustomized) {
            setIsCustomized(true);
        }

        setSelectedPermissions(prev => {
            const currentPerms = new Set(prev);
            const isSelected = currentPerms.has(code);
            const isManagement = code.endsWith(':management');

            if (isManagement) {
                const categoryPerms = groupedPermissions[category].map(p => p.code);
                if (!isSelected) {
                    categoryPerms.forEach(c => currentPerms.add(c));
                } else {
                    categoryPerms.forEach(c => currentPerms.delete(c));
                }
            } else {
                if (isSelected) {
                    currentPerms.delete(code);
                    const managementCode = groupedPermissions[category].find(p => p.code.endsWith(':management'))?.code;
                    if (managementCode) currentPerms.delete(managementCode);
                } else {
                    currentPerms.add(code);
                    const categoryPerms = groupedPermissions[category];
                    const managementPerm = categoryPerms.find(p => p.code.endsWith(':management'));

                    if (managementPerm) {
                        const allSubPerms = categoryPerms.filter(p => !p.code.endsWith(':management'));
                        const allSelected = allSubPerms.every(p => currentPerms.has(p.code));
                        if (allSelected) {
                            currentPerms.add(managementPerm.code);
                        }
                    }
                }
            }
            return Array.from(currentPerms);
        });
    };

    const handleReset = () => {
        setIsCustomized(false);
        setSelectedPermissions(rolePermissions);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = isCustomized ? selectedPermissions : null;
            await onSave(memberId, payload);
            toast({
                title: '上書き保存',
                description: '権限の個別設定を保存しました',
            });
            onClose();
        } catch (error) {
            // handled by parent
        } finally {
            setSaving(false);
        }
    };

    // Group permissions by category, excluding 'system'
    const groupedPermissions = allPermissions
        .filter(p => p.category !== 'system')
        .reduce((acc, curr) => {
            if (!acc[curr.category]) acc[curr.category] = [];
            acc[curr.category].push(curr);
            return acc;
        }, {} as Record<string, PermissionDef[]>);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>権限の個別設定: {memberName}</DialogTitle>
                    <DialogDescription>
                        ロール「{roleName}」の権限をこのユーザーのみ個別に上書きします。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">現在の状態:</span>
                        {isCustomized ? (
                            <Badge variant="destructive">カスタム設定中</Badge>
                        ) : (
                            <Badge variant="secondary">ロール標準</Badge>
                        )}
                    </div>
                    {isCustomized && (
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            ロール標準に戻す
                        </Button>
                    )}
                </div>

                <ScrollArea className="flex-1 pr-4 border rounded-md p-4">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedPermissions).map(([category, perms]) => {
                                // Sort management first
                                const sortedPerms = [...perms].sort((a, b) => {
                                    if (a.code.endsWith(':management')) return -1;
                                    if (b.code.endsWith(':management')) return 1;
                                    return 0;
                                });

                                return (
                                    <div key={category}>
                                        <h4 className="font-semibold mb-3 pb-1 border-b capitalize flex items-center justify-between">
                                            {category}
                                            <span className="text-xs font-normal text-muted-foreground ml-2">
                                                {sortedPerms.filter(p => selectedPermissions.includes(p.code)).length} / {sortedPerms.length}
                                            </span>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {sortedPerms.map((p) => {
                                                const isChecked = selectedPermissions.includes(p.code);
                                                const isRoleDefault = rolePermissions.includes(p.code);
                                                const isDiff = isChecked !== isRoleDefault;
                                                const isManagement = p.code.endsWith(':management');

                                                return (
                                                    <div
                                                        key={p.code}
                                                        className={`
                                                            flex items-start space-x-2 p-2 rounded transition-colors
                                                            ${isDiff && isCustomized ? 'bg-amber-50' : ''}
                                                            ${isManagement ? 'bg-muted/10 font-bold col-span-1 md:col-span-2 border-l-4 border-l-primary' : 'ml-6 border-l-2'}
                                                        `}
                                                    >
                                                        <Checkbox
                                                            id={`perm-${p.code}`}
                                                            checked={isChecked}
                                                            onCheckedChange={() => handleToggle(p.code, category)}
                                                        />
                                                        <div className="grid gap-1.5 leading-none w-full cursor-pointer" onClick={() => handleToggle(p.code, category)}>
                                                            <div
                                                                className={`text-sm leading-none flex justify-between w-full ${isManagement ? 'font-black text-primary' : 'font-medium'}`}
                                                            >
                                                                <div className="flex flex-col gap-1">
                                                                    <span>{p.description}</span>
                                                                    {isManagement && <Badge variant="outline" className="text-[10px] w-fit border-primary text-primary">Management</Badge>}
                                                                </div>
                                                                <span className="text-xs text-muted-foreground ml-2 font-normal text-[10px]">
                                                                    {p.code}
                                                                </span>
                                                            </div>
                                                            {isDiff && isCustomized && (
                                                                <span className="text-[10px] text-amber-600">
                                                                    ※標準権限と異なります
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={saving}>キャンセル</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        設定を保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
