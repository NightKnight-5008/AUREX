import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Globe, Info, Languages } from 'lucide-react';
import { getAvailableCountries, getCountryConfig, LANGUAGE_OPTIONS } from '@/lib/country-config';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CountrySelectorProps {
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  selectedLocale?: string;
  onLocaleChange?: (locale: string) => void;
}

export function CountrySelector({
  selectedCountry,
  onCountryChange,
  selectedLocale,
  onLocaleChange
}: CountrySelectorProps) {
  const countries = getAvailableCountries();
  const currentConfig = getCountryConfig(selectedCountry);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Country & Regional Settings
              </CardTitle>
              <CardDescription>
                Configure your location for currency, taxes, and banking information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="country">Select Country</Label>
            <Select value={selectedCountry} onValueChange={onCountryChange}>
              <SelectTrigger id="country" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <div className="space-y-1 text-sm">
                <div>
                  <strong>Currency:</strong> {currentConfig.currency}
                </div>
                <div>
                  <strong>Tax Brackets:</strong> {currentConfig.taxBrackets.length} configured
                </div>
                <div>
                  <strong>Common Banks:</strong> {currentConfig.commonBanks.length} in database
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="pt-2 border-t">
            <h4 className="text-sm font-semibold mb-2">Available Banks in {currentConfig.name}</h4>
            <div className="flex flex-wrap gap-2">
              {currentConfig.commonBanks.slice(0, 5).map((bank) => (
                <div
                  key={bank}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-100 rounded border border-gray-200 dark:border-gray-300 text-gray-900 dark:text-black font-medium"
                >
                  {bank}
                </div>
              ))}
              {currentConfig.commonBanks.length > 5 && (
                <div className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-100 rounded border border-gray-200 dark:border-gray-300 text-gray-600 dark:text-gray-700 font-medium">
                  +{currentConfig.commonBanks.length - 5} more
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {onLocaleChange && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Language & Number Format
                </CardTitle>
                <CardDescription>
                  Choose your preferred language and number formatting style
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locale">Select Language</Label>
              <Select
                value={selectedLocale || currentConfig.locale}
                onValueChange={onLocaleChange}
              >
                <SelectTrigger id="locale" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert className="bg-green-50 border-green-200">
              <Info className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900 text-sm">
                Language changes affect number formatting and date display. Currency symbols remain based on your selected country.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
