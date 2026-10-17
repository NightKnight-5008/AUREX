import type { CompanyCard } from '@/types/financial';
import { getDaysUntilDue } from './financial-data';

export type RiskLevel = 'critical' | 'attention' | 'healthy';

export interface CardRisk {
  level: RiskLevel;
  score: number; // 0-100
  factors: string[];
  badge: {
    icon: string;
    label: string;
    color: string;
  };
}

export interface CardWithRisk extends CompanyCard {
  risk: CardRisk;
  utilizationPercent: number;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  lastSmsUpdate?: Date;
  smsIndicators?: string[];
}

/**
 * Calculate card risk level based on multiple factors
 * All logic is client-side for display only - backend remains source of truth for state
 */
export function calculateCardRisk(card: CompanyCard): CardRisk {
  let score = 0;
  const factors: string[] = [];

  // Calculate days until/overdue
  const daysUntilDue = card.dueDate ? getDaysUntilDue(card.dueDate) : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const daysOverdue = isOverdue ? Math.abs(daysUntilDue) : 0;

  // Calculate utilization for credit cards
  const utilizationPercent = card.cardType === 'credit' && card.creditLimit > 0
    ? ((card.creditLimit - card.availableBalance) / card.creditLimit) * 100
    : 0;

  // Factor 1: Overdue status (40 points max)
  if (isOverdue) {
    if (daysOverdue > 30) {
      score += 40;
      factors.push(`Overdue ${daysOverdue} days`);
    } else if (daysOverdue > 7) {
      score += 30;
      factors.push(`Overdue ${daysOverdue} days`);
    } else {
      score += 20;
      factors.push(`Overdue ${daysOverdue} days`);
    }
  }

  // Factor 2: Due soon (20 points max)
  if (!isOverdue && daysUntilDue !== null && daysUntilDue <= 3) {
    score += 15;
    factors.push(`Due in ${daysUntilDue} days`);
  }

  // Factor 3: High credit utilization (30 points max)
  if (card.cardType === 'credit') {
    if (utilizationPercent > 90) {
      score += 30;
      factors.push(`${utilizationPercent.toFixed(0)}% utilized`);
    } else if (utilizationPercent > 75) {
      score += 20;
      factors.push(`${utilizationPercent.toFixed(0)}% utilized`);
    } else if (utilizationPercent > 50) {
      score += 10;
      factors.push(`${utilizationPercent.toFixed(0)}% utilized`);
    }
  }

  // Factor 4: Outstanding debt vs available balance (10 points max)
  if (card.cardType === 'credit' && card.outstandingDebt) {
    if (card.availableBalance < card.minimumPayment) {
      score += 10;
      factors.push('Insufficient balance for min payment');
    }
  }

  // Determine risk level based on score
  let level: RiskLevel;
  let badge: CardRisk['badge'];

  if (score >= 40) {
    level = 'critical';
    badge = {
      icon: '🔴',
      label: 'Critical',
      color: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
    };
  } else if (score >= 15) {
    level = 'attention';
    badge = {
      icon: '🟠',
      label: 'Attention',
      color: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    };
  } else {
    level = 'healthy';
    badge = {
      icon: '🟢',
      label: 'Healthy',
      color: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
    };
  }

  return {
    level,
    score,
    factors: factors.length > 0 ? factors : ['No issues detected'],
    badge,
  };
}

/**
 * Enhance card with risk data and computed metrics
 */
export function enhanceCardWithRisk(card: CompanyCard): CardWithRisk {
  const risk = calculateCardRisk(card);
  const daysUntilDue = card.dueDate ? getDaysUntilDue(card.dueDate) : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

  const utilizationPercent = card.cardType === 'credit' && card.creditLimit > 0
    ? ((card.creditLimit - card.availableBalance) / card.creditLimit) * 100
    : 0;

  return {
    ...card,
    risk,
    utilizationPercent,
    daysUntilDue: isOverdue ? null : daysUntilDue,
    daysOverdue: isOverdue ? Math.abs(daysUntilDue) : null,
  };
}

/**
 * Sort cards by various criteria
 */
export type CardSortOption =
  | 'risk-desc'
  | 'debt-desc'
  | 'due-date-asc'
  | 'utilization-desc'
  | 'overdue-first'
  | 'recent-update';

export function sortCards(cards: CardWithRisk[], sortBy: CardSortOption): CardWithRisk[] {
  const sorted = [...cards];

  switch (sortBy) {
    case 'risk-desc':
      return sorted.sort((a, b) => b.risk.score - a.risk.score);

    case 'debt-desc':
      return sorted.sort((a, b) => {
        const debtA = a.outstandingDebt || 0;
        const debtB = b.outstandingDebt || 0;
        return debtB - debtA;
      });

    case 'due-date-asc':
      return sorted.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    case 'utilization-desc':
      return sorted.sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    case 'overdue-first':
      return sorted.sort((a, b) => {
        if (a.daysOverdue && !b.daysOverdue) return -1;
        if (!a.daysOverdue && b.daysOverdue) return 1;
        if (a.daysOverdue && b.daysOverdue) return b.daysOverdue - a.daysOverdue;
        return b.risk.score - a.risk.score;
      });

    case 'recent-update':
      return sorted.sort((a, b) => {
        if (!a.lastSmsUpdate) return 1;
        if (!b.lastSmsUpdate) return -1;
        return b.lastSmsUpdate.getTime() - a.lastSmsUpdate.getTime();
      });

    default:
      return sorted;
  }
}

/**
 * Filter cards by various criteria
 */
export type CardFilterOption = 'all' | 'unpaid' | 'overdue' | 'credit-only' | 'debit-only' | 'recent-sms';

export function filterCards(cards: CardWithRisk[], filter: CardFilterOption): CardWithRisk[] {
  switch (filter) {
    case 'unpaid':
      return cards.filter(c => c.paymentStatus === 'unpaid');

    case 'overdue':
      return cards.filter(c => c.daysOverdue !== null && c.daysOverdue > 0);

    case 'credit-only':
      return cards.filter(c => c.cardType === 'credit');

    case 'debit-only':
      return cards.filter(c => c.cardType === 'debit');

    case 'recent-sms':
      return cards.filter(c => c.lastSmsUpdate);

    case 'all':
    default:
      return cards;
  }
}
