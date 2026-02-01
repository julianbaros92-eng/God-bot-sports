
import { NextResponse } from 'next/server';
import { runScanner } from '@/lib/logic/scanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds (Vercel Hobby Limit) - Pro is 300

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await runScanner();

        return NextResponse.json({ success: true, message: 'Scan complete' });
    } catch (error: any) {
        console.error("Cron Scan Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
