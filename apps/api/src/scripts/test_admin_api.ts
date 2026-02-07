import 'dotenv/config';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const API_URL = 'http://localhost:3001/api/v1'; // Adjust if needed
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testApi() {
    const admin = await prisma.user.findFirst({ where: { isSystemAdmin: true } });
    if (!admin) {
        console.log('❌ No System Admin found');
        return;
    }

    // Generate token
    const token = jwt.sign({ userId: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '1h' });

    const org = await prisma.organization.findFirst({ where: { name: '焼きそば部' } });
    const user = await prisma.user.findUnique({ where: { email: 'staff@yakisoba.example.com' } });
    const roleId = 'default-staff-role';

    if (!org || !user) {
        console.log('❌ Org or User not found');
        return;
    }

    // Ensure assigned
    await prisma.userOrganizationRole.upsert({
        where: { userId_organizationId_roleId: { userId: user.id, organizationId: org.id, roleId } },
        update: {},
        create: { userId: user.id, organizationId: org.id, roleId }
    });

    console.log(`Calling DELETE ${API_URL}/organizations/${org.id}/roles/${roleId}/members/${user.id}`);

    try {
        const res = await axios.delete(`${API_URL}/organizations/${org.id}/roles/${roleId}/members/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Success:', res.data);
    } catch (error: any) {
        console.log('❌ Failed:', error.response?.status, error.response?.data);
    }

    await prisma.$disconnect();
}

testApi().catch(console.error);
