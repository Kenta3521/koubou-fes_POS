import { defineAbilityFor } from '../../../../packages/shared/src/utils/ability.js';

function testRBAC() {
    console.log("--- Testing Granular RBAC ---");

    // Case 1: POS User (only transaction:create)
    const posPermissions = ['transaction:create'];
    const posAbility = defineAbilityFor(posPermissions);

    console.log("\n[POS User]");
    const subjects = ['product', 'category', 'discount'];
    subjects.forEach(subject => {
        const canRead = posAbility.can('read', subject);
        const canReadPos = posAbility.can('read_pos', subject);
        console.log(`${subject}: can('read') = ${canRead} (Expected: false)`);
        console.log(`${subject}: can('read_pos') = ${canReadPos} (Expected: true)`);
    });

    // Case 2: Admin User (with product:read)
    const adminPermissions = ['product:read'];
    const adminAbility = defineAbilityFor(adminPermissions);

    console.log("\n[Admin User (Product Read)]");
    console.log(`product: can('read') = ${adminAbility.can('read', 'product')} (Expected: true)`);
    console.log(`product: can('read_pos') = ${adminAbility.can('read_pos', 'product')} (Expected: false)`);

    console.log("\n--- Verification Complete ---");
}

testRBAC();
