import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/financial-data';

interface CountryData {
  code: string;
  orders: number;
}

interface WorldHeatmapProps {
  data: CountryData[];
  title?: string;
  description?: string;
}

// Accurate country positions on a real world map projection (Mercator-style)
// Coordinates based on capital cities or geographic centers
const COUNTRY_POSITIONS: Record<string, { x: number; y: number; name: string }> = {
  // North America
  'US': { x: 220, y: 220, name: 'United States' },
  'CA': { x: 200, y: 150, name: 'Canada' },
  'MX': { x: 200, y: 250, name: 'Mexico' },

  // South America
  'BR': { x: 380, y: 340, name: 'Brazil' },
  'AR': { x: 350, y: 410, name: 'Argentina' },
  'CL': { x: 330, y: 420, name: 'Chile' },
  'CO': { x: 320, y: 290, name: 'Colombia' },
  'PE': { x: 320, y: 330, name: 'Peru' },
  'VE': { x: 340, y: 280, name: 'Venezuela' },

  // Europe
  'GB': { x: 490, y: 160, name: 'United Kingdom' },
  'FR': { x: 505, y: 180, name: 'France' },
  'DE': { x: 520, y: 160, name: 'Germany' },
  'IT': { x: 525, y: 195, name: 'Italy' },
  'ES': { x: 485, y: 195, name: 'Spain' },
  'PL': { x: 535, y: 155, name: 'Poland' },
  'SE': { x: 530, y: 125, name: 'Sweden' },
  'NO': { x: 520, y: 115, name: 'Norway' },
  'FI': { x: 545, y: 120, name: 'Finland' },
  'DK': { x: 520, y: 145, name: 'Denmark' },
  'NL': { x: 510, y: 160, name: 'Netherlands' },
  'BE': { x: 508, y: 165, name: 'Belgium' },
  'CH': { x: 515, y: 180, name: 'Switzerland' },
  'AT': { x: 530, y: 175, name: 'Austria' },
  'GR': { x: 540, y: 200, name: 'Greece' },
  'PT': { x: 475, y: 200, name: 'Portugal' },
  'IE': { x: 475, y: 150, name: 'Ireland' },
  'CZ': { x: 528, y: 165, name: 'Czech Republic' },
  'HU': { x: 535, y: 180, name: 'Hungary' },
  'RO': { x: 545, y: 185, name: 'Romania' },
  'UA': { x: 560, y: 165, name: 'Ukraine' },
  'BG': { x: 545, y: 195, name: 'Bulgaria' },

  // Asia
  'RU': { x: 650, y: 140, name: 'Russia' },
  'CN': { x: 720, y: 210, name: 'China' },
  'JP': { x: 800, y: 215, name: 'Japan' },
  'IN': { x: 675, y: 250, name: 'India' },
  'KR': { x: 770, y: 215, name: 'South Korea' },
  'SG': { x: 720, y: 285, name: 'Singapore' },
  'TH': { x: 705, y: 260, name: 'Thailand' },
  'ID': { x: 730, y: 305, name: 'Indonesia' },
  'PH': { x: 765, y: 260, name: 'Philippines' },
  'VN': { x: 715, y: 260, name: 'Vietnam' },
  'MY': { x: 715, y: 280, name: 'Malaysia' },
  'PK': { x: 655, y: 235, name: 'Pakistan' },
  'BD': { x: 695, y: 245, name: 'Bangladesh' },
  'IR': { x: 610, y: 220, name: 'Iran' },
  'IQ': { x: 590, y: 220, name: 'Iraq' },
  'KZ': { x: 630, y: 175, name: 'Kazakhstan' },

  // Middle East
  'AE': { x: 615, y: 245, name: 'United Arab Emirates' },
  'SA': { x: 590, y: 250, name: 'Saudi Arabia' },
  'TR': { x: 560, y: 200, name: 'Turkey' },
  'IL': { x: 565, y: 225, name: 'Israel' },
  'JO': { x: 570, y: 230, name: 'Jordan' },
  'LB': { x: 565, y: 220, name: 'Lebanon' },
  'KW': { x: 595, y: 235, name: 'Kuwait' },
  'QA': { x: 610, y: 250, name: 'Qatar' },
  'OM': { x: 620, y: 260, name: 'Oman' },

  // Africa
  'EG': { x: 560, y: 235, name: 'Egypt' },
  'ZA': { x: 545, y: 385, name: 'South Africa' },
  'NG': { x: 515, y: 280, name: 'Nigeria' },
  'KE': { x: 570, y: 295, name: 'Kenya' },
  'ET': { x: 570, y: 280, name: 'Ethiopia' },
  'GH': { x: 495, y: 285, name: 'Ghana' },
  'TZ': { x: 565, y: 310, name: 'Tanzania' },
  'UG': { x: 560, y: 295, name: 'Uganda' },
  'DZ': { x: 510, y: 230, name: 'Algeria' },
  'MA': { x: 480, y: 225, name: 'Morocco' },

  // Oceania
  'AU': { x: 790, y: 380, name: 'Australia' },
  'NZ': { x: 850, y: 420, name: 'New Zealand' },
};

export function WorldHeatmap({ data, title = 'Global Orders Heatmap', description = 'Real-time order distribution worldwide' }: WorldHeatmapProps) {
  // Calculate intensity for each country
  const maxOrders = useMemo(() => {
    return Math.max(...data.map(d => d.orders), 1);
  }, [data]);

  const countryDataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(item => map.set(item.code, item.orders));
    return map;
  }, [data]);

  const getIntensity = (orders: number) => {
    return Math.min((orders / maxOrders) * 100, 100);
  };

  const getColor = (intensity: number) => {
    // Gradient from light purple to dark purple
    const alpha = 0.3 + (intensity / 100) * 0.7;
    return `rgba(139, 92, 246, ${alpha})`;
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.orders - a.orders);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend and Top Countries */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Legend */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Order Intensity</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-full h-6 rounded-lg border" style={{
                  background: 'linear-gradient(to right, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 1))'
                }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>Low Volume</span>
                <span>High Volume</span>
              </div>
            </div>
          </div>

          {/* Top Countries List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Top 5 Markets</h4>
            <div className="space-y-2">
              {sortedData.slice(0, 5).map((item, index) => {
                const pos = COUNTRY_POSITIONS[item.code];
                if (!pos) return null;

                const intensity = getIntensity(item.orders);
                const color = getColor(intensity);

                return (
                  <div key={item.code} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge
                        className="w-7 h-7 p-0 justify-center font-bold"
                        style={{ backgroundColor: color, borderColor: '#8b5cf6' }}
                      >
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{pos.name}</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatNumber(item.orders)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
