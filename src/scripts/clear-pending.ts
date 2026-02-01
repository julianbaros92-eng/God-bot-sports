
import { db } from '../lib/db';

async function clearPending() {
    console.log("Cleaning up pending picks to remove erroneous spread data...");
    const result = await db.pick.deleteMany({
        where: { status: 'PENDING' }
    });
    console.log(`Deleted ${result.count} pending picks.`);
}

clearPending();
