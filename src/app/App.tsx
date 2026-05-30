import { useEffect } from 'react';
import { RouterProvider } from './providers/RouterProvider';
import { useSettingsStore } from '@/shared/config/settingsStore';
import { setMoneyConfig } from '@/shared/lib/formatters';
import { useUserStore } from '@/entities/user/model/userStore';
import { useFinanceStore } from '@/entities/finance/model/financeStore';

const App = () => {
  const lang = useSettingsStore(s => s.lang);
  const currency = useSettingsStore(s => s.currency);
  const user = useUserStore(s => s.user);
  const syncFromUser = useFinanceStore(s => s.syncFromUser);

  // Синхронизируем форматтер валюты до рендера дочерних экранов.
  setMoneyConfig(lang, currency);

  // Синхронизируем финансовый профиль при изменении данных пользователя.
  useEffect(() => {
    syncFromUser(user);
  }, [user, syncFromUser]);

  // key заставляет всё дерево перемонтироваться при смене языка/валюты —
  // так пересчитываются суммы и обновляются переводы во всём приложении.
  return (
    <div key={`${lang}-${currency}`} className="contents">
      <RouterProvider />
    </div>
  );
};

export default App;
