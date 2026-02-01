'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
    date: string; // "MM/DD"
    profit: number; // Cumulative
}

export default function ProfitChart({ data, color }: { data: ChartData[], color: string }) {
    if (!data || data.length === 0) {
        return (
            <div style={{
                height: 250,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '0.875rem',
                border: '1px dashed #334155',
                borderRadius: '0.5rem',
                background: 'rgba(255,255,255,0.02)'
            }}>
                Not enough history to chart yet.
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 250, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                    <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                    />
                    <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}u`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            color: '#f8fafc',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ color: color, fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(2)}u`, 'Net Profit']}
                        labelStyle={{ color: '#94a3b8', marginBottom: '0.25rem' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="profit"
                        stroke={color}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: '#1e293b', stroke: color, strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
