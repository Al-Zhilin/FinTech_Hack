import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Check, Lock, ShoppingBag, Sparkles } from 'lucide-react';
import { useArenaStore } from '@/entities/arena/model/arenaStore';
import { SHOP_TABS, SHOP_ITEMS, type ShopTab, type ShopItem } from '@/entities/arena/model/copyCat';
import { CopyCat } from './CopyCat';

interface ShopProps { onExit: () => void }

// ─── Карточка товара ──────────────────────────────────────────────────────────
interface CardProps {
  item: ShopItem;
  isOwned: boolean;
  isEquipped: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onTryOn?: () => void;
  onToggleEquip: () => void;
}

const ShopCard = ({ item, isOwned, isEquipped, canAfford, onBuy, onTryOn, onToggleEquip }: CardProps) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="bg-white rounded-3xl shadow-card overflow-hidden flex flex-col"
    >
      {/* Картинка */}
      <div
        className="relative w-full aspect-[4/3] overflow-hidden flex-shrink-0"
        style={{ background: item.imageBg ?? '#F2F0ED' }}
      >
        {!imgErr ? (
          <img
            src={item.image}
            alt={item.name}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {item.emoji}
          </div>
        )}

        {/* Затемнение снизу */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Бейдж партнёра */}
        {item.partner && item.partnerBrand && (
          <span className="absolute top-2 left-2 bg-white/95 text-text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
            {item.partnerBrand}
          </span>
        )}

        {/* Купленный бейдж */}
        {isOwned && (
          <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-success text-white flex items-center justify-center shadow-sm">
            <Check size={15} />
          </span>
        )}

        {/* Эмодзи + цена поверх картинки (внизу) */}
        <div className="absolute bottom-0 inset-x-0 px-3 pb-2 flex items-end justify-between">
          <span className="text-2xl drop-shadow-md">{item.emoji}</span>
          <span className="flex items-center gap-1 bg-black/60 text-yellow-300 font-extrabold text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Coins size={11} /> {item.price.toLocaleString('ru-RU')}
          </span>
        </div>
      </div>

      {/* Контент */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1 gap-1.5">
        <p className="text-sm font-extrabold text-text-primary leading-tight">{item.name}</p>
        <p className="text-[11px] text-text-tertiary leading-snug flex-1">{item.desc}</p>

        <div className="flex flex-col gap-1.5 mt-1">
          {/* Кнопка «Примерить» только для аксессуаров кота */}
          {item.slot && onTryOn && !isOwned && (
            <button
              onClick={onTryOn}
              className="w-full py-1.5 rounded-xl text-xs font-bold text-primary bg-primary-light active:scale-95 transition-transform"
            >
              👀 Примерить
            </button>
          )}

          {/* Основная кнопка */}
          {isOwned ? (
            item.slot ? (
              <button
                onClick={onToggleEquip}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  isEquipped
                    ? 'bg-bg-muted text-text-secondary'
                    : 'bg-success-light text-success'
                }`}
              >
                {isEquipped ? 'Снять ✓' : 'Надеть'}
              </button>
            ) : (
              <div className="w-full py-2 rounded-xl text-xs font-bold bg-success-light text-success text-center">
                ✓ Куплено
              </div>
            )
          ) : (
            <button
              onClick={onBuy}
              disabled={!canAfford}
              className={`w-full py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 ${
                canAfford
                  ? 'bg-gradient-primary text-white shadow-primary'
                  : 'bg-bg-muted text-text-tertiary'
              }`}
            >
              {!canAfford ? <Lock size={11} /> : <ShoppingBag size={11} />}
              {canAfford ? 'Купить' : 'Не хватает'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Shop ────────────────────────────────────────────────────────────────
export const Shop = ({ onExit }: ShopProps) => {
  const coins      = useArenaStore(s => s.coins);
  const owned      = useArenaStore(s => s.owned);
  const equipped   = useArenaStore(s => s.equipped);
  const buyItem    = useArenaStore(s => s.buyItem);
  const toggleEquip = useArenaStore(s => s.toggleEquip);

  const [tab, setTab]       = useState<ShopTab>('cat');
  const [tryOn, setTryOn]   = useState<ShopItem | null>(null);
  const [toast, setToast]   = useState<string | null>(null);

  const items = SHOP_ITEMS.filter(i => i.tab === tab);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleBuy = (item: ShopItem) => {
    const res = buyItem(item.id);
    if (res.ok)                       flash(`Куплено: ${item.name} 🎉`);
    else if (res.reason === 'no_coins') flash('Не хватает монет 😿');
    else if (res.reason === 'owned')   flash('Уже куплено ✓');
  };

  const handleTryOn = (item: ShopItem) => {
    setTryOn(item);
    if (item.slot && !equipped.includes(item.id)) toggleEquip(item.id);
  };

  const closeTryOn = () => {
    if (tryOn?.slot && !owned.includes(tryOn.id) && equipped.includes(tryOn.id)) {
      toggleEquip(tryOn.id);
    }
    setTryOn(null);
  };

  const TAB_ICONS: Record<ShopTab, string> = {
    cat: '🐱',
    app: '✨',
    partners: '🎁',
  };

  return (
    <div className="flex flex-col min-h-dvh bg-bg-base">

      {/* ── Шапка ── */}
      <div className="sticky top-0 z-10 bg-bg-base/95 backdrop-blur px-5 pt-12 pb-3 border-b border-border-light">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onExit}
            className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center text-text-secondary active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h1 className="text-lg font-extrabold text-text-primary">Витрина наград</h1>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 text-warning font-extrabold text-sm px-3 py-1.5 rounded-pill">
            <Coins size={15} /> {coins.toLocaleString('ru-RU')}
          </div>
        </div>

        {/* Вкладки */}
        <div className="flex gap-2 p-1 bg-bg-muted rounded-2xl">
          {SHOP_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === t.key
                  ? 'bg-white text-primary shadow-card'
                  : 'text-text-tertiary'
              }`}
            >
              <span>{TAB_ICONS[t.key]}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Сетка товаров ── */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3 pb-8">
        <AnimatePresence mode="wait">
          {items.map(item => (
            <ShopCard
              key={item.id}
              item={item}
              isOwned={owned.includes(item.id)}
              isEquipped={equipped.includes(item.id)}
              canAfford={coins >= item.price}
              onBuy={() => handleBuy(item)}
              onTryOn={item.slot ? () => handleTryOn(item) : undefined}
              onToggleEquip={() => toggleEquip(item.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {tab === 'partners' && (
        <div className="px-5 pb-6 flex flex-col items-center gap-1 -mt-2">
          <p className="text-[11px] text-text-tertiary text-center">
            Партнёрские награды обновляются раз в месяц.<br/>
            Промокод придёт на email после покупки.
          </p>
        </div>
      )}

      {/* ── Примерочная ── */}
      <AnimatePresence>
        {tryOn && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeTryOn}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full max-w-mobile bg-white rounded-t-3xl px-5 pt-4 pb-8 shadow-lg"
            >
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-3" />

              {/* Фото товара в примерочной */}
              <div
                className="w-full h-32 rounded-2xl overflow-hidden mb-4 relative"
                style={{ background: tryOn.imageBg ?? '#F2F0ED' }}
              >
                <img
                  src={tryOn.image}
                  alt={tryOn.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute bottom-3 left-4 text-white">
                  <p className="text-lg font-extrabold drop-shadow">{tryOn.name}</p>
                  <div className="flex items-center gap-1 text-yellow-300 text-xs font-bold">
                    <Coins size={11} /> {tryOn.price.toLocaleString('ru-RU')} монет
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-text-secondary mb-3">{tryOn.desc}</p>

              {/* Кот с аксессуаром */}
              <div className="flex justify-center mb-5">
                <CopyCat size={170} interactive={false} />
              </div>

              {owned.includes(tryOn.id) ? (
                <button
                  onClick={closeTryOn}
                  className="w-full py-3.5 rounded-2xl bg-bg-muted text-text-secondary font-bold"
                >
                  Готово
                </button>
              ) : (
                <button
                  onClick={() => { handleBuy(tryOn); setTryOn(null); }}
                  disabled={coins < tryOn.price}
                  className={`w-full py-3.5 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all ${
                    coins >= tryOn.price
                      ? 'bg-gradient-primary text-white shadow-primary active:scale-[0.98]'
                      : 'bg-bg-muted text-text-tertiary'
                  }`}
                >
                  <Coins size={18} />
                  {coins >= tryOn.price ? `Купить за ${tryOn.price.toLocaleString('ru-RU')}` : 'Не хватает монет'}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Тост ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] bg-text-primary text-white text-sm font-semibold px-5 py-2.5 rounded-pill shadow-lg whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
