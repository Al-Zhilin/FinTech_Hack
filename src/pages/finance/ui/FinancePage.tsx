import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import {
  Plus, Search, CreditCard, Wallet,
  TrendingUp, TrendingDown, ChevronDown, X, ArrowUpRight, ArrowDownRight,
  Calculator, ChevronRight,
} from 'lucide-react';
import { useFinanceStore } from '@/entities/finance/model/financeStore';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { MOCK_TRANSACTIONS } from '@/entities/finance/model/transactions';
import {
  periodRange, inRange, summarize, byCategory, buildSeries,
  weekdayInsight, spendingComment, type DateRange,
} from '@/entities/finance/model/financeSelectors';
import { getCategoryMeta } from '@/entities/finance/model/categoryMeta';
import { AddTransactionSheet } from '@/features/add-transaction';
import { AskAiButton } from '@/features/ask-ai';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { formatCurrency, formatDate } from '@/shared/lib/formatters';
import type { FinancePeriod, Transaction } from '@/shared/types';

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

const PERIODS: { id: FinancePeriod; label: string }[] = [
  { id: 'day', label: 'День' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
  { id: 'custom', label: 'Свой' },
];

const CASH_BALANCE = 8_400; // наличные на руках (демо)

export const FinancePage = () => {
  const profile = useFinanceStore(s => s.profile);
  const { txs: userTx, addTx } = useUserTxStore();

  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | TxType>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const allTx = useMemo<Transaction[]>(() => [...userTx, ...MOCK_TRANSACTIONS], [userTx]);

  const custom: DateRange | undefined =
    customFrom && customTo ? { from: new Date(customFrom), to: new Date(customTo + 'T23:59:59') } : undefined;
  const range = periodRange(period, custom);

  const periodTx = useMemo(() => allTx.filter(t => inRange(t, range)), [allTx, range]);
  const summary = useMemo(() => summarize(periodTx), [periodTx]);
  const cats = useMemo(() => byCategory(periodTx, 'expense'), [periodTx]);

  // Для графика «день» берём контекст последних 7 дней
  const chartRange = period === 'day' ? periodRange('week') : range;
  const chartTx = period === 'day' ? allTx.filter(t => inRange(t, chartRange)) : periodTx;
  const series = useMemo(() => buildSeries(chartTx, period === 'day' ? 'week' : period, chartRange), [chartTx, period, chartRange]);

  // Инсайт по дням недели — на стабильном окне 90 дней
  const insight = useMemo(() => {
    const r = periodRange('month');
    r.from.setDate(r.from.getDate() - 60);
    return weekdayInsight(allTx.filter(t => inRange(t, r)));
  }, [allTx]);

  const balanceCard = profile.balance;
  const totalBalance = balanceCard + CASH_BALANCE;

  // История: поиск + фильтр
  const history = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodTx.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (q && !(`${t.title} ${t.merchant ?? ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [periodTx, search, filterType]);

  const [historyLimit, setHistoryLimit] = useState(25);

  const topComment = spendingComment(summary, cats[0]);

  return (
    <motion.div className="flex flex-col bg-bg-base min-h-full pb-24"
      variants={container} initial="hidden" animate="show">

      {/* ── Header: balance ── */}
      <motion.div variants={item} className="px-5 pt-12 pb-4">
        <p className="text-text-tertiary text-sm">Общий баланс</p>
        <h1 className="text-4xl font-bold text-text-primary mb-4">{formatCurrency(totalBalance)}</h1>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-card">
            <CreditCard size={16} className="text-primary mb-1" />
            <p className="text-[11px] text-text-tertiary">Карта</p>
            <p className="font-bold text-sm text-text-primary">{formatCurrency(balanceCard, true)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-card">
            <Wallet size={16} className="text-purple mb-1" />
            <p className="text-[11px] text-text-tertiary">Наличные</p>
            <p className="font-bold text-sm text-text-primary">{formatCurrency(CASH_BALANCE, true)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-card">
            <TrendingUp size={16} className="text-success mb-1" />
            <p className="text-[11px] text-text-tertiary">Свободно</p>
            <p className={`font-bold text-sm ${summary.net >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(summary.net, true)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Period switcher ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <div className="flex gap-1.5 bg-white p-1 rounded-xl shadow-card">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => { p.id === 'custom' ? setCustomOpen(true) : setPeriod(p.id); if (p.id !== 'custom') { /* */ } }}
              className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all ${
                period === p.id ? 'bg-gradient-primary text-white shadow-primary' : 'text-text-tertiary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Income / Expense summary ── */}
      <motion.div variants={item} className="px-5 mb-4 grid grid-cols-2 gap-3">
        <div className="bg-success-light rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownRight size={15} className="text-success" />
            <span className="text-xs font-medium text-text-secondary">Доходы</span>
          </div>
          <p className="text-xl font-bold text-success">{formatCurrency(summary.income, true)}</p>
        </div>
        <div className="bg-danger-light rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight size={15} className="text-danger" />
            <span className="text-xs font-medium text-text-secondary">Расходы</span>
          </div>
          <p className="text-xl font-bold text-danger">{formatCurrency(summary.expense, true)}</p>
        </div>
      </motion.div>

      {/* ── Credit calculators shortcut ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <Link to="/analytics" className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-card active:scale-[0.99] transition-transform">
          <span className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
            <Calculator size={20} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-sm text-text-primary">Кредитные калькуляторы</p>
            <p className="text-xs text-text-tertiary">Подбор условий под ваши финансы</p>
          </div>
          <ChevronRight size={18} className="text-text-tertiary" />
        </Link>
      </motion.div>

      {/* ── Chart + AI comment ── */}
      <motion.div variants={item} className="px-5 mb-4">
        <Card variant="default" padding="lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-text-primary">Динамика</h2>
            <span className="text-xs text-text-tertiary">
              {period === 'day' ? 'последние 7 дней' : PERIODS.find(p => p.id === period)?.label}
            </span>
          </div>

          <div className="h-44 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#AEAEB2' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v: number, name) => [formatCurrency(v, true), name === 'expense' ? 'Расход' : 'Доход']}
                />
                <Bar dataKey="expense" radius={[4, 4, 0, 0]} fill="#E8856A" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AI-комментарий под блоком */}
          <div className="mt-3 bg-bg-muted rounded-xl p-3">
            <p className="text-sm text-text-secondary leading-snug mb-2">{topComment}</p>
            {insight && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-semibold ${insight.higher ? 'text-danger' : 'text-success'}`}>
                  {insight.higher ? <TrendingUp size={14} className="inline mr-1" /> : <TrendingDown size={14} className="inline mr-1" />}
                  {insight.text}
                </span>
                <AskAiButton
                  variant="chip"
                  question={`Я заметил по статистике: ${insight.text.toLowerCase()}. Почему так может быть и что с этим делать?`}
                  label="Почему так бывает?"
                />
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* ── Categories: top-3 + donut ── */}
      {cats.length > 0 && (
        <motion.div variants={item} className="px-5 mb-4">
          <Card variant="default" padding="lg">
            <h2 className="text-base font-bold text-text-primary mb-3">Категории расходов</h2>
            <div className="flex items-center gap-4">
              <div className="relative w-28 h-28 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cats} dataKey="amount" innerRadius={38} outerRadius={56} paddingAngle={2} stroke="none">
                      {cats.map(c => <Cell key={c.id} fill={c.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-text-tertiary">Всего</span>
                  <span className="text-sm font-bold text-text-primary">{formatCurrency(summary.expense, true)}</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                {cats.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: c.color + '22' }}>{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-primary font-medium truncate">{c.label}</span>
                        <span className="text-text-secondary font-semibold">{Math.round(c.pct)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Раскрытие всех категорий */}
            <AnimatePresence initial={false}>
              {expanded === 'cats' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex flex-col gap-2.5 pt-4 mt-3 border-t border-border-light">
                    {cats.map(c => (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ backgroundColor: c.color + '20' }}>{c.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-text-primary">{c.label}</span>
                            <span className="text-sm font-semibold text-text-primary">{formatCurrency(c.amount, true)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-border-light overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                          </div>
                        </div>
                        <span className="text-xs text-text-tertiary w-8 text-right">{c.count}×</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setExpanded(e => e === 'cats' ? null : 'cats')}
              className="w-full mt-3 flex items-center justify-center gap-1 text-sm font-semibold text-primary"
            >
              {expanded === 'cats' ? 'Свернуть' : 'Все категории'}
              <ChevronDown size={15} className={`transition-transform ${expanded === 'cats' ? 'rotate-180' : ''}`} />
            </button>
          </Card>
        </motion.div>
      )}

      {/* ── History ── */}
      <motion.div variants={item} className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-text-primary">История</h2>
          <span className="text-xs text-text-tertiary">{history.length} операций</span>
        </div>

        {/* Search + filter */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 h-10 px-3 bg-white rounded-xl border border-border">
            <Search size={16} className="text-text-tertiary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по операциям"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
            />
            {search && <button onClick={() => setSearch('')}><X size={15} className="text-text-tertiary" /></button>}
          </div>
        </div>
        <div className="flex gap-1.5 mb-3">
          {([['all', 'Все'], ['expense', 'Расходы'], ['income', 'Доходы']] as const).map(([f, label]) => (
            <button key={f} onClick={() => setFilterType(f)}
              className={`px-3 h-8 rounded-full text-xs font-semibold transition-all ${filterType === f ? 'bg-text-primary text-white' : 'bg-white text-text-tertiary border border-border'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex flex-col gap-2">
          {history.slice(0, historyLimit).map(t => {
            const m = getCategoryMeta(t.category);
            const isIncome = t.type === 'income';
            return (
              <div key={t.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-card">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: m.color + '20' }}>{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-text-primary truncate">{t.title}</p>
                  <p className="text-xs text-text-tertiary">{m.label} · {formatDate(t.date)} · {t.method === 'cash' ? 'наличные' : 'карта'}</p>
                </div>
                <span className={`font-bold text-sm flex-shrink-0 ${isIncome ? 'text-success' : 'text-text-primary'}`}>
                  {isIncome ? '+' : '−'}{formatCurrency(t.amount)}
                </span>
              </div>
            );
          })}
          {history.length === 0 && (
            <p className="text-center text-sm text-text-tertiary py-8">Нет операций за период</p>
          )}
        </div>
        {history.length > historyLimit && (
          <button onClick={() => setHistoryLimit(n => n + 25)} className="w-full mt-3 h-11 rounded-xl bg-white border border-border text-sm font-semibold text-text-secondary">
            Показать ещё
          </button>
        )}
      </motion.div>

      {/* ── FAB ── */}
      <div className="fixed inset-x-0 bottom-24 z-40 pointer-events-none">
        <div className="max-w-mobile mx-auto px-5 flex justify-end">
          <button
            onClick={() => setAddOpen(true)}
            className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-primary text-white shadow-primary flex items-center justify-center active:scale-90 transition-transform"
          >
            <Plus size={26} />
          </button>
        </div>
      </div>

      {/* ── Add sheet ── */}
      <AddTransactionSheet open={addOpen} onClose={() => setAddOpen(false)} onAdd={addTx} />

      {/* ── Custom period sheet ── */}
      <BottomSheet open={customOpen} onClose={() => setCustomOpen(false)} title="Свой период">
        <div className="flex flex-col gap-4">
          <Input label="С" type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <Input label="По" type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          <Button size="lg" fullWidth disabled={!customFrom || !customTo}
            onClick={() => { setPeriod('custom'); setCustomOpen(false); }}>
            Применить
          </Button>
        </div>
      </BottomSheet>
    </motion.div>
  );
};
