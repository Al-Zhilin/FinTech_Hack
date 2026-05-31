import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getCashflow, calculateCashflow, type CashflowResult } from '@/shared/api/cashflow';
import { formatCurrency } from '@/shared/lib/formatters';

interface Props {
  userId: string;
}

export const CashflowWidget = ({ userId }: Props) => {
  const [data, setData] = useState<CashflowResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalc, setShowCalc] = useState(false);
  const [balance, setBalance] = useState('');
  const [days, setDays] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCashflow(userId)
      .then(r => { if (!cancelled) setData(r); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const handleCalc = async () => {
    const b = parseFloat(balance);
    const d = parseInt(days);
    if (isNaN(b) || isNaN(d) || d < 1) return;
    setCalcLoading(true);
    const r = await calculateCashflow(userId, b, d);
    setCalcLoading(false);
    if (r) { setData(r); setShowCalc(false); }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-card p-4 animate-pulse h-28">
        <div className="h-3 bg-border-light rounded w-1/2 mb-3" />
        <div className="h-10 bg-border-light rounded mb-2" />
        <div className="h-3 bg-border-light rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  const isNeg = data.will_be_negative;
  const hasForecast = data.forecast && data.forecast.length > 0;

  return (
    <div className={`rounded-2xl shadow-card p-4 border ${isNeg ? 'bg-danger-light border-danger/20' : 'bg-white border-border-light'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">💸</span>
          <span className="text-sm font-bold text-text-primary">Прогноз до зарплаты</span>
        </div>
        <button
          onClick={() => setShowCalc(v => !v)}
          className="text-xs text-primary font-medium"
        >
          Пересчитать
        </button>
      </div>

      {data.error ? (
        <div className="rounded-xl bg-bg-muted p-3">
          <p className="text-sm text-text-secondary leading-snug">
            {/профил/i.test(data.error)
              ? 'Запишите несколько трат и укажите остаток — тогда прогноз до зарплаты станет доступен.'
              : data.error}
          </p>
        </div>
      ) : (
        <>
          {data.verdict && (
            <p className="text-sm text-text-secondary leading-snug mb-2">{data.verdict}</p>
          )}
          {isNeg && data.danger_day != null && (
            <p className="text-xs font-semibold text-danger mb-2">
              ⚠ Деньги закончатся через {data.danger_day} дн.
            </p>
          )}

          {/* Ключевые цифры */}
          {(data.projected_balance != null || data.daily_burn != null) && (
            <div className="flex gap-2 mb-2">
              {data.projected_balance != null && (
                <div className="flex-1 bg-bg-muted rounded-xl px-3 py-2">
                  <p className="text-[10px] text-text-tertiary">Остаток к зарплате</p>
                  <p className={`text-sm font-bold ${data.projected_balance < 0 ? 'text-danger' : 'text-text-primary'}`}>
                    {formatCurrency(data.projected_balance, true)}
                  </p>
                </div>
              )}
              {data.daily_burn != null && (
                <div className="flex-1 bg-bg-muted rounded-xl px-3 py-2">
                  <p className="text-[10px] text-text-tertiary">Трачу в день</p>
                  <p className="text-sm font-bold text-text-primary">{formatCurrency(data.daily_burn, true)}</p>
                </div>
              )}
            </div>
          )}

          {hasForecast && (
            <div className="h-20 mt-1 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.forecast} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="day" hide />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    labelFormatter={(l: number) => `День ${l}`}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <ReferenceLine y={0} stroke="#FF3B30" strokeDasharray="3 3" />
                  {(data.risk_events ?? []).map(e => (
                    <ReferenceLine key={e.day} x={e.day} stroke="#FF9500" strokeDasharray="2 2" />
                  ))}
                  <Line
                    type="monotone" dataKey="balance" dot={false}
                    stroke={isNeg ? '#FF3B30' : '#E8856A'} strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showCalc && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
          >
            <div className="flex gap-2 mt-2 pt-2 border-t border-border-light">
              <input
                value={balance}
                onChange={e => setBalance(e.target.value)}
                placeholder="Баланс, ₽"
                type="number"
                className="flex-1 h-9 px-3 bg-bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors"
              />
              <input
                value={days}
                onChange={e => setDays(e.target.value)}
                placeholder="Дней"
                type="number"
                min="1"
                max="60"
                className="w-20 h-9 px-3 bg-bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleCalc}
                disabled={calcLoading}
                className="h-9 px-3 bg-gradient-primary text-white text-sm rounded-xl font-medium disabled:opacity-50 flex-shrink-0"
              >
                {calcLoading ? '…' : 'OK'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
