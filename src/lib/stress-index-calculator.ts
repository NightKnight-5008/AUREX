/**
 * Financial Stress Index Calculator
 *
 * Calculates a composite stress score (0-100) based on:
 * - Utilization (0-40 points)
 * - Card statuses (0-25 points)
 * - Due date proximity (0-20 points)
 * - Number of active cards (0-10 points)
 * - Over-limit risk (0-5 points)
 */

import type { EnhancedCompanyCard, FinancialStressIndex, CardStatus } from '@/types/enhanced-financial';

export class StressIndexCalculator {
  /**
   * Calculate utilization impact (0-40 points)
   * - 0-30%: 0-10 points (low stress)
   * - 31-60%: 11-25 points (moderate stress)
   * - 61-90%: 26-35 points (high stress)
   * - 91-100%: 36-40 points (critical stress)
   */
  private static calculateUtilizationImpact(cards: EnhancedCompanyCard[]): number {
    if (cards.length === 0) return 0;

    const totalCreditLimit = cards.reduce((sum, card) => sum + card.creditLimit, 0);
    const totalOutstandingDebt = cards.reduce((sum, card) => sum + (card.outstandingDebt ?? 0), 0);

    if (totalCreditLimit === 0) return 0;

    const overallUtilization = (totalOutstandingDebt / totalCreditLimit) * 100;

    if (overallUtilization <= 30) {
      return (overallUtilization / 30) * 10; // 0-10 points
    } else if (overallUtilization <= 60) {
      return 10 + ((overallUtilization - 30) / 30) * 15; // 11-25 points
    } else if (overallUtilization <= 90) {
      return 25 + ((overallUtilization - 60) / 30) * 10; // 26-35 points
    } else {
      return 35 + ((overallUtilization - 90) / 10) * 5; // 36-40 points
    }
  }

  /**
   * Calculate status impact (0-25 points)
   * - paid: 0 points
   * - minimum_paid: 3 points
   * - partially_paid: 8 points
   * - unpaid: 12 points
   * - grace_period: 18 points
   * - overdue: 22 points
   * - over_limit: 25 points
   */
  private static calculateStatusImpact(cards: EnhancedCompanyCard[]): number {
    const statusScores: Record<CardStatus, number> = {
      paid: 0,
      minimum_paid: 3,
      partially_paid: 8,
      unpaid: 12,
      grace_period: 18,
      overdue: 22,
      over_limit: 25,
    };

    const totalScore = cards.reduce((sum, card) => {
      return sum + statusScores[card.status];
    }, 0);

    // Average across all cards, capped at 25
    return Math.min(25, totalScore / Math.max(1, cards.length));
  }

  /**
   * Calculate due date proximity impact (0-20 points)
   * - More than 7 days: 0 points
   * - 4-7 days: 5 points
   * - 2-3 days: 10 points
   * - 0-1 days: 15 points
   * - Overdue: 20 points
   */
  private static calculateDueDateImpact(cards: EnhancedCompanyCard[]): number {
    const unpaidCards = cards.filter((card) => card.status !== 'paid' && card.daysUntilDue !== null);

    if (unpaidCards.length === 0) return 0;

    const totalScore = unpaidCards.reduce((sum, card) => {
      const days = card.daysUntilDue!;

      if (days < 0) {
        return sum + 20; // Overdue
      } else if (days <= 1) {
        return sum + 15; // Urgent
      } else if (days <= 3) {
        return sum + 10; // Soon
      } else if (days <= 7) {
        return sum + 5; // Approaching
      } else {
        return sum + 0; // Comfortable
      }
    }, 0);

    // Average across unpaid cards, capped at 20
    return Math.min(20, totalScore / unpaidCards.length);
  }

  /**
   * Calculate active cards impact (0-10 points)
   * - 1-2 cards: 0-2 points
   * - 3-4 cards: 3-5 points
   * - 5-6 cards: 6-8 points
   * - 7+ cards: 9-10 points
   */
  private static calculateActiveCardsImpact(cards: EnhancedCompanyCard[]): number {
    const activeCards = cards.filter((card) => card.cardType === 'credit' && card.status !== 'paid');
    const count = activeCards.length;

    if (count <= 2) {
      return count; // 0-2 points
    } else if (count <= 4) {
      return 2 + (count - 2); // 3-4 points
    } else if (count <= 6) {
      return 4 + (count - 4) * 1.5; // 5-7 points
    } else {
      return 7 + Math.min(3, (count - 6) * 0.5); // 8-10 points
    }
  }

  /**
   * Calculate over-limit impact (0-5 points)
   */
  private static calculateOverLimitImpact(cards: EnhancedCompanyCard[]): number {
    const overLimitCards = cards.filter((card) => card.isOverLimit);
    return Math.min(5, overLimitCards.length * 2.5);
  }

  /**
   * Calculate comprehensive financial stress index
   */
  static calculateStressIndex(cards: EnhancedCompanyCard[]): FinancialStressIndex {
    const utilizationImpact = this.calculateUtilizationImpact(cards);
    const statusImpact = this.calculateStatusImpact(cards);
    const dueDateProximityImpact = this.calculateDueDateImpact(cards);
    const activeCardsImpact = this.calculateActiveCardsImpact(cards);
    const overLimitImpact = this.calculateOverLimitImpact(cards);

    const score = Math.min(
      100,
      utilizationImpact + statusImpact + dueDateProximityImpact + activeCardsImpact + overLimitImpact
    );

    let level: 'safe' | 'watchlist' | 'high_risk';
    if (score < 30) {
      level = 'safe';
    } else if (score < 60) {
      level = 'watchlist';
    } else {
      level = 'high_risk';
    }

    const breakdown = this.generateBreakdown(cards, {
      utilizationImpact,
      statusImpact,
      dueDateProximityImpact,
      activeCardsImpact,
      overLimitImpact,
    });

    return {
      score,
      level,
      timestamp: new Date(),
      contributingFactors: {
        utilizationImpact,
        statusImpact,
        dueDateProximityImpact,
        activeCardsImpact,
        overLimitImpact,
      },
      breakdown,
    };
  }

  /**
   * Generate plain-language breakdown of stress factors
   */
  private static generateBreakdown(
    cards: EnhancedCompanyCard[],
    impacts: {
      utilizationImpact: number;
      statusImpact: number;
      dueDateProximityImpact: number;
      activeCardsImpact: number;
      overLimitImpact: number;
    }
  ): string[] {
    const breakdown: string[] = [];

    // Utilization
    const totalCreditLimit = cards.reduce((sum, card) => sum + card.creditLimit, 0);
    const totalDebt = cards.reduce((sum, card) => sum + (card.outstandingDebt ?? 0), 0);
    const utilization = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit) * 100 : 0;

    if (impacts.utilizationImpact > 25) {
      breakdown.push(
        `High credit utilization at ${utilization.toFixed(1)}% (${impacts.utilizationImpact.toFixed(0)} stress points)`
      );
    } else if (impacts.utilizationImpact > 10) {
      breakdown.push(
        `Moderate credit utilization at ${utilization.toFixed(1)}% (${impacts.utilizationImpact.toFixed(0)} stress points)`
      );
    }

    // Card statuses
    const overdueCards = cards.filter((c) => c.status === 'overdue' || c.status === 'over_limit');
    const unpaidCards = cards.filter((c) => c.status === 'unpaid' || c.status === 'grace_period');

    if (overdueCards.length > 0) {
      breakdown.push(
        `${overdueCards.length} card${overdueCards.length > 1 ? 's' : ''} overdue or over-limit (${impacts.statusImpact.toFixed(0)} stress points)`
      );
    } else if (unpaidCards.length > 0) {
      breakdown.push(
        `${unpaidCards.length} card${unpaidCards.length > 1 ? 's' : ''} with unpaid balances (${impacts.statusImpact.toFixed(0)} stress points)`
      );
    }

    // Due dates
    const urgentCards = cards.filter((c) => c.daysUntilDue !== null && c.daysUntilDue <= 3 && c.daysUntilDue >= 0);
    if (urgentCards.length > 0) {
      breakdown.push(
        `${urgentCards.length} payment${urgentCards.length > 1 ? 's' : ''} due within 3 days (${impacts.dueDateProximityImpact.toFixed(0)} stress points)`
      );
    }

    // Active cards
    const activeCount = cards.filter((c) => c.cardType === 'credit' && c.status !== 'paid').length;
    if (activeCount >= 5) {
      breakdown.push(
        `Managing ${activeCount} active cards with balances (${impacts.activeCardsImpact.toFixed(0)} stress points)`
      );
    }

    // Over-limit
    const overLimitCards = cards.filter((c) => c.isOverLimit);
    if (overLimitCards.length > 0) {
      breakdown.push(
        `${overLimitCards.length} card${overLimitCards.length > 1 ? 's' : ''} over credit limit (${impacts.overLimitImpact.toFixed(0)} stress points)`
      );
    }

    if (breakdown.length === 0) {
      breakdown.push('All cards in good standing. Low financial stress.');
    }

    return breakdown;
  }
}
