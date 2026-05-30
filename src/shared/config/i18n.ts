import { useSettingsStore, type Lang } from './settingsStore';

type Dict = Record<string, string>;

const RU: Dict = {
  // nav
  'nav.home': 'Главная',
  'nav.finance': 'Финансы',
  'nav.ai': 'AI',
  'nav.goals': 'Цели',
  'nav.profile': 'Профиль',
  // profile sections
  'profile.dna': 'Финансовый ДНК-тип',
  'profile.level': 'Уровень',
  'profile.income': 'Доход',
  'profile.expenses': 'Расходы',
  'profile.credits': 'Кредиты',
  'profile.none': 'Нет',
  'profile.sources': 'Источники данных',
  'profile.sources.desc': 'Подключите импорт операций',
  'profile.library': 'Финансовая грамотность',
  'profile.library.desc': 'Карточки на 10 секунд',
  'profile.recap': 'Финансовая неделя',
  'profile.recap.desc': 'Архив воскресных отчётов',
  'profile.notifications': 'Уведомления',
  'profile.security': 'Безопасность',
  'profile.tutorial': 'Повторить туториал',
  'profile.language': 'Язык',
  'profile.currency': 'Валюта',
  'profile.app': 'Приложение',
  'profile.finance': 'Финансы',
  'profile.data': 'Данные и обучение',
  'profile.logout': 'Выйти из аккаунта',
  'profile.month': 'мес',
  'common.save': 'Сохранить',
  'common.connected': 'Подключено',
  'common.notConnected': 'Не подключено',
  'common.soon': 'Скоро',
  'common.open': 'Открыть',
  'common.done': 'Готово',
};

const EN: Dict = {
  'nav.home': 'Home',
  'nav.finance': 'Finance',
  'nav.ai': 'AI',
  'nav.goals': 'Goals',
  'nav.profile': 'Profile',
  'profile.dna': 'Financial DNA type',
  'profile.level': 'Level',
  'profile.income': 'Income',
  'profile.expenses': 'Expenses',
  'profile.credits': 'Loans',
  'profile.none': 'None',
  'profile.sources': 'Data sources',
  'profile.sources.desc': 'Connect transaction import',
  'profile.library': 'Financial literacy',
  'profile.library.desc': '10-second cards',
  'profile.recap': 'Financial week',
  'profile.recap.desc': 'Archive of Sunday reports',
  'profile.notifications': 'Notifications',
  'profile.security': 'Security',
  'profile.tutorial': 'Replay tutorial',
  'profile.language': 'Language',
  'profile.currency': 'Currency',
  'profile.app': 'App',
  'profile.finance': 'Finance',
  'profile.data': 'Data & learning',
  'profile.logout': 'Log out',
  'profile.month': 'mo',
  'common.save': 'Save',
  'common.connected': 'Connected',
  'common.notConnected': 'Not connected',
  'common.soon': 'Soon',
  'common.open': 'Open',
  'common.done': 'Done',
};

const DICTS: Record<Lang, Dict> = { ru: RU, en: EN };

export const translate = (lang: Lang, key: string): string => DICTS[lang][key] ?? RU[key] ?? key;

/** Хук перевода: t('profile.dna'). Реагирует на смену языка. */
export const useT = () => {
  const lang = useSettingsStore(s => s.lang);
  return (key: string) => translate(lang, key);
};
