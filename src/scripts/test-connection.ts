
import { PrismaClient } from '@prisma/client';

async function test(encodedUrl: string, label: string) {
    console.log(`Testing: ${label}`);
    const client = new PrismaClient({
        datasources: {
            db: {
                url: encodedUrl
            }
        }
    });
    try {
        await client.$connect();
        console.log(`✅ Success! Connected.`);
        await client.$disconnect();
        return true;
    } catch (e: any) {
        console.log(`❌ Failed: ${e.message.split('\n')[0]}`); // First line only
        await client.$disconnect();
        return false;
    }
}

async function runTests() {
    const base = "postgresql://postgres:";
    const hostPart = "@godbot-sports.cluster-cqz0g8eqytvt.us-east-1.rds.amazonaws.com:5432/postgres";

    // Password variants
    // Original raw (guess): )N]:8XIQ~#MWl4WrDW56LQF0|:hZ

    // 1. Current from .env (partially encoded)
    const p1 = ")N]%3A8XIQ~%23MWl4WrDW56LQF0%7C%3AhZ";

    // 2. Fully encoded (all special chars)
    // ) -> %29, ] -> %5D, : -> %3A, ~ -> %7E, # -> %23, | -> %7C
    const p2 = "%29N%5D%3A8XIQ%7E%23MWl4WrDW56LQF0%7C%3AhZ";

    // 3. Maybe first char ')' is fine but ']' needs encoding?
    // )N%5D%3A8XIQ~%23MWl4WrDW56LQF0%7C%3AhZ
    const p3 = ")N%5D%3A8XIQ~%23MWl4WrDW56LQF0%7C%3AhZ";

    await test(`${base}${p1}${hostPart}`, "Current .env");
    await test(`${base}${p2}${hostPart}`, "Fully Encoded");
    await test(`${base}${p3}${hostPart}`, "Partially Encoded (brackets)");
}

runTests();
