import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Bot, User, AlertCircle, Sparkles } from 'lucide-react';
import type { CompanyCard, FinancialTransaction, FinancialMetrics, TaxConfiguration } from '@/types/financial';
import { useGPTChat } from '@/hooks/use-gpt-chat';
import { InlineAILabel } from '@/components/AIGeneratedLabel';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
}

interface AIChatProps {
  cards: CompanyCard[];
  transactions: FinancialTransaction[];
  monthlyMetrics: FinancialMetrics[];
  yearlyMetrics: FinancialMetrics;
  taxConfig: TaxConfiguration;
  countryCode: string;
}

export function AIChat({
  cards,
  transactions,
  monthlyMetrics,
  yearlyMetrics,
  taxConfig,
  countryCode,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI financial assistant. I can help you answer questions about your company\'s financial data, including cards, transactions, payroll, taxes, and metrics. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { mutateAsync: sendGPTMessage, isPending: isProcessing } = useGPTChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to check if question is about app/finance
  const isValidQuestion = (question: string): boolean => {
    const lowerQuestion = question.toLowerCase();

    // Block code-related questions
    const codeKeywords = ['code', 'function', 'class', 'variable', 'programming', 'debug', 'implement', 'develop'];
    if (codeKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      return false;
    }

    // Block emotional/personal advice
    const emotionalKeywords = ['feel', 'emotion', 'sad', 'happy', 'depressed', 'anxious', 'relationship', 'love', 'hate'];
    if (emotionalKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      return false;
    }

    // Allow finance/app related questions
    const financeKeywords = [
      'card', 'transaction', 'revenue', 'expense', 'payroll', 'employee', 'tax', 'profit',
      'balance', 'payment', 'total', 'amount', 'money', 'financial', 'metric', 'income',
      'cost', 'budget', 'account', 'bank', 'credit', 'debit', 'salary', 'wage', 'law',
      'regulation', 'compliance', 'rate', 'worth', 'asset', 'liability', 'invoice'
    ];

    return financeKeywords.some(keyword => lowerQuestion.includes(keyword));
  };

  // Function to answer questions based on data
  const answerQuestion = (question: string): { answer: string; sources: string[] } => {
    const lowerQuestion = question.toLowerCase();
    const sources: string[] = [];

    // Cards questions
    if (lowerQuestion.includes('card') && (lowerQuestion.includes('total') || lowerQuestion.includes('number') || lowerQuestion.includes('how many'))) {
      sources.push('Card Management Data');
      return {
        answer: `You currently have ${cards.length} company card${cards.length !== 1 ? 's' : ''} registered in the system.`,
        sources,
      };
    }

    if (lowerQuestion.includes('card') && lowerQuestion.includes('name')) {
      sources.push('Card Management Data');
      const cardNames = cards.map(c => c.cardholderName).join(', ');
      return {
        answer: `Your company cards are held by: ${cardNames}.`,
        sources,
      };
    }

    if (lowerQuestion.includes('card') && (lowerQuestion.includes('balance') || lowerQuestion.includes('available'))) {
      sources.push('Card Management Data');
      const totalBalance = cards.reduce((sum, card) => sum + card.availableBalance, 0);
      return {
        answer: `The total available balance across all cards is ${totalBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
        sources,
      };
    }

    // Employee/Payroll questions
    if (lowerQuestion.includes('employee') || lowerQuestion.includes('payroll')) {
      const payrollTransactions = transactions.filter(t => t.type === 'payroll' && t.payrollEmployees);
      if (payrollTransactions.length > 0) {
        sources.push('Payroll Transactions');

        // Get unique employees
        const employeeSet = new Set<string>();
        payrollTransactions.forEach(t => {
          t.payrollEmployees?.forEach(emp => employeeSet.add(emp.name));
        });

        const employees = Array.from(employeeSet);

        if (lowerQuestion.includes('name')) {
          return {
            answer: `Employees who have been paid in the payroll system: ${employees.join(', ')}.`,
            sources,
          };
        }

        return {
          answer: `There are ${employees.length} employees in the payroll system: ${employees.join(', ')}.`,
          sources,
        };
      }
    }

    // Transaction questions
    if (lowerQuestion.includes('transaction')) {
      sources.push('Transaction History');
      return {
        answer: `You have ${transactions.length} total transactions recorded. This includes expenses, revenue, payroll, and tax payments.`,
        sources,
      };
    }

    // Revenue questions
    if (lowerQuestion.includes('revenue')) {
      sources.push('Financial Metrics');
      if (lowerQuestion.includes('year') || lowerQuestion.includes('annual')) {
        return {
          answer: `Your yearly revenue for 2024 is ${yearlyMetrics.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
          sources,
        };
      }
      const latestMonth = monthlyMetrics[monthlyMetrics.length - 1];
      return {
        answer: `Your most recent monthly revenue (${latestMonth.period}) is ${latestMonth.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}. Yearly revenue for 2024 is ${yearlyMetrics.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
        sources,
      };
    }

    // Expense questions
    if (lowerQuestion.includes('expense')) {
      sources.push('Financial Metrics');
      if (lowerQuestion.includes('year') || lowerQuestion.includes('annual')) {
        return {
          answer: `Your yearly expenses for 2024 are ${yearlyMetrics.totalExpenses.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
          sources,
        };
      }
      const latestMonth = monthlyMetrics[monthlyMetrics.length - 1];
      return {
        answer: `Your most recent monthly expenses (${latestMonth.period}) are ${latestMonth.totalExpenses.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}. Yearly expenses for 2024 are ${yearlyMetrics.totalExpenses.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
        sources,
      };
    }

    // Profit questions
    if (lowerQuestion.includes('profit')) {
      sources.push('Financial Metrics');
      if (lowerQuestion.includes('year') || lowerQuestion.includes('annual')) {
        return {
          answer: `Your net profit for 2024 is ${yearlyMetrics.netProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
          sources,
        };
      }
      const latestMonth = monthlyMetrics[monthlyMetrics.length - 1];
      return {
        answer: `Your most recent monthly net profit (${latestMonth.period}) is ${latestMonth.netProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}. Yearly net profit for 2024 is ${yearlyMetrics.netProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
        sources,
      };
    }

    // Tax questions
    if (lowerQuestion.includes('tax')) {
      sources.push('Tax Configuration', 'Financial Metrics');

      if (lowerQuestion.includes('law') || lowerQuestion.includes('regulation') || lowerQuestion.includes('rate')) {
        const countryName = countryCode === 'US' ? 'United States' : countryCode === 'GB' ? 'United Kingdom' : countryCode === 'CA' ? 'Canada' : countryCode === 'IN' ? 'India' : countryCode === 'EG' ? 'Egypt' : 'your country';
        return {
          answer: `In ${countryName}, your current tax bracket is ${taxConfig.taxBracket}% with a tax rate of ${taxConfig.taxRate}%. Your estimated annual tax for ${taxConfig.taxYear} is ${taxConfig.estimatedAnnualTax.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}. Please consult with a tax professional for specific tax laws and regulations.`,
          sources,
        };
      }

      return {
        answer: `Your total taxes paid for 2024 are ${yearlyMetrics.totalTaxes.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}. Your tax rate is ${taxConfig.taxRate}% with an estimated annual tax of ${taxConfig.estimatedAnnualTax.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
        sources,
      };
    }

    // Net worth questions
    if (lowerQuestion.includes('worth') || lowerQuestion.includes('net worth')) {
      sources.push('Financial Metrics');
      return {
        answer: `Your current net worth is ${yearlyMetrics.netWorth.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
        sources,
      };
    }

    // Default response for unmatched but valid questions
    sources.push('General Knowledge');
    return {
      answer: 'I understand your question is related to finance, but I need more specific information to help you. I can answer questions about:\n\n• Company cards (total, names, balances)\n• Employees and payroll\n• Transactions\n• Revenue and expenses\n• Profit and net worth\n• Taxes and tax rates\n\nPlease ask a more specific question about your financial data.',
      sources,
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userInput = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      // Check if question is valid
      if (!isValidQuestion(userInput)) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I\'m sorry, but I can only answer questions related to your company\'s financial data and finance topics. I cannot help with:\n\n• Code or programming questions\n• Emotional or personal advice\n• General knowledge unrelated to finance\n\nPlease ask me about your cards, transactions, revenue, expenses, payroll, taxes, or other financial metrics.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // First try to answer with local data
      const { answer: localAnswer, sources } = answerQuestion(userInput);

      // Build context for GPT with financial data
      const systemContext = `You are a financial assistant with access to the following company data:
- Total cards: ${cards.length}
- Total transactions: ${transactions.length}
- Yearly revenue: $${yearlyMetrics.totalRevenue.toFixed(2)}
- Yearly expenses: $${yearlyMetrics.totalExpenses.toFixed(2)}
- Net profit: $${yearlyMetrics.netProfit.toFixed(2)}
- Tax rate: ${taxConfig.taxRate}%

Local data analysis: ${localAnswer}

Provide a helpful, concise response based on this data. Focus on financial insights and actionable advice.`;

      // Send to GPT API
      const result = await sendGPTMessage({
        messages: [
          { role: 'system', content: systemContext },
          { role: 'user', content: userInput }
        ]
      });

      const assistantMessage: Message = {
        id: result.id,
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        sources: [...sources, 'AI Analysis'],
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Fallback to local answer if API fails
      const { answer, sources } = answerQuestion(userInput);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer + '\n\n_Note: Using local analysis (API unavailable)_',
        timestamp: new Date(),
        sources,
      };
      setMessages(prev => [...prev, assistantMessage]);
      console.error('GPT API error:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <CardTitle>AI Financial Assistant</CardTitle>
            <CardDescription>
              Ask questions about your financial data - cards, transactions, payroll, taxes, and more
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This AI assistant answers questions about <strong>app and finance only</strong>.
            No code help or emotional advice.
          </AlertDescription>
        </Alert>

        <ScrollArea className="h-[500px] rounded-md border p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="space-y-2">
                    <div className={`rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.role === 'assistant' && message.sources && message.sources.some(s => s.includes('AI')) && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <InlineAILabel />
                        </div>
                      )}
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {message.sources.map((source, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            placeholder="Ask me about your cards, employees, revenue, taxes, etc..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[60px]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-semibold mb-1">Example questions you can ask:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>What&apos;s the total number of cards?</li>
            <li>What are the names of the employees paid in the payroll?</li>
            <li>What&apos;s the tax rate this year in my country?</li>
            <li>What&apos;s my total revenue this year?</li>
            <li>How much profit did we make?</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
