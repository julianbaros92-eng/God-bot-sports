
import { db } from '../../lib/db';

export const dynamic = 'force-dynamic';

export default async function DebugDBPage() {
    let status = "Checking...";
    let count = 0;
    let errorMsg = null;
    let picksSample: any[] = [];

    try {
        count = await db.pick.count();
        picksSample = await db.pick.findMany({ take: 5 });
        status = "Connected Successfully";
    } catch (e: any) {
        status = "Connection Failed";
        errorMsg = e.message + "\n" + JSON.stringify(e, null, 2);
    }

    return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#0f172a', color: 'white', minHeight: '100vh' }}>
            <h1>Database Debugger</h1>
            <p><strong>Status:</strong> <span style={{ color: errorMsg ? 'red' : 'green' }}>{status}</span></p>
            <p><strong>Env DATABASE_URL:</strong> {process.env.DATABASE_URL ? (process.env.DATABASE_URL.substring(0, 20) + '...') : 'MISSING'}</p>

            <hr style={{ borderColor: '#334155', margin: '1rem 0' }} />

            {errorMsg ? (
                <div style={{ background: '#450a0a', padding: '1rem', borderRadius: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    {errorMsg}
                </div>
            ) : (
                <div>
                    <p>Total Picks found: <strong>{count}</strong></p>
                    <h3>Last 5 Picks:</h3>
                    <pre style={{ background: '#1e293b', padding: '1rem', overflowX: 'auto' }}>
                        {JSON.stringify(picksSample, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
