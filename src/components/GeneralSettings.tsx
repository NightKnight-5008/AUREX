import {} from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LogOut,
  User,
  Mail,
  Info,
  Globe,
  Languages,
} from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { CurrencySelector } from '@/components/CurrencySelector';
import { CurrencyStatusIndicator } from '@/components/CurrencyStatusIndicator';
import { getCountryConfig } from '@/lib/country-config';

interface GeneralSettingsProps {
  countryCode: string;
  onCountryChange: (countryCode: string) => void;
  locale?: string;
  onLocaleChange: (locale: string | undefined) => void;
  currency?: string;
  onCurrencyChange?: (currency: string) => void;
}

export function GeneralSettings({
  countryCode,
  onCountryChange,
  locale,
  onLocaleChange,
  currency,
  onCurrencyChange,
}: GeneralSettingsProps) {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="user-email" className="text-sm font-medium">
              Email
            </label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <Input
                id="user-email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Language</p>
              <p className="text-sm text-muted-foreground">
                {user.language === 'en' ? 'English (Default)' : user.language}
              </p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={signOut} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Country & Regional Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Country & Regional Settings
          </CardTitle>
          <CardDescription>
            Configure your country, display currency, and language preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CountrySelector
            selectedCountry={countryCode}
            onCountryChange={onCountryChange}
            selectedLocale={locale}
            onLocaleChange={onLocaleChange}
          />

          {onCurrencyChange && (
            <CurrencySelector
              selectedCurrency={currency}
              onCurrencyChange={onCurrencyChange}
              countryCode={countryCode}
            />
          )}

          {/* Show exchange rate status if currency differs from country's default */}
          {currency && currency !== getCountryConfig(countryCode).currency && (
            <div className="mt-4">
              <CurrencyStatusIndicator
                fromCurrency={getCountryConfig(countryCode).currency}
                toCurrency={currency}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Localization Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Localization Preferences
          </CardTitle>
          <CardDescription>
            Time zone, date formats, and number formatting preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Zone</label>
              <Input
                type="text"
                value={Intl.DateTimeFormat().resolvedOptions().timeZone}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Format</label>
              <Input
                type="text"
                value={new Date().toLocaleDateString(locale || 'en-US')}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Format</label>
              <Input
                type="text"
                value={new Date().toLocaleTimeString(locale || 'en-US')}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Number Format</label>
              <Input
                type="text"
                value={new Intl.NumberFormat(locale || 'en-US').format(1234567.89)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              These formats are automatically determined by your selected country and locale settings.
              Changes to the country selector above will update these formats accordingly.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

    </div>
  );
}
