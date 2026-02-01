
import { NextResponse } from 'next/server';
import { settlePicks } from '@/lib/logic/settler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        await settlePicks();

        return NextResponse.json({ success: true, message: 'Settlement complete' });
    } catch (error: any) {
        console.error("Cron Settle Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
