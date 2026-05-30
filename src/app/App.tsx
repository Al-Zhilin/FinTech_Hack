import { RouterProvider } from './providers/RouterProvider';
import { useSettingsStore } from '@/shared/config/settingsStore';
import { setMoneyConfig } from '@/shared/lib/formatters';

const App = () => {
  const lang = useSettingsStore(s => s.lang);
  const currency = useSettingsStore(s => s.currency);

  // Синхронизируем форматтер валюты до рендера дочерних экранов.
  setMoneyConfig(lang, currency);

  // key заставляет всё дерево перемонтироваться при смене языка/валюты —
  // так пересчитываются суммы и обновляются переводы во всём приложении.
  return (
    <div key={`${lang}-${currency}`} className="contents">
      <RouterProvider />
    </div>
  );
};

export default App;
