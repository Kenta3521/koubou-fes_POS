
/**
 * 2つのオブジェクトの差分を計算する
 * @param oldObj 変更前のオブジェクト
 * @param newObj 変更後のオブジェクト (または変更内容)
 * @returns 変更があったキーとその新旧の値のマップ
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateDiff<T extends Record<string, any>>(
    oldObj: T,
    newObj: Partial<T>
): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    // newObjにあるキーのみ比較対象とする
    if (newObj) {
        Object.keys(newObj).forEach((key) => {
            const oldValue = oldObj[key];
            const newValue = newObj[key];

            // 値が異なる、かつundefinedでない(明示的な変更)場合に記録
            // 注意: nullは有効な値として扱う
            // eslint-disable-next-line eqeqeq
            if (newValue !== undefined && JSON.stringify(oldValue) != JSON.stringify(newValue)) {
                changes[key] = {
                    old: oldValue,
                    new: newValue
                };
            }
        });
    }

    return changes;
}
