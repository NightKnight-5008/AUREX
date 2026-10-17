import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Sparkles,
  Target,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Minus,
} from 'lucide-react';
import type { EnhancedCompanyCard, SpendingSimulation, CardRecommendation } from '@/types/enhanced-financial';
import { FinancialLogicEngine } from '@/lib/financial-logic-engine';
import { StressIndexCalculator } from '@/lib/stress-index-calculator';
import { formatCurrency } from '@/lib/financial-data';

interface SimulationsTabProps {
  cards: EnhancedCompanyCard[];
  countryCode: string;
}

export function SimulationsTab({ cards, countryCode }: SimulationsTabProps) {
  const [simulationAmount, setSimulationAmount] = useState<string>('');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [simulations, setSimulations] = useState<SpendingSimulation[]>([]);

  const currentStressIndex = useMemo(() => {
    return StressIndexCalculator.calculateStressIndex(cards);
  }, [cards]);

  const activeCards = cards.filter((card) => card.cardType === 'credit');

  // Smart Card Recommendation Engine
  const getSmartRecommendations = (amount: number): CardRecommendation[] => {
    const recommendations: CardRecommendation[] = [];

    for (const card of activeCards) {
      const currentUtilization = card.utilizationPercentage;
      const newAvailableBalance = card.availableBalance - amount;
      const newOutstandingDebt = (card.outstandingDebt ?? 0) + amount;
      const newUtilization = FinancialLogicEngine.calculateUtilization(newOutstandingDebt, card.creditLimit);

      // Check if spending would put card over limit
      if (newAvailableBalance < 0) {
        continue; // Skip cards that can't handle this amount
      }

      const utilizationChange = newUtilization - currentUtilization;

      // Determine status change
      const { status: newStatus } = FinancialLogicEngine.determineCardStatus(
        newOutstandingDebt,
        card.creditLimit,
        card.minimumPayment,
        card.dueDate,
        undefined,
        card.paymentsThisCycle
      );

      // Calculate risk impact
      let riskImpact: 'positive' | 'neutral' | 'negative' = 'neutral';
      if (newUtilization > 80) {
        riskImpact = 'negative';
      } else if (newUtilization < 50) {
        riskImpact = 'positive';
      }

      // Calculate recommendation score (0-100, higher is better)
      let score = 100;
      score -= utilizationChange * 0.5; // Penalize utilization increase
      score -= card.daysUntilDue !== null && card.daysUntilDue < 7 ? 15 : 0; // Penalize cards with upcoming due dates
      score += card.status === 'paid' ? 10 : 0; // Prefer paid cards
      score -= card.isOverLimit ? 50 : 0; // Heavily penalize over-limit cards

      // Grace period bonus (longest time until due date)
      if (card.daysUntilDue !== null && card.daysUntilDue > 0) {
        score += Math.min(15, card.daysUntilDue * 0.5);
      }

      const reason = generateRecommendationReason(card, newUtilization, utilizationChange, card.daysUntilDue);

      recommendations.push({
        cardId: card.id,
        recommendationScore: Math.max(0, Math.min(100, score)),
        reason,
        impacts: {
          utilizationChange,
          availableBalanceAfter: newAvailableBalance,
          statusChange: newStatus !== card.status ? newStatus : undefined,
          riskImpact,
        },
      });
    }

    // Sort by recommendation score (highest first)
    return recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
  };

  const generateRecommendationReason = (
    card: EnhancedCompanyCard,
    newUtilization: number,
    utilizationChange: number,
    daysUntilDue: number | null
  ): string => {
    const reasons: string[] = [];

    if (newUtilization < 30) {
      reasons.push('Low utilization impact');
    } else if (newUtilization < 60) {
      reasons.push('Moderate utilization impact');
    } else {
      reasons.push('High utilization impact');
    }

    if (daysUntilDue !== null && daysUntilDue > 20) {
      reasons.push('longest grace period');
    } else if (daysUntilDue !== null && daysUntilDue > 10) {
      reasons.push('good grace period');
    }

    if (card.status === 'paid') {
      reasons.push('currently paid off');
    }

    return reasons.join(', ');
  };

  const handleSimulate = () => {
    const amount = parseFloat(simulationAmount);
    if (isNaN(amount) || amount <= 0 || !selectedCardId) {
      return;
    }

    const selectedCard = activeCards.find((c) => c.id === selectedCardId);
    if (!selectedCard) return;

    // Calculate before state
    const beforeUtilization = selectedCard.utilizationPercentage;
    const beforeAvailableBalance = selectedCard.availableBalance;
    const beforeStatus = selectedCard.status;
    const beforeStress = currentStressIndex.score;

    // Calculate after state
    const newAvailableBalance = selectedCard.availableBalance - amount;
    const newOutstandingDebt = (selectedCard.outstandingDebt ?? 0) + amount;
    const newUtilization = FinancialLogicEngine.calculateUtilization(newOutstandingDebt, selectedCard.creditLimit);

    const { status: newStatus } = FinancialLogicEngine.determineCardStatus(
      newOutstandingDebt,
      selectedCard.creditLimit,
      selectedCard.minimumPayment,
      selectedCard.dueDate,
      undefined,
      selectedCard.paymentsThisCycle
    );

    // Simulate new cards state
    const simulatedCards = cards.map((c) => {
      if (c.id === selectedCardId) {
        return {
          ...c,
          availableBalance: newAvailableBalance,
          outstandingDebt: newOutstandingDebt,
          utilizationPercentage: newUtilization,
          status: newStatus,
        };
      }
      return c;
    });

    const afterStress = StressIndexCalculator.calculateStressIndex(simulatedCards).score;

    // Get recommendations
    const recommendations = getSmartRecommendations(amount);

    const simulation: SpendingSimulation = {
      id: `sim-${Date.now()}`,
      amount,
      selectedCardId,
      timestamp: new Date(),
      beforeState: {
        utilization: beforeUtilization,
        availableBalance: beforeAvailableBalance,
        status: beforeStatus,
        stressScore: beforeStress,
      },
      afterState: {
        utilization: newUtilization,
        availableBalance: newAvailableBalance,
        status: newStatus,
        stressScore: afterStress,
      },
      recommendation: recommendations,
    };

    setSimulations([simulation, ...simulations.slice(0, 4)]); // Keep last 5 simulations
  };

  const getStressLevelColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStressLevelBadge = (score: number) => {
    if (score < 30) return <Badge className="bg-green-500">Safe</Badge>;
    if (score < 60) return <Badge className="bg-yellow-500">Watchlist</Badge>;
    return <Badge className="bg-red-500">High Risk</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Financial Stress Index */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Financial Stress Index
              </CardTitle>
              <CardDescription>Composite score based on utilization, statuses, and due dates</CardDescription>
            </div>
            {getStressLevelBadge(currentStressIndex.score)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={currentStressIndex.score} className="h-4" />
            </div>
            <div className={`text-4xl font-bold ${getStressLevelColor(currentStressIndex.score)}`}>
              {currentStressIndex.score.toFixed(0)}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Utilization</div>
              <div className="text-lg font-semibold">{currentStressIndex.contributingFactors.utilizationImpact.toFixed(0)}/40</div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="text-lg font-semibold">{currentStressIndex.contributingFactors.statusImpact.toFixed(0)}/25</div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Due Dates</div>
              <div className="text-lg font-semibold">{currentStressIndex.contributingFactors.dueDateProximityImpact.toFixed(0)}/20</div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Active Cards</div>
              <div className="text-lg font-semibold">{currentStressIndex.contributingFactors.activeCardsImpact.toFixed(0)}/10</div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Over-Limit</div>
              <div className="text-lg font-semibold">{currentStressIndex.contributingFactors.overLimitImpact.toFixed(0)}/5</div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="text-sm font-medium">Contributing Factors:</div>
            {currentStressIndex.breakdown.map((factor, idx) => (
              <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What-If Simulator */}
      <Tabs defaultValue="simulator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simulator">What-If Simulator</TabsTrigger>
          <TabsTrigger value="recommendations">Smart Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                "What If I Spend..." Simulator
              </CardTitle>
              <CardDescription>
                Simulate hypothetical spending to see the impact on utilization, balance, and stress score
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Spending Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={simulationAmount}
                    onChange={(e) => setSimulationAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card">Select Card</Label>
                  <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a card" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.cardholderName} - •••• {card.lastFourDigits}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSimulate} className="w-full" disabled={!simulationAmount || !selectedCardId}>
                <Sparkles className="w-4 h-4 mr-2" />
                Run Simulation
              </Button>
            </CardContent>
          </Card>

          {/* Simulation Results */}
          {simulations.length > 0 && (
            <div className="space-y-4">
              {simulations.map((sim) => {
                const card = activeCards.find((c) => c.id === sim.selectedCardId);
                if (!card) return null;

                const utilizationChange = sim.afterState.utilization - sim.beforeState.utilization;
                const balanceChange = sim.afterState.availableBalance - sim.beforeState.availableBalance;
                const stressChange = sim.afterState.stressScore - sim.beforeState.stressScore;

                return (
                  <Card key={sim.id} className="border-primary/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Spending {formatCurrency(sim.amount, countryCode)} on {card.cardholderName}
                        </CardTitle>
                        <Badge variant="outline">
                          {sim.timestamp.toLocaleTimeString()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Utilization */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <TrendingUp className="w-4 h-4" />
                            Utilization
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{sim.beforeState.utilization.toFixed(1)}%</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-2xl font-bold">{sim.afterState.utilization.toFixed(1)}%</span>
                          </div>
                          <div className={`text-sm flex items-center gap-1 ${utilizationChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {utilizationChange > 0 ? <ArrowUp className="w-3 h-3" /> : utilizationChange < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {Math.abs(utilizationChange).toFixed(1)}% change
                          </div>
                        </div>

                        {/* Available Balance */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <DollarSign className="w-4 h-4" />
                            Available Balance
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{formatCurrency(sim.beforeState.availableBalance, countryCode)}</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-2xl font-bold">{formatCurrency(sim.afterState.availableBalance, countryCode)}</span>
                          </div>
                          <div className={`text-sm flex items-center gap-1 ${balanceChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {balanceChange < 0 ? <ArrowDown className="w-3 h-3" /> : balanceChange > 0 ? <ArrowUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {formatCurrency(Math.abs(balanceChange), countryCode)}
                          </div>
                        </div>

                        {/* Stress Score */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Target className="w-4 h-4" />
                            Stress Score
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{sim.beforeState.stressScore.toFixed(0)}</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-2xl font-bold">{sim.afterState.stressScore.toFixed(0)}</span>
                          </div>
                          <div className={`text-sm flex items-center gap-1 ${stressChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {stressChange > 0 ? <ArrowUp className="w-3 h-3" /> : stressChange < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {Math.abs(stressChange).toFixed(0)} points
                          </div>
                        </div>
                      </div>

                      {/* Better Recommendations */}
                      {sim.recommendation.length > 1 && sim.recommendation[0].cardId !== sim.selectedCardId && (
                        <Alert className="mt-4 border-green-500/50 bg-green-50 dark:bg-green-950">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <AlertDescription className="text-green-900 dark:text-green-100">
                            <strong>Better option available:</strong> Use {activeCards.find((c) => c.id === sim.recommendation[0].cardId)?.cardholderName} (•••• {activeCards.find((c) => c.id === sim.recommendation[0].cardId)?.lastFourDigits}) - {sim.recommendation[0].reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          {simulationAmount && parseFloat(simulationAmount) > 0 ? (
            <div className="space-y-4">
              {getSmartRecommendations(parseFloat(simulationAmount)).map((rec, idx) => {
                const card = activeCards.find((c) => c.id === rec.cardId);
                if (!card) return null;

                return (
                  <Card key={rec.cardId} className={idx === 0 ? 'border-green-500' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {idx === 0 && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                            {card.cardholderName} - •••• {card.lastFourDigits}
                          </CardTitle>
                          <CardDescription>{rec.reason}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{rec.recommendationScore.toFixed(0)}</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Utilization Change</div>
                          <div className={`text-lg font-semibold ${rec.impacts.utilizationChange > 15 ? 'text-red-600' : rec.impacts.utilizationChange > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                            +{rec.impacts.utilizationChange.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Available After</div>
                          <div className="text-lg font-semibold">{formatCurrency(rec.impacts.availableBalanceAfter, countryCode)}</div>
                        </div>
                        {rec.impacts.statusChange && (
                          <div className="col-span-2">
                            <Alert>
                              <AlertTriangle className="w-4 h-4" />
                              <AlertDescription>
                                Status will change to: <strong>{rec.impacts.statusChange}</strong>
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a spending amount in the simulator to see smart card recommendations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
