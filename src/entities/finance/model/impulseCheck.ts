import type { Goal, User } from '@/shared/types';
import { analyzeGoal, type GoalFinance } from '@/entities/goal/model/goalAnalysis';
import type { SafeSpendResult } from './safeToSpend';
import { daysLeftInMonth, daysUntilSalary } from './safeToSpend';

export type ImpulseVerdict = 'ok' | 'caution' | 'danger';

export interface ImpulseCheckResult {
  verdict: ImpulseVerdict;
  messages: string[];
  safeAfterPurchase: number;
}

export function evaluateImpulsePurchase(
  amount: number,
  title: string,
  user: User | null,
  safeSpend: SafeSpendResult,
  goals: Goal[],
  finance: GoalFinance,
): ImpulseCheckResult {
  if (amount <= 0) {
    return {
      verdict: 'ok',
      messages: ['Введи сумму покупки — и я переведу её на понятный язык.'],
      safeAfterPurchase: safeSpend.safeAmount,
    };
  }

  const messages: string[] = [];
  const income = user?.income ?? finance.income;
  const hourlyRate = income > 0 ? income / 160 : 0;

  if (hourlyRate > 0) {
    const hours = Math.round(amount / hourlyRate);
    messages.push(`Это ${hours} ${hoursWord(hours)} твоей работы.`);
  }

  const primaryGoal = goals[0];
  if (primaryGoal) {
    const ga = analyzeGoal(primaryGoal, finance);
    if (ga.requiredMonthly > 0 && ga.status !== 'done') {
      const weeksDelay = amount / (ga.requiredMonthly / 4);
      if (weeksDelay >= 0.5) {
        const weeks = Math.max(1, Math.round(weeksDelay));
        messages.push(`Эта покупка отодвинет «${primaryGoal.title}» ещё на ${weeks} ${weeksWord(weeks)}.`);
      }
    }
  }

  const safeAfter = safeSpend.safeAmount - amount;
  const daysLeft = daysLeftInMonth();
  const foodPerDay = Math.floor(Math.max(0, safeAfter) / daysLeft);

  if (safeAfter < 0) {
    messages.push(
      `Если купишь это, безопасного остатка не хватит — не хватает ${Math.abs(safeAfter).toLocaleString('ru-RU')} ₽. Точно берём?`,
    );
  } else if (foodPerDay < 300) {
    messages.push(
      `Если купишь это, на еду до конца месяца останется ~${foodPerDay.toLocaleString('ru-RU')} ₽ в день. Точно берём?`,
    );
  } else if (amount > safeSpend.safeAmount * 0.5) {
    messages.push(
      `Это больше половины того, что можно потратить без риска (${safeSpend.safeAmount.toLocaleString('ru-RU')} ₽).`,
    );
  }

  const daysToSalary = daysUntilSalary(user);
  if (amount > dailyLimit(safeSpend.safeAmount, daysToSalary) * 3) {
    messages.push(`До зарплаты ${daysToSalary} дн. — такая трата может создать кассовый разрыв.`);
  }

  if (title.trim()) {
    messages.push(`«${title.trim()}» — импульс или реальная необходимость? Подожди 24 часа и реши ещё раз.`);
  }

  let verdict: ImpulseVerdict = 'ok';
  if (safeAfter < 0 || foodPerDay < 200) verdict = 'danger';
  else if (amount > safeSpend.safeAmount * 0.4 || safeAfter < safeSpend.safeAmount * 0.2) verdict = 'caution';

  if (messages.length === 0) {
    messages.push('Покупка укладывается в безопасный бюджет. Но всё равно спроси себя: это нужно прямо сейчас?');
  }

  return { verdict, messages, safeAfterPurchase: safeAfter };
}

function dailyLimit(safe: number, days: number): number {
  return Math.max(0, Math.floor(safe / Math.max(1, days)));
}

function hoursWord(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 'часов';
  if (b > 1 && b < 5) return 'часа';
  if (b === 1) return 'час';
  return 'часов';
}

function weeksWord(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 'недель';
  if (b > 1 && b < 5) return 'недели';
  if (b === 1) return 'неделю';
  return 'недель';
}
