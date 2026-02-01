
import { KalshiClient } from '../lib/api-clients/kalshi-client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    console.log("🛠️ Starting Debug Trade...");
    const kalshi = new KalshiClient();

    // 1. Auth Check
    try {
        const balance = await kalshi.getBalance();
        console.log(`✅ Auth Success. Balance: $${(balance / 100).toFixed(2)}`);
    } catch (e) {
        console.error("❌ Auth Failed in Script");
        process.exit(1);
    }

    // 2. Load Markets
    await kalshi.loadMarkets();

    // 3. Find Target (Golden State)
    // Adjust team name if needed based on previous logs
    const targetTeam = "Golden State Warriors";
    const opponent = "Minnesota Timberwolves";

    console.log(`🔍 Looking for ${targetTeam}...`);
    const market = kalshi.findMarketLocal(targetTeam, opponent);

    if (!market) {
        console.error("❌ Market not found in cache!");
        process.exit(1);
    }

    console.log(`✅ Found Market: ${market.title} (${market.ticker})`);
    console.log(`   Ask Price: ${market.yes_ask}¢`);

    // 4. Attempt Test Trade (1 Contract)
    const qty = 1;
    const price = market.yes_ask;

    if (price <= 0 || price > 99) {
        console.error("❌ Invalid Price for test:", price);
        process.exit(1);
    }

    console.log(`🚀 Attempting to BUY 1 YES contract @ ${price}¢...`);

    const result = await kalshi.placeOrder(market.ticker, qty, 'yes', price);

    console.log("\n📋 API Response:");
    console.log(JSON.stringify(result, null, 2));
}

run();
