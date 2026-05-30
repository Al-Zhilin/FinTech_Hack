import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Check, Lock } from 'lucide-react';
import { useArenaStore } from '@/entities/arena/model/arenaStore';
import { SHOP_TABS, SHOP_ITEMS, type ShopTab, type ShopItem } from '@/entities/arena/model/copyCat';
import { CopyCat } from './CopyCat';

interface ShopProps { onExit: () => void }

export const Shop = ({ onExit }: ShopProps) => {
  const coins = useArenaStore(s => s.coins);
  const owned = useArenaStore(s => s.owned);
  const equipped = useArenaStore(s => s.equipped);
  const buyItem = useArenaStore(s => s.buyItem);
  const toggleEquip = useArenaStore(s => s.toggleEquip);

  const [tab, setTab] = useState<ShopTab>('cat');
  const [tryOn, setTryOn] = useState<ShopItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const items = SHOP_ITEMS.filter(i => i.tab === tab);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  const handleBuy = (item: ShopItem) => {
    const res = buyItem(item.id);
    if (res.ok) flash(`Куплено: ${item.name} 🎉`);
    else if (res.reason === 'no_coins') flash('Не хватает монет 😿');
    else if (res.reason === 'owned') flash('Уже куплено');
  };

  // Примерка: временно надеваем предмет на превью-кота (через equipped).
  const handleTryOn = (item: ShopItem) => {
    setTryOn(item);
    if (item.slot && !equipped.includes(item.id)) toggleEquip(item.id);
  };

  const closeTryOn = () => {
    // Если примеряли некупленный предмет — снимаем его обратно.
    if (tryOn?.slot && !owned.includes(tryOn.id) && equipped.includes(tryOn.id)) {
      toggleEquip(tryOn.id);
    }
    setTryOn(null);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-bg-base">
      {/* Шапка с балансом */}
      <div className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur px-5 pt-12 pb-3">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onExit} className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center text-text-secondary">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-extrabold text-text-primary">Витрина наград</h1>
          <div className="flex items-center gap-1.5 bg-warning-light text-warning font-extrabold px-3 py-1.5 rounded-pill">
            <Coins size={16} /> {coins}
          </div>
        </div>

        {/* Вкладки */}
        <div className="flex gap-2 p-1 bg-bg-muted rounded-pill">
          {SHOP_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-pill text-sm font-bold transition-all ${
                tab === t.key ? 'bg-white text-primary shadow-card' : 'text-text-tertiary'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Товары */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        {items.map(item => {
          const isOwned = owned.includes(item.id);
          const isEquipped = equipped.includes(item.id);
          const canAfford = coins >= item.price;
          return (
            <motion.div key={item.id} layout
              className="bg-white rounded-2xl shadow-card p-3 flex flex-col">
              <div className="aspect-square rounded-xl bg-bg-muted flex items-center justify-center text-5xl mb-2 relative">
                {item.emoji}
                {item.partner && (
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
                    Партнёр
                  </span>
                )}
                {isOwned && (
                  <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-success text-white flex items-center justify-center">
                    <Check size={14} />
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-text-primary leading-tight">{item.name}</p>
              <p className="text-[11px] text-text-tertiary leading-snug mb-2 flex-1">{item.desc}</p>

              <div className="flex items-center gap-1 mb-2 text-warning font-extrabold text-sm">
                <Coins size={14} /> {item.price}
              </div>

              {item.slot && (
                <button onClick={() => handleTryOn(item)}
                  className="w-full mb-1.5 py-1.5 rounded-pill text-xs font-bold text-primary bg-primary-light active:scale-95 transition-transform">
                  Примерить
                </button>
              )}

              {isOwned ? (
                item.slot ? (
                  <button onClick={() => toggleEquip(item.id)}
                    className={`w-full py-1.5 rounded-pill text-xs font-bold transition-transform active:scale-95 ${
                      isEquipped ? 'bg-bg-muted text-text-secondary' : 'bg-success-light text-success'}`}>
                    {isEquipped ? 'Снять' : 'Надеть'}
                  </button>
                ) : (
                  <div className="w-full py-1.5 rounded-pill text-xs font-bold bg-success-light text-success text-center">
                    Куплено
                  </div>
                )
              ) : (
                <button onClick={() => handleBuy(item)} disabled={!canAfford}
                  className={`w-full py-1.5 rounded-pill text-xs font-bold flex items-center justify-center gap-1 transition-transform active:scale-95 ${
                    canAfford ? 'bg-gradient-primary text-white' : 'bg-bg-muted text-text-tertiary'}`}>
                  {!canAfford && <Lock size={12} />} Купить
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {tab === 'partners' && (
        <p className="px-5 pb-4 -mt-1 text-center text-[11px] text-text-tertiary">
          Ассортимент партнёрских наград обновляется раз в месяц.
        </p>
      )}

      {/* Примерочная */}
      <AnimatePresence>
        {tryOn && (
          <motion.div className="fixed inset-0 z-modal flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeTryOn} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full max-w-mobile bg-white rounded-t-3xl px-5 pt-5 pb-8">
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-2" />
              <h3 className="text-center font-extrabold text-text-primary mb-1">Примерка: {tryOn.name}</h3>
              <p className="text-center text-xs text-text-tertiary mb-2">{tryOn.desc}</p>
              <div className="flex justify-center mb-4">
                <CopyCat size={180} interactive={false} />
              </div>
              {owned.includes(tryOn.id) ? (
                <button onClick={closeTryOn}
                  className="w-full py-3.5 rounded-pill bg-bg-muted text-text-secondary font-bold">
                  Готово
                </button>
              ) : (
                <button onClick={() => { handleBuy(tryOn); setTryOn(null); }}
                  disabled={coins < tryOn.price}
                  className={`w-full py-3.5 rounded-pill font-bold flex items-center justify-center gap-1.5 ${
                    coins >= tryOn.price ? 'bg-gradient-primary text-white shadow-primary' : 'bg-bg-muted text-text-tertiary'}`}>
                  <Coins size={18} /> Купить за {tryOn.price}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Тост */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-toast bg-text-primary text-white text-sm font-semibold px-4 py-2.5 rounded-pill shadow-lg">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
