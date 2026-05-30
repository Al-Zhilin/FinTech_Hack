import { useEffect } from 'react';
import { RouterProvider } from './providers/RouterProvider';
import { useSettingsStore } from '@/shared/config/settingsStore';
import { setMoneyConfig } from '@/shared/lib/formatters';
import { useUserStore } from '@/entities/user/model/userStore';
import { useUserTxStore } from '@/entities/finance/model/userTxStore';
import { useUserGoalsStore } from '@/entities/goal/model/userGoalsStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';

const App = () => {
  const lang = useSettingsStore(s => s.lang);
  const currency = useSettingsStore(s => s.currency);
  const user = useUserStore(s => s.user);
  const txs = useUserTxStore(s => s.txs);
  const bankConnected = useUserTxStore(s => s.bankConnected);
  const goals = useUserGoalsStore(s => s.goals);
  const syncFromUser = useFinanceStore(s => s.syncFromUser);

  // Синхронизируем форматтер валюты до рендера дочерних экранов.
  setMoneyConfig(lang, currency);

  // Синхронизируем финансовый профиль при изменении данных пользователя и операций.
  useEffect(() => {
    syncFromUser(user, txs, goals);
  }, [user, txs, goals, bankConnected, syncFromUser]);

  // key заставляет всё дерево перемонтироваться при смене языка/валюты —
  // так пересчитываются суммы и обновляются переводы во всём приложении.
  return (
    <div key={`${lang}-${currency}`} className="contents">
      <RouterProvider />
    </div>
  );
};

export default App;
