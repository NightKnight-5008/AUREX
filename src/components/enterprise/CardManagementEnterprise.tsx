import { useState, useMemo, useCallback } from 'react';
import type { CompanyCard } from '@/types/financial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_COUNTRY, formatCurrencyWithLocale, formatDateWithLocale } from '@/lib/country-config';
import {
  enhanceCardWithRisk,
  type CardWithRisk,
} from '@/lib/card-risk';
import {
  CreditCard,
  AlertCircle,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Percent,
  ChevronRight,
  Grid3x3,
  List,
} from 'lucide-react';

interface CardManagementEnterpriseProps {
  cards: CompanyCard[];
  countryCode?: string;
  locale?: string;
  currency?: string;
}

type ViewMode = 'executive' | 'operational' | 'employee' | 'exceptions';
type DisplayMode = 'grid' | 'list';
type GroupBy = 'none' | 'employee' | 'bank' | 'status' | 'risk';

export function CardManagementEnterprise({ cards, countryCode = DEFAULT_COUNTRY, locale, currency }: CardManagementEnterpriseProps) {
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('executive');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('risk');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [limitRange, setLimitRange] = useState<[number, number]>([0, 1000000]);

  // Enhanced cards with risk data
  const enhancedCards = useMemo(() => {
    return cards.map(card => enhanceCardWithRisk(card));
  }, [cards]);

  // Extract unique values for filters
  const uniqueBanks = useMemo(() =>
    Array.from(new Set(cards.map(c => c.issuingBank))).sort()
  , [cards]);

  const uniqueEmployees = useMemo(() =>
    Array.from(new Set(cards.map(c => c.cardholderName))).sort()
  , [cards]);

  // Calculate card count per bank
  const cardCountByBank = useMemo(() => {
    return cards.reduce((acc, card) => {
      acc[card.issuingBank] = (acc[card.issuingBank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [cards]);

  // Apply all filters
  const filteredCards = useMemo(() => {
    return enhancedCards.filter(card => {
      // Search filter
      if (searchQuery && !card.cardholderName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !card.lastFourDigits.includes(searchQuery) &&
          !card.issuingBank.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Bank filter
      if (selectedBank !== 'all' && card.issuingBank !== selectedBank) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'paid' && card.paymentStatus !== 'paid') return false;
        if (selectedStatus === 'unpaid' && card.paymentStatus !== 'unpaid') return false;
      }

      // Risk filter
      if (selectedRisk !== 'all' && card.risk.level !== selectedRisk) {
        return false;
      }

      // Employee filter
      if (selectedEmployee !== 'all' && card.cardholderName !== selectedEmployee) {
        return false;
      }

      // Limit range filter
      if (card.creditLimit < limitRange[0] || card.creditLimit > limitRange[1]) {
        return false;
      }

      return true;
    });
  }, [enhancedCards, searchQuery, selectedBank, selectedStatus, selectedRisk, selectedEmployee, limitRange]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = enhancedCards.length;
    const totalCreditLimit = enhancedCards.reduce((sum, c) => sum + c.creditLimit, 0);
    const totalOutstanding = enhancedCards.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);
    const totalAvailable = enhancedCards.reduce((sum, c) => sum + c.availableBalance, 0);
    const utilization = totalCreditLimit > 0 ? (totalOutstanding / totalCreditLimit) * 100 : 0;

    const criticalCount = enhancedCards.filter(c => c.risk.level === 'critical').length;
    const attentionCount = enhancedCards.filter(c => c.risk.level === 'attention').length;
    const unpaidCount = enhancedCards.filter(c => c.paymentStatus === 'unpaid').length;
    const overdueCount = enhancedCards.filter(c => c.dueDate && c.daysUntilDue !== null && c.daysUntilDue < 0).length;

    return {
      total,
      totalCreditLimit,
      totalOutstanding,
      totalAvailable,
      utilization,
      criticalCount,
      attentionCount,
      unpaidCount,
      overdueCount,
      uniqueEmployees: uniqueEmployees.length,
      uniqueBanks: uniqueBanks.length,
    };
  }, [enhancedCards, uniqueEmployees.length, uniqueBanks.length]);

  // Group cards by selected grouping
  const groupedCards = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Cards': filteredCards };
    }

    return filteredCards.reduce((acc, card) => {
      let key = '';
      switch (groupBy) {
        case 'employee':
          key = card.cardholderName;
          break;
        case 'bank':
          key = card.issuingBank;
          break;
        case 'status':
          key = card.paymentStatus === 'paid' ? 'Paid' : 'Unpaid';
          break;
        case 'risk':
          key = card.risk.level === 'critical' ? 'Critical Risk' :
                card.risk.level === 'attention' ? 'Needs Attention' : 'Healthy';
          break;
      }

      if (!acc[key]) acc[key] = [];
      acc[key].push(card);
      return acc;
    }, {} as Record<string, CardWithRisk[]>);
  }, [filteredCards, groupBy]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedBank('all');
    setSelectedStatus('all');
    setSelectedRisk('all');
    setSelectedEmployee('all');
    setLimitRange([0, 1000000]);
  }, []);

  return (
    <div className="space-y-4">
      {/* Executive Summary - Always Visible */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Card Portfolio Overview
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={displayMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={displayMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KPICard
              icon={CreditCard}
              label="Total Cards"
              value={kpis.total.toString()}
              color="text-blue-600"
            />
            <KPICard
              icon={DollarSign}
              label="Credit Limit"
              value={formatCurrencyWithLocale(kpis.totalCreditLimit, countryCode, locale, currency)}
              color="text-green-600"
              compact
            />
            <KPICard
              icon={TrendingUp}
              label="Outstanding"
              value={formatCurrencyWithLocale(kpis.totalOutstanding, countryCode, locale, currency)}
              color="text-orange-600"
              compact
            />
            <KPICard
              icon={Percent}
              label="Utilization"
              value={`${kpis.utilization.toFixed(1)}%`}
              color={kpis.utilization > 70 ? 'text-red-600' : 'text-green-600'}
            />
            <KPICard
              icon={AlertTriangle}
              label="Critical"
              value={kpis.criticalCount.toString()}
              color="text-red-600"
              alert={kpis.criticalCount > 0}
            />
            <KPICard
              icon={Clock}
              label="Unpaid"
              value={kpis.unpaidCount.toString()}
              color="text-yellow-600"
              alert={kpis.unpaidCount > 0}
            />
            <KPICard
              icon={Users}
              label="Employees"
              value={kpis.uniqueEmployees.toString()}
              color="text-purple-600"
            />
            <KPICard
              icon={Building2}
              label="Banks"
              value={kpis.uniqueBanks.toString()}
              color="text-indigo-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Persistent Filter Bar */}
      <Card className="border-2 sticky top-0 z-10 bg-background shadow-lg">
        <CardContent className="pt-4 pb-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Filters</span>
                <Badge variant="secondary" className="ml-2">
                  {filteredCards.length} of {enhancedCards.length} cards
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search cards, employees, banks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Bank Filter */}
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="All Banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks ({uniqueBanks.length})</SelectItem>
                  {uniqueBanks.map(bank => (
                    <SelectItem key={bank} value={bank}>
                      {bank} ({cardCountByBank[bank] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>

              {/* Risk Filter */}
              <Select value={selectedRisk} onValueChange={setSelectedRisk}>
                <SelectTrigger>
                  <SelectValue placeholder="All Risk Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="critical">Critical ({kpis.criticalCount})</SelectItem>
                  <SelectItem value="attention">Attention ({kpis.attentionCount})</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              {/* Employee Filter */}
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees ({uniqueEmployees.length})</SelectItem>
                  {uniqueEmployees.slice(0, 100).map(emp => (
                    <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                  ))}
                  {uniqueEmployees.length > 100 && (
                    <SelectItem value="more" disabled>
                      +{uniqueEmployees.length - 100} more... (use search)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Group By */}
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Group By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="risk">Risk Level</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="status">Payment Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="executive">Executive</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="employee">By Employee</TabsTrigger>
          <TabsTrigger value="exceptions">
            Exceptions
            {(kpis.criticalCount + kpis.overdueCount) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {kpis.criticalCount + kpis.overdueCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="mt-4">
          <ExecutiveView cards={filteredCards} kpis={kpis} countryCode={countryCode} locale={locale} currency={currency} />
        </TabsContent>

        <TabsContent value="operational" className="mt-4">
          <OperationalView
            cards={filteredCards}
            displayMode={displayMode}
            countryCode={countryCode}
            locale={locale}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="employee" className="mt-4">
          <EmployeeView
            cards={filteredCards}
            displayMode={displayMode}
            countryCode={countryCode}
            locale={locale}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="exceptions" className="mt-4">
          <ExceptionsView cards={filteredCards} countryCode={countryCode} locale={locale} currency={currency} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// KPI Card Component - Enterprise-grade styling with light/dark mode support
function KPICard({
  icon: Icon,
  label,
  value,
  color,
  alert,
  compact
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  alert?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border ${alert ? 'border-red-200 bg-red-50 dark:border-red-600/40 dark:bg-red-950/30' : 'border-gray-300 bg-gray-50 dark:border-gray-700/30 dark:bg-[#0B0B0B]'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`font-bold ${compact ? 'text-sm' : 'text-lg'} ${alert ? color : 'text-gray-900 dark:text-white'}`}>
        {value}
      </div>
    </div>
  );
}

// Executive View - High-level metrics only
function ExecutiveView({
  cards,
  kpis,
  countryCode,
  locale,
  currency
}: {
  cards: CardWithRisk[];
  kpis: any;
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  const riskDistribution = useMemo(() => {
    return {
      critical: cards.filter(c => c.risk.level === 'critical').length,
      attention: cards.filter(c => c.risk.level === 'attention').length,
      healthy: cards.filter(c => c.risk.level === 'healthy').length,
    };
  }, [cards]);

  const top10HighestDebt = useMemo(() =>
    [...cards]
      .filter(c => c.outstandingDebt && c.outstandingDebt > 0)
      .sort((a, b) => (b.outstandingDebt || 0) - (a.outstandingDebt || 0))
      .slice(0, 10)
  , [cards]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <RiskBar label="Critical" count={riskDistribution.critical} total={cards.length} color="bg-red-600" />
            <RiskBar label="Attention" count={riskDistribution.attention} total={cards.length} color="bg-orange-500" />
            <RiskBar label="Healthy" count={riskDistribution.healthy} total={cards.length} color="bg-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 Highest Outstanding Debt</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {top10HighestDebt.map(card => (
                <div key={card.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{card.cardholderName}</div>
                    <div className="text-xs text-muted-foreground">•••• {card.lastFourDigits}</div>
                  </div>
                  <div className="text-sm font-bold text-red-600">
                    {formatCurrencyWithLocale(card.outstandingDebt || 0, countryCode, locale, currency)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-semibold">{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

// Operational View - Grouped by bank, card type, and operational categories
function OperationalView({
  cards,
  displayMode,
  countryCode,
  locale,
  currency
}: {
  cards: CardWithRisk[];
  displayMode: DisplayMode;
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group by operational categories: Bank + Card Type
  const operationalGroups = useMemo(() => {
    const groups: Record<string, CardWithRisk[]> = {};

    cards.forEach(card => {
      const key = `${card.issuingBank} - ${card.cardType === 'credit' ? 'Credit' : 'Debit'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    });

    return groups;
  }, [cards]);

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="space-y-3">
      {Object.entries(operationalGroups).map(([groupName, groupCards]) => (
        <Card key={groupName} className="overflow-hidden">
          <button
            onClick={() => toggleGroup(groupName)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronRight className={`w-5 h-5 transition-transform ${expandedGroups.has(groupName) ? 'rotate-90' : ''}`} />
              <span className="font-semibold text-lg">{groupName}</span>
              <Badge variant="secondary">{groupCards.length} cards</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Total Debt: {formatCurrencyWithLocale(
                groupCards.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0),
                countryCode,
                locale,
                currency
              )}
            </div>
          </button>

          {expandedGroups.has(groupName) && (
            <div className="border-t p-4">
              {displayMode === 'list' ? (
                <CompactCardList cards={groupCards.slice(0, 50)} countryCode={countryCode} locale={locale} currency={currency} />
              ) : (
                <CompactCardGrid cards={groupCards.slice(0, 50)} countryCode={countryCode} locale={locale} currency={currency} />
              )}
              {groupCards.length > 50 && (
                <div className="text-center text-sm text-muted-foreground mt-3">
                  Showing 50 of {groupCards.length} cards. Use filters to narrow down.
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// Employee View - Employee-centric grouping
function EmployeeView({
  cards,
  displayMode,
  countryCode,
  locale,
  currency
}: {
  cards: CardWithRisk[];
  displayMode: DisplayMode;
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group by employee (cardholder name)
  const employeeGroups = useMemo(() => {
    const groups: Record<string, CardWithRisk[]> = {};

    cards.forEach(card => {
      const key = card.cardholderName;
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    });

    return groups;
  }, [cards]);

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="space-y-3">
      {Object.entries(employeeGroups).map(([employeeName, groupCards]) => {
        // Calculate employee-specific metrics
        const totalLimit = groupCards.reduce((sum, c) => sum + c.creditLimit, 0);
        const totalDebt = groupCards.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);
        const utilization = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;

        return (
          <Card key={employeeName} className="overflow-hidden">
            <button
              onClick={() => toggleGroup(employeeName)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChevronRight className={`w-5 h-5 transition-transform ${expandedGroups.has(employeeName) ? 'rotate-90' : ''}`} />
                <div className="text-left">
                  <div className="font-semibold text-lg">{employeeName}</div>
                  <div className="text-xs text-muted-foreground">
                    {groupCards.length} {groupCards.length === 1 ? 'card' : 'cards'} • {utilization.toFixed(1)}% utilization
                  </div>
                </div>
                <Badge variant="secondary">{groupCards.length}</Badge>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Limit</div>
                <div className="font-semibold">
                  {formatCurrencyWithLocale(totalLimit, countryCode, locale, currency)}
                </div>
              </div>
            </button>

            {expandedGroups.has(employeeName) && (
              <div className="border-t p-4">
                {displayMode === 'list' ? (
                  <CompactCardList cards={groupCards} countryCode={countryCode} locale={locale} currency={currency} />
                ) : (
                  <CompactCardGrid cards={groupCards} countryCode={countryCode} locale={locale} currency={currency} />
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// Exceptions View - Only problems
function ExceptionsView({
  cards,
  countryCode,
  locale,
  currency
}: {
  cards: CardWithRisk[];
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  const exceptions = useMemo(() => {
    return cards.filter(c =>
      c.risk.level === 'critical' ||
      c.risk.level === 'attention' ||
      (c.daysUntilDue !== null && c.daysUntilDue < 0) ||
      (c.outstandingDebt && c.creditLimit && (c.outstandingDebt / c.creditLimit) > 0.9)
    );
  }, [cards]);

  return (
    <div>
      {exceptions.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
          <p className="text-muted-foreground">No critical exceptions found in your card portfolio.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold">{exceptions.length} Exception(s) Require Attention</span>
          </div>
          <CompactCardList cards={exceptions} countryCode={countryCode} locale={locale} highlightIssues currency={currency} />
        </div>
      )}
    </div>
  );
}

// Compact Card List (Dense Rows)
function CompactCardList({
  cards,
  countryCode,
  locale,
  highlightIssues,
  currency
}: {
  cards: CardWithRisk[];
  countryCode: string;
  locale?: string;
  highlightIssues?: boolean;
  currency?: string;
}) {
  return (
    <div className="space-y-1">
      {cards.map(card => (
        <div
          key={card.id}
          className={`p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            highlightIssues && card.risk.level === 'critical' ? 'border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-700' : ''
          }`}
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Badge className={card.risk.badge.color}>
              {card.risk.badge.icon} {card.risk.badge.label}
            </Badge>
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-sm truncate ${highlightIssues && card.risk.level === 'critical' ? 'text-gray-900 dark:text-gray-100' : ''}`}>{card.cardholderName}</div>
              <div className="text-xs text-muted-foreground">{card.issuingBank} •••• {card.lastFourDigits}</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Outstanding</div>
              <div className="font-semibold text-red-600">
                {formatCurrencyWithLocale(card.outstandingDebt || 0, countryCode, locale, currency)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Available</div>
              <div className="font-semibold text-green-600">
                {formatCurrencyWithLocale(card.availableBalance, countryCode, locale, currency)}
              </div>
            </div>
            <div className="text-right min-w-[80px]">
              <div className="text-xs text-muted-foreground">Due</div>
              <div className={`font-semibold ${card.daysUntilDue !== null && card.daysUntilDue < 0 ? 'text-red-600' : ''}`}>
                {card.dueDate ? formatDateWithLocale(card.dueDate, countryCode, locale) : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Compact Card Grid
function CompactCardGrid({
  cards,
  countryCode,
  locale,
  currency
}: {
  cards: CardWithRisk[];
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map(card => (
        <div key={card.id} className="p-3 border-2 rounded-lg hover:border-primary transition-colors">
          <div className="flex items-start justify-between mb-2">
            <Badge className={`${card.risk.badge.color} text-xs px-2 py-0.5`}>
              {card.risk.badge.icon}
            </Badge>
            <div className="text-xs text-muted-foreground">•••• {card.lastFourDigits}</div>
          </div>
          <div className="font-medium text-sm mb-1 truncate">{card.cardholderName}</div>
          <div className="text-xs text-muted-foreground mb-2">{card.issuingBank}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Outstanding</div>
              <div className="font-semibold text-red-600">
                {formatCurrencyWithLocale(card.outstandingDebt || 0, countryCode, locale, currency)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Available</div>
              <div className="font-semibold text-green-600">
                {formatCurrencyWithLocale(card.availableBalance, countryCode, locale, currency)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
