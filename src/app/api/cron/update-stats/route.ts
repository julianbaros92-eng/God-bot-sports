
import { NextResponse } from 'next/server';
import { updateTeamStats } from '@/lib/logic/stats-updater';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for fetching season data

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // return new NextResponse('Unauthorized', { status: 401 }); // Open for now or verify
        }

        console.log("⚡ Triggering Daily Stats Update...");
        await updateTeamStats();

        return NextResponse.json({ success: true, message: "Stats Updated" });
    } catch (error: any) {
        console.error("Cron Update Failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
