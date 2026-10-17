/**
 * Card Converter Utility
 *
 * Converts between basic CompanyCard and EnhancedCompanyCard types
 */

import type { CompanyCard } from '@/types/financial';
import type { EnhancedCompanyCard } from '@/types/enhanced-financial';
import { FinancialLogicEngine } from './financial-logic-engine';

export function convertToEnhancedCard(card: CompanyCard): EnhancedCompanyCard {
  return FinancialLogicEngine.enhanceCard(card);
}

export function convertToEnhancedCards(cards: CompanyCard[]): EnhancedCompanyCard[] {
  return cards.map(convertToEnhancedCard);
}

export function convertToBasicCard(enhancedCard: EnhancedCompanyCard): CompanyCard {
  const { metadata, changeHistory, status, statusReason, statusLastUpdated, dataFreshnessHours, lastDataUpdate, utilizationPercentage, daysUntilDue, isOverLimit, lastPaymentAmount, lastPaymentDate, paymentsThisCycle, ...basicCard } = enhancedCard;

  // Map enhanced status to basic status
  const paymentStatus: 'paid' | 'unpaid' =
    status === 'paid' ? 'paid' : 'unpaid';

  return {
    ...basicCard,
    paymentStatus,
  };
}
