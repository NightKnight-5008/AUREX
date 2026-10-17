import { useState, useMemo } from 'react';
import type { CompanyCard } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCountUp } from '@/hooks/use-count-up';
import { useInView } from '@/hooks/use-in-view';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFAULT_COUNTRY, getCountryConfig, formatCurrencyWithLocale, formatDateWithLocale } from '@/lib/country-config';
import {
  enhanceCardWithRisk,
  sortCards,
  filterCards,
  type CardSortOption,
  type CardFilterOption,
  type CardWithRisk,
} from '@/lib/card-risk';
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Plus,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Bell,
  Eye,
  FileText,
  AlertTriangle,
  Calendar,
  Clock,
  Send,
  X,
} from 'lucide-react';

interface CardManagementProps {
  cards: CompanyCard[];
  countryCode?: string;
  onAddCard?: (card: CompanyCard) => void;
  locale?: string;
}

export function CardManagement({ cards, countryCode = DEFAULT_COUNTRY, onAddCard, locale }: CardManagementProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<CardSortOption>('risk-desc');
  const [filterBy, setFilterBy] = useState<CardFilterOption>('all');
  const [expandedCardholders, setExpandedCardholders] = useState<Set<string>>(new Set());

  const [newCard, setNewCard] = useState({
    lastFourDigits: '',
    cardholderName: '',
    linkedBankAccount: '',
    creditLimit: '',
    availableBalance: '',
    cardType: 'credit' as 'credit' | 'debit',
    issuingBank: '',
  });
  const [cardholderSuggestions, setCardholderSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const config = getCountryConfig(countryCode);

  // Enhance all cards with risk data
  const enhancedCards = useMemo(() => {
    return cards.map(card => enhanceCardWithRisk(card));
  }, [cards]);

  // Apply filters and sorting
  const filteredAndSortedCards = useMemo(() => {
    const filtered = filterCards(enhancedCards, filterBy);
    return sortCards(filtered, sortBy);
  }, [enhancedCards, filterBy, sortBy]);

  // Group cards by cardholder
  const groupedCards = useMemo(() => {
    return filteredAndSortedCards.reduce((acc, card) => {
      const name = card.cardholderName;
      if (!acc[name]) {
        acc[name] = [];
      }
      acc[name].push(card);
      return acc;
    }, {} as Record<string, CardWithRisk[]>);
  }, [filteredAndSortedCards]);

  // Auto-expand cardholders with critical/attention cards
  useMemo(() => {
    const autoExpand = new Set<string>();
    Object.entries(groupedCards).forEach(([name, cards]) => {
      const hasProblems = cards.some(c => c.risk.level === 'critical' || c.risk.level === 'attention');
      if (hasProblems) {
        autoExpand.add(name);
      }
    });
    setExpandedCardholders(autoExpand);
  }, [groupedCards]);

  // Calculate KPIs with trends
  const kpis = useMemo(() => {
    const totalCreditLimit = cards
      .filter(c => c.cardType === 'credit')
      .reduce((sum, c) => sum + c.creditLimit, 0);

    const totalAvailable = cards.reduce((sum, c) => sum + c.availableBalance, 0);

    const totalOutstandingDebt = cards
      .filter((c) => c.cardType === 'credit')
      .reduce((sum, c) => {
        const debt = c.outstandingDebt !== undefined ? c.outstandingDebt : (c.creditLimit - c.availableBalance);
        return sum + debt;
      }, 0);

    const totalMinPaymentDue = cards
      .filter((c) => c.paymentStatus === 'unpaid')
      .reduce((sum, c) => sum + c.minimumPayment, 0);

    const overdueCards = enhancedCards.filter(c => c.daysOverdue !== null && c.daysOverdue > 0).length;
    const criticalCards = enhancedCards.filter(c => c.risk.level === 'critical').length;

    return {
      totalCreditLimit,
      totalAvailable,
      totalOutstandingDebt,
      totalMinPaymentDue,
      overdueCards,
      criticalCards,
      hasWarnings: overdueCards > 0 || criticalCards > 0,
    };
  }, [cards, enhancedCards]);

  // Get unique cardholder names
  const getCardholderSuggestions = (input: string): string[] => {
    if (input.length < 2) return [];
    const uniqueCardholders = Array.from(new Set(cards.map(card => card.cardholderName)));
    return uniqueCardholders.filter(name =>
      name.toLowerCase().startsWith(input.toLowerCase())
    );
  };

  const handleCardholderNameChange = (value: string) => {
    setNewCard({ ...newCard, cardholderName: value });
    if (value.length >= 2) {
      const suggestions = getCardholderSuggestions(value);
      setCardholderSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNewCard({ ...newCard, cardholderName: suggestion });
    setShowSuggestions(false);
  };

  const handleAddCard = () => {
    if (!newCard.lastFourDigits || !newCard.cardholderName || !newCard.issuingBank) {
      return;
    }

    const creditLimit = newCard.cardType === 'credit' ? Number(newCard.creditLimit) || 0 : 0;
    const availableBalance = Number(newCard.availableBalance) || 0;
    const outstandingDebt = newCard.cardType === 'credit' ? creditLimit - availableBalance : 0;

    const card: CompanyCard = {
      id: `card-${Date.now()}`,
      lastFourDigits: newCard.lastFourDigits,
      cardholderName: newCard.cardholderName,
      linkedBankAccount: newCard.linkedBankAccount || `${newCard.issuingBank} - XXXX`,
      creditLimit,
      availableBalance,
      cardType: newCard.cardType,
      issuingBank: newCard.issuingBank,
      paymentStatus: 'paid',
      minimumPayment: 0,
      dueDate: null,
      outstandingDebt,
    };

    onAddCard?.(card);
    setIsAddDialogOpen(false);
    setNewCard({
      lastFourDigits: '',
      cardholderName: '',
      linkedBankAccount: '',
      creditLimit: '',
      availableBalance: '',
      cardType: 'credit',
      issuingBank: '',
    });
  };

  const toggleCardholder = (name: string) => {
    setExpandedCardholders(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const SummaryCard = ({ title, value, delay, isRed, trend, hasWarning }: {
    title: string;
    value: number;
    delay: number;
    isRed?: boolean;
    trend?: 'up' | 'down';
    hasWarning?: boolean;
  }) => {
    const { ref, isInView } = useInView({ triggerOnce: true });
    const animatedValue = useCountUp({
      end: isInView ? value : 0,
      duration: 1500,
      decimals: 0,
      delay,
    });

    return (
      <Card ref={ref} className="animate-on-mount animate-slideInUp relative" style={{ animationDelay: `${delay}ms` }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription>{title}</CardDescription>
            <div className="flex items-center gap-1">
              {hasWarning && <AlertTriangle className="w-4 h-4 text-red-600" />}
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
            </div>
          </div>
          <CardTitle className={`text-2xl ${isRed ? 'text-red-600 dark:text-red-400' : ''}`}>
            {formatCurrencyWithLocale(animatedValue, countryCode, locale)}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Company Cards
          </h1>
          <p className="text-muted-foreground mt-1">
            Financial Control Center • Real-time Risk Monitoring • Decision Support
          </p>
        </div>
        <Badge variant="outline" className="px-4 py-2 text-base">
          {cards.length} {cards.length === 1 ? 'Card' : 'Cards'}
        </Badge>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Credit Limit"
          value={kpis.totalCreditLimit}
          delay={0}
        />
        <SummaryCard
          title="Total Available Balance"
          value={kpis.totalAvailable}
          delay={100}
        />
        <SummaryCard
          title="Total Outstanding Debt"
          value={kpis.totalOutstandingDebt}
          delay={150}
          isRed
          trend="up"
          hasWarning={kpis.totalOutstandingDebt > kpis.totalCreditLimit * 0.7}
        />
        <SummaryCard
          title="Minimum Payment Due"
          value={kpis.totalMinPaymentDue}
          delay={200}
          isRed
          hasWarning={kpis.overdueCards > 0}
        />
      </div>

      {/* Warning Banner */}
      {kpis.hasWarnings && (
        <Card className="border-2 border-red-300 dark:border-red-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 shadow-lg">
          <CardContent className="py-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-red-800 dark:text-red-200 mb-1.5">Attention Required</h3>
                <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                  {kpis.criticalCards > 0 && `${kpis.criticalCards} card${kpis.criticalCards > 1 ? 's' : ''} in critical status. `}
                  {kpis.overdueCards > 0 && `${kpis.overdueCards} overdue payment${kpis.overdueCards > 1 ? 's' : ''}.`}
                  {' '}Take immediate action to avoid penalties and interest charges.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls: Sort & Filter */}
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold mb-1">Card Controls</CardTitle>
              <CardDescription>Sort, filter, and manage your company cards</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sort By</Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as CardSortOption)}>
                  <SelectTrigger className="w-full md:w-[220px] border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risk-desc">Priority (Risk)</SelectItem>
                    <SelectItem value="debt-desc">Highest Debt</SelectItem>
                    <SelectItem value="due-date-asc">Due Date (Soonest)</SelectItem>
                    <SelectItem value="utilization-desc">Utilization %</SelectItem>
                    <SelectItem value="overdue-first">Overdue First</SelectItem>
                    <SelectItem value="recent-update">Recent SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter</Label>
                <Select value={filterBy} onValueChange={(v) => setFilterBy(v as CardFilterOption)}>
                  <SelectTrigger className="w-full md:w-[200px] border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cards</SelectItem>
                    <SelectItem value="unpaid">Unpaid Only</SelectItem>
                    <SelectItem value="overdue">Overdue Only</SelectItem>
                    <SelectItem value="credit-only">Credit Cards</SelectItem>
                    <SelectItem value="debit-only">Debit Cards</SelectItem>
                    <SelectItem value="recent-sms">Recent SMS Updates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Card
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Add New Company Card</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new company card to add it to your dashboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cardType" className="text-right">
                      Card Type
                    </Label>
                    <Select
                      value={newCard.cardType}
                      onValueChange={(value) => setNewCard({ ...newCard, cardType: value as 'credit' | 'debit' })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="debit">Debit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="lastFourDigits" className="text-right">
                      Last 4 Digits
                    </Label>
                    <Input
                      id="lastFourDigits"
                      value={newCard.lastFourDigits}
                      onChange={(e) => setNewCard({ ...newCard, lastFourDigits: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="col-span-3"
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 relative">
                    <Label htmlFor="cardholderName" className="text-right">
                      Cardholder
                    </Label>
                    <div className="col-span-3 relative">
                      <Input
                        id="cardholderName"
                        value={newCard.cardholderName}
                        onChange={(e) => handleCardholderNameChange(e.target.value)}
                        placeholder="John Doe"
                      />
                      {showSuggestions && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-10 max-h-40 overflow-auto">
                          {cardholderSuggestions.map((suggestion) => (
                            <div
                              key={suggestion}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="issuingBank" className="text-right">
                      Bank
                    </Label>
                    <Select
                      value={newCard.issuingBank}
                      onValueChange={(value) => setNewCard({ ...newCard, issuingBank: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {config.commonBanks.map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newCard.cardType === 'credit' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="creditLimit" className="text-right">
                        Credit Limit
                      </Label>
                      <Input
                        id="creditLimit"
                        type="number"
                        value={newCard.creditLimit}
                        onChange={(e) => setNewCard({ ...newCard, creditLimit: e.target.value })}
                        className="col-span-3"
                        placeholder="10000"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="availableBalance" className="text-right">
                      Available Balance
                    </Label>
                    <Input
                      id="availableBalance"
                      type="number"
                      value={newCard.availableBalance}
                      onChange={(e) => setNewCard({ ...newCard, availableBalance: e.target.value })}
                      className="col-span-3"
                      placeholder="8000"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddCard}>Add Card</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Cards by Cardholder */}
      <div className="space-y-5">
        {Object.entries(groupedCards).map(([cardholderName, cardholderCards]) => {
          const isExpanded = expandedCardholders.has(cardholderName);
          const criticalCount = cardholderCards.filter(c => c.risk.level === 'critical').length;
          const attentionCount = cardholderCards.filter(c => c.risk.level === 'attention').length;
          const healthyCount = cardholderCards.filter(c => c.risk.level === 'healthy').length;

          return (
            <Card key={cardholderName} className="overflow-hidden shadow-md border-2 hover:border-primary/30 transition-all">
              <div
                className="p-5 cursor-pointer hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent transition-all flex items-center justify-between group"
                onClick={() => toggleCardholder(cardholderName)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-foreground">{cardholderName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">
                        {cardholderCards.length} card{cardholderCards.length > 1 ? 's' : ''}
                      </p>
                      {healthyCount > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-300">
                          {healthyCount} Healthy
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {criticalCount > 0 && (
                    <Badge className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-2 border-red-400 px-3 py-1.5 font-semibold">
                      🔴 {criticalCount} Critical
                    </Badge>
                  )}
                  {attentionCount > 0 && (
                    <Badge className="bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-2 border-orange-400 px-3 py-1.5 font-semibold">
                      🟠 {attentionCount} Attention
                    </Badge>
                  )}
                </div>
              </div>

              {isExpanded && (
                <CardContent className="pt-0 pb-5 px-5 space-y-4 bg-muted/20">
                  {cardholderCards.map((card) => (
                    <CardRow key={card.id} card={card} countryCode={countryCode} locale={locale} />
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Individual Card Row Component
function CardRow({ card, countryCode, locale }: { card: CardWithRisk; countryCode: string; locale?: string }) {
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  // SMS history (populated from backend in production)
  const smsHistory: Array<{ id: string; date: Date; type: 'payment_received' | 'due_reminder' | 'limit_update'; message: string }> = [];

  const handleSetReminder = () => {
    // In production, this would save to backend
    console.log('Setting reminder:', {
      cardId: card.id,
      date: reminderDate,
      time: reminderTime,
      note: reminderNote,
    });
    // Show success message
    alert(`Reminder set for ${reminderDate} at ${reminderTime}`);
    setReminderDialogOpen(false);
    setReminderDate('');
    setReminderTime('');
    setReminderNote('');
  };

  const getSmsTypeIcon = (type: 'payment_received' | 'due_reminder' | 'limit_update') => {
    switch (type) {
      case 'payment_received':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'due_reminder':
        return <Bell className="w-4 h-4 text-orange-600" />;
      case 'limit_update':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSmsTypeBadge = (type: 'payment_received' | 'due_reminder' | 'limit_update') => {
    switch (type) {
      case 'payment_received':
        return <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300">Payment</Badge>;
      case 'due_reminder':
        return <Badge className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300">Reminder</Badge>;
      case 'limit_update':
        return <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300">Update</Badge>;
    }
  };

  return (
    <>
      <div className="p-5 border-2 rounded-xl hover:border-primary/60 transition-all duration-200 space-y-4 bg-gradient-to-br from-background via-background to-muted/30 shadow-sm hover:shadow-lg">
        {/* Row 1: Risk Badge + Card Identity */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Badge className={`${card.risk.badge.color} border-2 font-bold px-4 py-2 text-sm shadow-sm`}>
              <span className="mr-2 text-base">{card.risk.badge.icon}</span>
              {card.risk.badge.label}
            </Badge>
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <CreditCard className="w-4 h-4 text-primary" />
                </div>
                <span className="font-bold text-base">{card.issuingBank}</span>
                <span className="text-muted-foreground font-mono">•••• {card.lastFourDigits}</span>
              </div>
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                {card.cardType} Card
              </Badge>
            </div>
          </div>
        </div>

      {/* Row 2: Status & Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
          <div className="flex flex-col gap-1.5">
            {card.paymentStatus === 'paid' ? (
              <Badge className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-2 border-green-300 w-fit font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Paid
              </Badge>
            ) : (
              <Badge className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-2 border-red-300 w-fit font-semibold">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                Unpaid
              </Badge>
            )}
            {card.daysOverdue !== null && card.daysOverdue > 0 && (
              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                Overdue {card.daysOverdue} days
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outstanding Debt</p>
          <p className="font-bold text-lg text-red-600 dark:text-red-400">
            {formatCurrencyWithLocale(card.outstandingDebt || 0, countryCode, locale)}
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Min Payment</p>
          <p className="font-bold text-base">
            {formatCurrencyWithLocale(card.minimumPayment, countryCode, locale)}
          </p>
          {card.dueDate && (
            <p className="text-xs text-muted-foreground font-medium">
              📅 Due: {formatDateWithLocale(card.dueDate, countryCode, locale)}
            </p>
          )}
        </div>

        {card.cardType === 'credit' && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Utilization</p>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                <div
                  className={`h-full transition-all duration-300 ${
                    card.utilizationPercent > 90 ? 'bg-red-500' :
                    card.utilizationPercent > 75 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(card.utilizationPercent, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold min-w-[45px]">{card.utilizationPercent.toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Risk Factors & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t-2 border-muted">
        <div className="flex flex-wrap items-center gap-2">
          {card.risk.factors.map((factor, i) => (
            <Badge key={i} variant="outline" className="text-xs font-medium bg-muted/50">
              <AlertCircle className="w-3 h-3 mr-1.5" />
              {factor}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSmsDialogOpen(true)}
            className="h-9 px-3 hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
            title="View SMS History"
          >
            <MessageSquare className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">SMS</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReminderDialogOpen(true)}
            className="h-9 px-3 hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500 transition-all"
            title="Set Payment Reminder"
          >
            <Bell className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Remind</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDetailsDialogOpen(true)}
            className="h-9 px-3 hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500 transition-all"
            title="View Details"
          >
            <Eye className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Details</span>
          </Button>
        </div>
      </div>
    </div>

    {/* SMS History Dialog */}
    <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            SMS History - {card.issuingBank} •••• {card.lastFourDigits}
          </DialogTitle>
          <DialogDescription>
            View all SMS notifications related to this card
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-3">
            {smsHistory.map((sms) => (
              <div key={sms.id} className="p-4 border-2 rounded-lg bg-gradient-to-br from-background to-muted/30 hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSmsTypeIcon(sms.type)}
                    {getSmsTypeBadge(sms.type)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {sms.date.toLocaleDateString()} {sms.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{sms.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSmsDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Set Reminder Dialog */}
    <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            Set Payment Reminder
          </DialogTitle>
          <DialogDescription>
            Schedule a reminder for {card.issuingBank} card payment
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <Input
              id="reminder-date"
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminder-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time
            </Label>
            <Input
              id="reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminder-note">Note (Optional)</Label>
            <Textarea
              id="reminder-note"
              placeholder="Add a note for this reminder..."
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              rows={3}
            />
          </div>
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm font-semibold mb-1">Payment Details</p>
            <p className="text-sm text-muted-foreground">
              Minimum Payment: {formatCurrencyWithLocale(card.minimumPayment, countryCode, locale)}
            </p>
            {card.dueDate && (
              <p className="text-sm text-muted-foreground">
                Due Date: {formatDateWithLocale(card.dueDate, countryCode, locale)}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSetReminder}
            disabled={!reminderDate || !reminderTime}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Set Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Card Details Dialog */}
    <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Card Details - {card.issuingBank} •••• {card.lastFourDigits}
          </DialogTitle>
          <DialogDescription>
            Complete information and financial metrics
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-6 pr-4">
            {/* Risk Assessment */}
            <div className="p-4 border-2 rounded-lg bg-gradient-to-br from-background to-muted/30">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Assessment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
                  <Badge className={`${card.risk.badge.color} border-2 font-bold`}>
                    <span className="mr-1.5">{card.risk.badge.icon}</span>
                    {card.risk.badge.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Risk Score</p>
                  <p className="font-bold text-lg">{card.risk.score}/100</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-2">Risk Factors</p>
                <div className="flex flex-wrap gap-2">
                  {card.risk.factors.map((factor, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border-2 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Card Type</p>
                <p className="font-bold capitalize">{card.cardType} Card</p>
              </div>
              <div className="p-4 border-2 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Issuing Bank</p>
                <p className="font-bold">{card.issuingBank}</p>
              </div>
              <div className="p-4 border-2 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Cardholder</p>
                <p className="font-bold">{card.cardholderName}</p>
              </div>
              <div className="p-4 border-2 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Linked Account</p>
                <p className="font-bold text-sm">{card.linkedBankAccount}</p>
              </div>
            </div>

            {/* Credit Details */}
            {card.cardType === 'credit' && (
              <div className="p-4 border-2 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5">
                <h3 className="font-bold text-lg mb-3">Credit Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Credit Limit</p>
                    <p className="font-bold text-lg">{formatCurrencyWithLocale(card.creditLimit, countryCode, locale)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                    <p className="font-bold text-lg text-green-600">{formatCurrencyWithLocale(card.availableBalance, countryCode, locale)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Outstanding Debt</p>
                    <p className="font-bold text-lg text-red-600">{formatCurrencyWithLocale(card.outstandingDebt || 0, countryCode, locale)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Utilization</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden border">
                        <div
                          className={`h-full transition-all ${
                            card.utilizationPercent > 90 ? 'bg-red-500' :
                            card.utilizationPercent > 75 ? 'bg-orange-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(card.utilizationPercent, 100)}%` }}
                        />
                      </div>
                      <span className="font-bold text-sm">{card.utilizationPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Information */}
            <div className="p-4 border-2 rounded-lg">
              <h3 className="font-bold text-lg mb-3">Payment Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                  {card.paymentStatus === 'paid' ? (
                    <Badge className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-2 border-green-300">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Paid
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-2 border-red-300">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                      Unpaid
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Minimum Payment</p>
                  <p className="font-bold text-lg">{formatCurrencyWithLocale(card.minimumPayment, countryCode, locale)}</p>
                </div>
                {card.dueDate && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                      <p className="font-bold">{formatDateWithLocale(card.dueDate, countryCode, locale)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Days Until Due</p>
                      {card.daysOverdue !== null && card.daysOverdue > 0 ? (
                        <p className="font-bold text-red-600">Overdue by {card.daysOverdue} days</p>
                      ) : card.daysUntilDue !== null ? (
                        <p className="font-bold">{card.daysUntilDue} days</p>
                      ) : (
                        <p className="text-muted-foreground">-</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
