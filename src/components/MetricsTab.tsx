import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Globe, CreditCard } from 'lucide-react';
import { SalesSection } from './SalesSection';
import { WebsiteSection } from './WebsiteSection';
import { CardsSection } from './CardsSection';
import type { FinancialMetrics, Product, WebsiteMetrics, CompanyCard } from '@/types/financial';

interface MetricsTabProps {
  monthlyMetrics: FinancialMetrics[];
  products: Product[];
  websiteMetrics: WebsiteMetrics[];
  cards: CompanyCard[];
  countryCode: string;
  locale?: string;
  currency?: string;
}

export function MetricsTab({
  monthlyMetrics,
  products,
  websiteMetrics,
  cards,
  countryCode,
  locale,
  currency,
}: MetricsTabProps) {
  // State preservation: Track active tab and reset section states on tab switch
  const [activeTab, setActiveTab] = useState('sales');
  const [sectionResetKey, setSectionResetKey] = useState(0);

  const handleTabChange = (value: string) => {
    if (value !== activeTab) {
      setActiveTab(value);
      // Force remount of section components to reset all collapsed states
      setSectionResetKey((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 p-6 rounded-lg border">
        <h1 className="text-3xl font-bold mb-2">Metrics & Intelligence</h1>
        <p className="text-muted-foreground">
          Operational financial intelligence for retailers and operators. Real-time insights across sales, website performance, and credit management.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="website" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website
          </TabsTrigger>
          <TabsTrigger value="cards" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Cards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <SalesSection
            key={`sales-${sectionResetKey}`}
            monthlyMetrics={monthlyMetrics}
            products={products}
            countryCode={countryCode}
            locale={locale}
          />
        </TabsContent>

        <TabsContent value="website" className="mt-6">
          <WebsiteSection
            key={`website-${sectionResetKey}`}
            websiteMetrics={websiteMetrics}
            countryCode={countryCode}
            locale={locale}
          />
        </TabsContent>

        <TabsContent value="cards" className="mt-6">
          <CardsSection
            key={`cards-${sectionResetKey}`}
            cards={cards}
            countryCode={countryCode}
            locale={locale}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
