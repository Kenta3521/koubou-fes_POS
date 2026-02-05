
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
    const [value, setValue] = useState(0);
    const [targetType, setTargetType] = useState<DiscountTargetType>(DiscountTargetType.ORDER_TOTAL);
    const [triggerType, setTriggerType] = useState<DiscountTriggerType>(DiscountTriggerType.MANUAL);
    const [priority, setPriority] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [targetProductId, setTargetProductId] = useState<string>('none');
    const [targetCategoryId, setTargetCategoryId] = useState<string>('none');
    const [conditionType, setConditionType] = useState<DiscountConditionType>(DiscountConditionType.NONE);
    const [conditionValue, setConditionValue] = useState(0);
    const [validFrom, setValidFrom] = useState('');
    const [validTo, setValidTo] = useState('');

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
                setValidFrom(discount.validFrom ? new Date(discount.validFrom).toISOString().slice(0, 16) : '');
                setValidTo(discount.validTo ? new Date(discount.validTo).toISOString().slice(0, 16) : '');
            } else {
                setName('');
                setType(DiscountType.PERCENT);
                setValue(0);
                setTargetType(DiscountTargetType.ORDER_TOTAL);
                setTriggerType(DiscountTriggerType.MANUAL);
                setPriority(0);
                setIsActive(true);
                setTargetProductId('none');
                setTargetCategoryId('none');
                setConditionType(DiscountConditionType.NONE);
                setConditionValue(0);
                setValidFrom('');
                setValidTo('');
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
                validFrom: validFrom ? new Date(validFrom) : null,
                validTo: validTo ? new Date(validTo) : null,
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{discount ? '割引を編集' : '割引を新規作成'}</DialogTitle>
                    <DialogDescription>
                        割引の設定情報を入力してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">名称</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">タイプ</Label>
                            <Select value={type} onValueChange={(val) => setType(val as DiscountType)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="タイプを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={DiscountType.PERCENT}>百分率 (%)</SelectItem>
                                    <SelectItem value={DiscountType.FIXED}>固定額 (¥)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="value" className="text-right">割引額/率</Label>
                            <Input id="value" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="col-span-3" required />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">対象</Label>
                            <Select value={targetType} onValueChange={(val) => setTargetType(val as DiscountTargetType)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="対象を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={DiscountTargetType.ORDER_TOTAL}>注文合計</SelectItem>
                                    <SelectItem value={DiscountTargetType.SPECIFIC_PROD}>特定商品</SelectItem>
                                    <SelectItem value={DiscountTargetType.CATEGORY}>カテゴリ合計</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {targetType === DiscountTargetType.SPECIFIC_PROD && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">対象商品</Label>
                                <Select value={targetProductId} onValueChange={setTargetProductId}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="商品を選択" />
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
                                <Label className="text-right">対象カテゴリ</Label>
                                <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="カテゴリを選択" />
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
                            <Label className="text-right">適用条件</Label>
                            <Select value={conditionType} onValueChange={(val) => setConditionType(val as DiscountConditionType)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="条件を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={DiscountConditionType.NONE}>なし</SelectItem>
                                    <SelectItem value={DiscountConditionType.MIN_QUANTITY}>最低数量</SelectItem>
                                    <SelectItem value={DiscountConditionType.MIN_AMOUNT}>最低金額</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {conditionType !== DiscountConditionType.NONE && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="conditionValue" className="text-right">しきい値</Label>
                                <Input id="conditionValue" type="number" value={conditionValue} onChange={(e) => setConditionValue(Number(e.target.value))} className="col-span-3" required />
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="validFrom" className="text-right">開始日時</Label>
                            <Input id="validFrom" type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="col-span-3" />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="validTo" className="text-right">終了日時</Label>
                            <Input id="validTo" type="datetime-local" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="col-span-3" />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">適用方法</Label>
                            <Select value={triggerType} onValueChange={(val) => setTriggerType(val as DiscountTriggerType)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="適用方法を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={DiscountTriggerType.MANUAL}>手動適用</SelectItem>
                                    <SelectItem value={DiscountTriggerType.AUTO}>自動適用</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="priority" className="text-right">優先度</Label>
                            <Input id="priority" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="col-span-3" required />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">状態</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Switch checked={isActive} onCheckedChange={setIsActive} />
                                <span className="text-sm text-muted-foreground">{isActive ? '有効' : '無効'}</span>
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
