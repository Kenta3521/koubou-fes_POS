
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
    Discount,
    DiscountType,
    DiscountTargetType,
    DiscountTriggerType,
    DiscountConditionType,
    Product,
    Category
} from '@koubou-fes-pos/shared';

interface DiscountEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (discount: Partial<Discount>) => Promise<void>;
    discount?: Discount;
    products: Product[];
    categories: Category[];
}

export function DiscountEditModal({
    isOpen,
    onClose,
    onSave,
    discount,
    products,
    categories,
}: DiscountEditModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<DiscountType>(DiscountType.PERCENT);
    const [value, setValue] = useState<number | string>(0);
    const [targetType, setTargetType] = useState<DiscountTargetType>(DiscountTargetType.ORDER_TOTAL);
    const [triggerType, setTriggerType] = useState<DiscountTriggerType>(DiscountTriggerType.MANUAL);
    const [priority, setPriority] = useState<number | string>(0);
    const [isActive, setIsActive] = useState(true);
    const [targetProductId, setTargetProductId] = useState<string>('none');
    const [targetCategoryId, setTargetCategoryId] = useState<string>('none');
    const [conditionType, setConditionType] = useState<DiscountConditionType>(DiscountConditionType.NONE);
    const [conditionValue, setConditionValue] = useState<number | string>(0);
    const [validFrom, setValidFrom] = useState<Date | undefined>(undefined);
    const [validTo, setValidTo] = useState<Date | undefined>(undefined);
    const [conditionTargetType, setConditionTargetType] = useState<DiscountTargetType>(DiscountTargetType.ORDER_TOTAL);
    const [conditionProductId, setConditionProductId] = useState<string>('none');
    const [conditionCategoryId, setConditionCategoryId] = useState<string>('none');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (discount) {
                setName(discount.name);
                setType(discount.type);
                setValue(discount.value);
                setTargetType(discount.targetType);
                setTriggerType(discount.triggerType);
                setPriority(discount.priority);
                setIsActive(discount.isActive);
                setTargetProductId(discount.targetProductId || 'none');
                setTargetCategoryId(discount.targetCategoryId || 'none');
                setConditionType(discount.conditionType);
                setConditionValue(discount.conditionValue);
                setConditionTargetType(discount.conditionTargetType || discount.targetType);
                setConditionProductId(discount.conditionProductId || 'none');
                setConditionCategoryId(discount.conditionCategoryId || 'none');
                setValidFrom(discount.validFrom ? new Date(discount.validFrom) : undefined);
                setValidTo(discount.validTo ? new Date(discount.validTo) : undefined);
            } else {
                setName('');
                setType(DiscountType.PERCENT);
                setValue('');
                setTargetType(DiscountTargetType.ORDER_TOTAL);
                setTriggerType(DiscountTriggerType.MANUAL);
                setPriority(0);
                setIsActive(true);
                setTargetProductId('none');
                setTargetCategoryId('none');
                setConditionType(DiscountConditionType.NONE);
                setConditionValue(0);
                setConditionTargetType(DiscountTargetType.ORDER_TOTAL);
                setConditionProductId('none');
                setConditionCategoryId('none');
                setValidFrom(undefined);
                setValidTo(undefined);
            }
        }
    }, [isOpen, discount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                name,
                type,
                value: Number(value),
                targetType,
                triggerType,
                priority: Number(priority),
                isActive,
                targetProductId: targetProductId === 'none' ? null : targetProductId,
                targetCategoryId: targetCategoryId === 'none' ? null : targetCategoryId,
                conditionType,
                conditionValue: Number(conditionValue),
                conditionTargetType,
                conditionProductId: conditionProductId === 'none' ? null : conditionProductId,
                conditionCategoryId: conditionCategoryId === 'none' ? null : conditionCategoryId,
                validFrom: validFrom || null,
                validTo: validTo || null,
            });
            onClose();
        } catch (error) {
            console.error('Failed to save discount:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{discount ? '割引を編集' : '割引を新規作成'}</DialogTitle>
                    <DialogDescription>
                        割引の設定情報を入力してください。判定条件と値引き対象を左右で対比して設定できます。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 py-4">
                        {/* 基本情報セクション (全幅) */}
                        <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                            <h3 className="text-sm font-bold border-b pb-2">基本情報</h3>
                            <div className="grid grid-cols-6 items-center gap-4">
                                <Label htmlFor="name" className="text-right col-span-1">名称</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-5" required placeholder="例: 10%OFF" />
                            </div>
                        </div>

                        {/* 判定条件 vs 値引き内容 (2カラム) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* ① 判定条件 */}
                            <div className="space-y-4 rounded-lg border p-4 bg-blue-50/30">
                                <h3 className="text-sm font-bold border-b border-blue-100 pb-2 text-blue-800">① 判定条件 (トリガー)</h3>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right text-xs">判定対象</Label>
                                        <Select value={conditionTargetType} onValueChange={(val) => setConditionTargetType(val as DiscountTargetType)}>
                                            <SelectTrigger className="col-span-3 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={DiscountTargetType.ORDER_TOTAL}>注文合計</SelectItem>
                                                <SelectItem value={DiscountTargetType.CATEGORY}>特定カテゴリ</SelectItem>
                                                <SelectItem value={DiscountTargetType.SPECIFIC_PROD}>特定商品</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {conditionTargetType === DiscountTargetType.SPECIFIC_PROD && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right text-xs">条件商品</Label>
                                            <Select value={conditionProductId} onValueChange={setConditionProductId}>
                                                <SelectTrigger className="col-span-3 h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">未選択</SelectItem>
                                                    {products.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {conditionTargetType === DiscountTargetType.CATEGORY && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right text-xs">条件カテゴリ</Label>
                                            <Select value={conditionCategoryId} onValueChange={setConditionCategoryId}>
                                                <SelectTrigger className="col-span-3 h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">未選択</SelectItem>
                                                    {categories.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right text-xs">条件タイプ</Label>
                                        <Select value={conditionType} onValueChange={(val) => setConditionType(val as DiscountConditionType)}>
                                            <SelectTrigger className="col-span-3 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={DiscountConditionType.NONE}>なし (常に適用)</SelectItem>
                                                <SelectItem value={DiscountConditionType.MIN_QUANTITY}>最低数量</SelectItem>
                                                <SelectItem value={DiscountConditionType.MIN_AMOUNT}>最低金額</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {conditionType !== DiscountConditionType.NONE && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="conditionValue" className="text-right text-xs">しきい値</Label>
                                            <Input id="conditionValue" type="number" value={conditionValue} onChange={(e) => setConditionValue(e.target.value === '' ? '' : Number(e.target.value))} className="col-span-3 h-8 text-xs" required />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ② 値引き内容 */}
                            <div className="space-y-4 rounded-lg border p-4 bg-green-50/30">
                                <h3 className="text-sm font-bold border-b border-green-100 pb-2 text-green-800">② 値引き内容 (アクション)</h3>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right text-xs">値引き対象</Label>
                                        <Select value={targetType} onValueChange={(val) => setTargetType(val as DiscountTargetType)}>
                                            <SelectTrigger className="col-span-3 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={DiscountTargetType.ORDER_TOTAL}>注文合計</SelectItem>
                                                <SelectItem value={DiscountTargetType.SPECIFIC_PROD}>特定商品</SelectItem>
                                                <SelectItem value={DiscountTargetType.CATEGORY}>カテゴリ全体</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {targetType === DiscountTargetType.SPECIFIC_PROD && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right text-xs">対象商品</Label>
                                            <Select value={targetProductId} onValueChange={setTargetProductId}>
                                                <SelectTrigger className="col-span-3 h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">未選択</SelectItem>
                                                    {products.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {targetType === DiscountTargetType.CATEGORY && (
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right text-xs">対象カテゴリ</Label>
                                            <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                                                <SelectTrigger className="col-span-3 h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">未選択</SelectItem>
                                                    {categories.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right text-xs">割引形式</Label>
                                        <Select value={type} onValueChange={(val) => setType(val as DiscountType)}>
                                            <SelectTrigger className="col-span-3 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={DiscountType.PERCENT}>百分率 (%)</SelectItem>
                                                <SelectItem value={DiscountType.FIXED}>固定額 (¥)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="value" className="text-right text-xs">割引額/率</Label>
                                        <Input id="value" type="number" value={value} onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))} className="col-span-3 h-8 text-xs" required />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 詳細設定セクション (4列グリッド) */}
                        <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                            <h3 className="text-sm font-bold border-b pb-2">詳細設定</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                <div className="space-y-3">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="validFrom" className="text-right text-xs">開始日時</Label>
                                        <div className="col-span-3">
                                            <DateTimePicker date={validFrom} setDate={setValidFrom} placeholder="開始日時を選択" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="validTo" className="text-right text-xs">終了日時</Label>
                                        <div className="col-span-3">
                                            <DateTimePicker date={validTo} setDate={setValidTo} placeholder="終了日時を選択" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right text-xs">適用方法</Label>
                                        <Select value={triggerType} onValueChange={(val) => setTriggerType(val as DiscountTriggerType)}>
                                            <SelectTrigger className="col-span-3 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={DiscountTriggerType.MANUAL}>手動適用</SelectItem>
                                                <SelectItem value={DiscountTriggerType.AUTO}>自動適用</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="priority" className="text-right text-xs">優先度</Label>
                                        <Input id="priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value === '' ? '' : Number(e.target.value))} className="col-span-3 h-8 text-xs" required />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end space-x-4 pt-2 border-t mt-2">
                                <div className="flex items-center space-x-2">
                                    <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                                    <Label htmlFor="isActive" className="text-sm">{isActive ? '有効' : '無効'}</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中...' : '保存'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
