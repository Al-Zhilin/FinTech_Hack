import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Check, Lock, ShoppingBag, Sparkles, Shirt } from 'lucide-react';
import { useArenaStore } from '@/entities/arena/model/arenaStore';
import {
  SHOP_TABS, SHOP_ITEMS, SLOT_META,
  type ShopTab, type ShopItem, type AccessorySlot,
} from '@/entities/arena/model/copyCat';
import { CopyCat } from './CopyCat';

interface ShopProps { onExit: () => void }

// ─── Примерочная (вкладка «КопиКот») ─────────────────────────────────────────
const WardrobeTab = ({ onExit }: { onExit: () => void }) => {
  const coins       = useArenaStore(s => s.coins);
  const owned       = useArenaStore(s => s.owned);
  const equipped    = useArenaStore(s => s.equipped);
  const buyItem     = useArenaStore(s => s.buyItem);
  const toggleEquip = useArenaStore(s => s.toggleEquip);

  const slots = Object.keys(SLOT_META) as AccessorySlot[];
  const [activeSlot, setActiveSlot] = useState<AccessorySlot>('head');
  const [selected,   setSelected]   = useState<ShopItem | null>(null);
  const [toast,      setToast]      = useState<string | null>(null);

  const slotItems = SHOP_ITEMS.filter(i => i.tab === 'cat' && i.slot === activeSlot);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleBuy = (item: ShopItem) => {
    const res = buyItem(item.id);
    if (res.ok)                        flash(`Куплено: ${item.name} 🎉`);
    else if (res.reason === 'no_coins') flash('Не хватает монет 😿');
    else                               flash('Уже куплено ✓');
  };

  const handleTryOn = (item: ShopItem) => {
    setSelected(item);
    // Временно надеваем чтобы видеть превью
    if (item.slot && !equipped.includes(item.id)) toggleEquip(item.id);
  };

  const handleEquip = (item: ShopItem) => {
    toggleEquip(item.id);
    setSelected(item);
  };

  // Снять временную примерку если не куплено
  const clearPreview = (item: ShopItem | null) => {
    if (!item) return;
    if (!owned.includes(item.id) && equipped.includes(item.id)) toggleEquip(item.id);
  };

  const selectSlot = (slot: AccessorySlot) => {
    clearPreview(selected);
    setSelected(null);
    setActiveSlot(slot);
  };

  const equippedInSlot = slotItems.find(i => equipped.includes(i.id));
  const sel = selected ?? equippedInSlot ?? slotItems[0] ?? null;

  return (
    <div className="flex flex-col h-full">
      {/* Котик с аксессуарами */}
      <div className="flex justify-center items-end pt-2 pb-2" style={{ minHeight: 210 }}>
        <CopyCat size={200} interactive={false} />
      </div>

      {/* Слот-табы */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {slots.map(slot => {
            const meta = SLOT_META[slot];
            const hasEquipped = SHOP_ITEMS.some(i => i.slot === slot && equipped.includes(i.id));
            return (
              <button key={slot} onClick={() => selectSlot(slot)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-2xl text-xs font-bold transition-all relative ${
                  activeSlot === slot
                    ? 'bg-gradient-primary text-white shadow-primary'
                    : 'bg-white shadow-card text-text-secondary'
                }`}>
                <span className="text-base">{meta.emoji}</span>
                <span>{meta.label}</span>
                {hasEquipped && (
                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center ${
                    activeSlot === slot ? 'bg-white text-primary' : 'bg-success text-white'
                  }`}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Список предметов для слота */}
      <div className="px-4 mb-3">
        {slotItems.length === 0 ? (
          <p className="text-center text-sm text-text-tertiary py-4">Предметов нет</p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {slotItems.map(item => {
              const isOwned    = owned.includes(item.id);
              const isEquipped = equipped.includes(item.id);
              const isSelected = sel?.id === item.id;
              return (
                <motion.button key={item.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => isOwned ? handleEquip(item) : handleTryOn(item)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1.5 w-20 py-3 rounded-2xl border-2 transition-all relative ${
                    isSelected
                      ? 'border-primary bg-primary-light shadow-primary'
                      : isOwned
                        ? 'border-success/40 bg-success-light'
                        : 'border-border bg-white shadow-card'
                  }`}>
                  <span className="text-3xl leading-none">{item.emoji}</span>
                  <span className="text-[10px] font-bold text-text-secondary leading-tight text-center px-1 line-clamp-2">
                    {item.name}
                  </span>
                  {isEquipped && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-success text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                      ✓
                    </span>
                  )}
                  {!isOwned && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-warning">
                      <Coins size={9}/>{item.price}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Карточка выбранного предмета */}
      <AnimatePresence mode="wait">
        {sel && (
          <motion.div key={sel.id}
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
            transition={{ duration:0.2 }}
            className="mx-4 mb-4 p-4 bg-white rounded-2xl shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{sel.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-sm text-text-primary truncate">{sel.name}</p>
                <p className="text-[11px] text-text-tertiary leading-snug">{sel.desc}</p>
              </div>
              {!owned.includes(sel.id) && (
                <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 px-2.5 py-1.5 rounded-xl flex-shrink-0">
                  <Coins size={13} className="text-warning"/>
                  <span className="text-sm font-extrabold text-warning">{sel.price}</span>
                </div>
              )}
            </div>

            {owned.includes(sel.id) ? (
              <button onClick={() => handleEquip(sel)}
                className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] ${
                  equipped.includes(sel.id)
                    ? 'bg-bg-muted text-text-secondary'
                    : 'bg-gradient-primary text-white shadow-primary'
                }`}>
                {equipped.includes(sel.id) ? '✓ Надето — снять' : '✨ Надеть'}
              </button>
            ) : (
              <button onClick={() => { handleBuy(sel); }}
                disabled={coins < sel.price}
                className={`w-full py-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  coins >= sel.price
                    ? 'bg-gradient-primary text-white shadow-primary'
                    : 'bg-bg-muted text-text-tertiary'
                }`}>
                {coins >= sel.price
                  ? <><ShoppingBag size={16}/> Купить за {sel.price} монет</>
                  : <><Lock size={14}/> Не хватает {sel.price - coins} монет</>}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Тост */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:24, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:12 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] bg-text-primary text-white text-sm font-semibold px-5 py-2.5 rounded-pill shadow-lg whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Обычная карточка товара (вкладки app / partners) ─────────────────────────
const ShopCard = ({
  item, isOwned, coins, onBuy,
}: { item: ShopItem; isOwned: boolean; coins: number; onBuy: () => void }) => {
  const [imgErr, setImgErr] = useState(false);
  const canAfford = coins >= item.price;

  return (
    <motion.div layout whileHover={{ y:-2 }}
      className="bg-white rounded-3xl shadow-card overflow-hidden flex flex-col">
      <div className="relative w-full aspect-[4/3] overflow-hidden flex-shrink-0"
           style={{ background: item.imageBg ?? '#F2F0ED' }}>
        {!imgErr ? (
          <img src={item.image} alt={item.name} onError={() => setImgErr(true)}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">{item.emoji}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent"/>
        {item.partner && item.partnerBrand && (
          <span className="absolute top-2 left-2 bg-white/95 text-text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
            {item.partnerBrand}
          </span>
        )}
        {isOwned && (
          <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-success text-white flex items-center justify-center shadow-sm">
            <Check size={15}/>
          </span>
        )}
        <div className="absolute bottom-0 inset-x-0 px-3 pb-2 flex items-end justify-between">
          <span className="text-2xl drop-shadow-md">{item.emoji}</span>
          <span className="flex items-center gap-1 bg-black/60 text-yellow-300 font-extrabold text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Coins size={11}/>{item.price.toLocaleString('ru-RU')}
          </span>
        </div>
      </div>

      <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1 gap-1.5">
        <p className="text-sm font-extrabold text-text-primary leading-tight">{item.name}</p>
        <p className="text-[11px] text-text-tertiary leading-snug flex-1">{item.desc}</p>
        {isOwned ? (
          <div className="w-full py-2 rounded-xl text-xs font-bold bg-success-light text-success text-center">✓ Куплено</div>
        ) : (
          <button onClick={onBuy} disabled={!canAfford}
            className={`w-full py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 ${
              canAfford ? 'bg-gradient-primary text-white shadow-primary' : 'bg-bg-muted text-text-tertiary'
            }`}>
            {canAfford ? <><ShoppingBag size={11}/> Купить</> : <><Lock size={11}/> Не хватает</>}
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main Shop ────────────────────────────────────────────────────────────────
export const Shop = ({ onExit }: ShopProps) => {
  const coins   = useArenaStore(s => s.coins);
  const owned   = useArenaStore(s => s.owned);
  const buyItem = useArenaStore(s => s.buyItem);

  const [tab,   setTab]   = useState<ShopTab>('cat');
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800); };
  const items  = SHOP_ITEMS.filter(i => i.tab === tab && !i.slot);

  const TAB_META: Record<ShopTab, { icon: string; label: string }> = {
    cat:      { icon: '🐱', label: 'Гардероб' },
    app:      { icon: '✨', label: 'Приложение' },
    partners: { icon: '🎁', label: 'Партнёры' },
  };

  return (
    <div className="flex flex-col min-h-dvh bg-bg-base">

      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-bg-base/95 backdrop-blur px-5 pt-12 pb-3 border-b border-border-light">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onExit}
            className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center text-text-secondary active:scale-90 transition-transform">
            <ArrowLeft size={20}/>
          </button>
          <div className="flex items-center gap-2">
            {tab === 'cat' ? <Shirt size={16} className="text-primary"/> : <Sparkles size={16} className="text-primary"/>}
            <h1 className="text-lg font-extrabold text-text-primary">
              {TAB_META[tab].label}
            </h1>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 text-warning font-extrabold text-sm px-3 py-1.5 rounded-pill">
            <Coins size={15}/> {coins.toLocaleString('ru-RU')}
          </div>
        </div>

        {/* Вкладки */}
        <div className="flex gap-2 p-1 bg-bg-muted rounded-2xl">
          {SHOP_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === t.key ? 'bg-white text-primary shadow-card' : 'text-text-tertiary'
              }`}>
              <span>{TAB_META[t.key].icon}</span>
              <span className="hidden xs:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity:0, x: tab === 'cat' ? -20 : 20 }}
            animate={{ opacity:1, x:0 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.2 }}>

            {tab === 'cat' ? (
              <WardrobeTab onExit={onExit} />
            ) : (
              <div className="px-4 py-4 grid grid-cols-2 gap-3 pb-8">
                {items.map(item => (
                  <ShopCard key={item.id} item={item}
                    isOwned={owned.includes(item.id)} coins={coins}
                    onBuy={() => {
                      const r = buyItem(item.id);
                      if (r.ok)                        flash(`Куплено: ${item.name} 🎉`);
                      else if (r.reason === 'no_coins') flash('Не хватает монет 😿');
                      else                             flash('Уже куплено ✓');
                    }}
                  />
                ))}
                {tab === 'partners' && (
                  <div className="col-span-2 text-center mt-2">
                    <p className="text-[11px] text-text-tertiary">
                      Партнёрские награды обновляются раз в месяц.<br/>Промокод придёт на email после покупки.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Тост */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:24, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:12 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] bg-text-primary text-white text-sm font-semibold px-5 py-2.5 rounded-pill shadow-lg whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
