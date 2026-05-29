import type { Bank } from '@/shared/types';

export type ProductId = 'consumer' | 'mortgage' | 'auto' | 'refinance' | 'early';

export interface CreditProduct {
  id: ProductId;
  label: string;
  emoji: string;
  /** Сдвиг ставки относительно потребительской (ипотека дешевле и т.д.). */
  rateDelta: number;
  rateFloor: number;
  termMin: number;
  termMax: number;
}

export const PRODUCTS: CreditProduct[] = [
  { id: 'consumer',   label: 'Потребит.',     emoji: '💳', rateDelta: 0,   rateFloor: 9,  termMin: 3,  termMax: 84 },
  { id: 'mortgage',   label: 'Ипотека',       emoji: '🏠', rateDelta: -7,  rateFloor: 5,  termMin: 12, termMax: 360 },
  { id: 'auto',       label: 'Автокредит',    emoji: '🚗', rateDelta: -3,  rateFloor: 7,  termMin: 6,  termMax: 84 },
  { id: 'refinance',  label: 'Рефинанс.',     emoji: '🔄', rateDelta: -1,  rateFloor: 6,  termMin: 3,  termMax: 84 },
  { id: 'early',      label: 'Досрочное',     emoji: '⚡', rateDelta: 0,   rateFloor: 1,  termMin: 3,  termMax: 360 },
];

export const getProduct = (id: ProductId): CreditProduct =>
  PRODUCTS.find(p => p.id === id) ?? PRODUCTS[0];

/** Эффективная ставка банка под конкретный продукт (со страховкой или без). */
export const effectiveRate = (bank: Bank, product: CreditProduct, withInsurance: boolean): number => {
  const base = withInsurance ? bank.rateFrom : bank.rateBase;
  return Math.max(product.rateFloor, Math.round((base + product.rateDelta) * 10) / 10);
};
