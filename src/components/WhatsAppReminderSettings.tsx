/**
 * WhatsApp Reminder Settings Component
 *
 * Allows users to configure phone number and preferences for WhatsApp payment reminders
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';
import {
  useReminderPreferences,
  useUpdateReminderPreferences,
  validatePhoneNumber,
  formatPhoneNumberDisplay,
  getUserTimezone,
  type UpdatePreferencesRequest,
} from '@/hooks/use-whatsapp-reminders';

export function WhatsAppReminderSettings() {
  const { data: preferences, isLoading } = useReminderPreferences();
  const { mutateAsync: updatePreferences, isPending } = useUpdateReminderPreferences();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTimeHour, setReminderTimeHour] = useState(9);
  const [timezone, setTimezone] = useState('America/New_York');
  const [consentGiven, setConsentGiven] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Collapsible config section — collapsed by default when already configured
  const [configExpanded, setConfigExpanded] = useState(false);

  // Load preferences into form
  useEffect(() => {
    if (preferences) {
      setPhoneCountryCode(preferences.phoneCountryCode || '+1');
      setRemindersEnabled(preferences.remindersEnabled);
      setReminderTimeHour(preferences.reminderTimeHour);
      setTimezone(preferences.timezone || getUserTimezone());
      setConsentGiven(preferences.whatsappConsentGiven);
      setPrivacyAccepted(preferences.privacyNoticeAccepted);
    }
  }, [preferences]);

  // Detect user timezone on mount
  useEffect(() => {
    if (!preferences) {
      setTimezone(getUserTimezone());
    }
  }, [preferences]);

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value);
    setPhoneError(null);

    // Validate as user types (if they've entered enough characters)
    if (value.length > 5) {
      const fullNumber = value.startsWith('+') ? value : `${phoneCountryCode}${value}`;
      if (!validatePhoneNumber(fullNumber)) {
        setPhoneError('Invalid phone number format. Use E.164 format (e.g., +12025551234)');
      }
    }
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccess(null);

      // Validate consent
      if (remindersEnabled && !consentGiven) {
        setError('You must give WhatsApp consent to enable reminders');
        return;
      }

      if (remindersEnabled && !privacyAccepted) {
        setError('You must accept the privacy notice to enable reminders');
        return;
      }

      // Validate and format phone number
      let fullNumber = phoneNumber;
      if (phoneNumber && !phoneNumber.startsWith('+')) {
        fullNumber = `${phoneCountryCode}${phoneNumber}`;
      }

      if (phoneNumber && !validatePhoneNumber(fullNumber)) {
        setPhoneError('Invalid phone number. Must be in E.164 format (e.g., +12025551234)');
        return;
      }

      // Build request
      const request: UpdatePreferencesRequest = {
        phoneNumber: fullNumber,
        phoneCountryCode,
        remindersEnabled,
        reminderTimeHour,
        timezone,
        whatsappConsentGiven: consentGiven,
        privacyNoticeAccepted: privacyAccepted,
      };

      await updatePreferences(request);

      setSuccess('WhatsApp reminder preferences saved successfully!');
      setPhoneNumber(''); // Clear input after save (security)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            WhatsApp Payment Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasPhoneNumber = preferences?.phoneNumber && preferences.phoneNumber !== '';
  const isConfigured = hasPhoneNumber && preferences?.whatsappConsentGiven;

  return (
    <Card>
      {/* Collapsible header — tap to expand/collapse configuration */}
      <button
        onClick={() => setConfigExpanded(!configExpanded)}
        className="w-full text-left"
      >
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">WhatsApp Payment Reminders</CardTitle>
              <CardDescription className="mt-0.5">
                {isConfigured
                  ? remindersEnabled
                    ? 'Reminders active — tap to configure'
                    : 'Connected — tap to configure'
                  : 'Tap to set up WhatsApp reminders'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured && remindersEnabled && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </Badge>
            )}
            {isConfigured && !remindersEnabled && (
              <Badge variant="secondary">Paused</Badge>
            )}
            {configExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
      </button>

      {configExpanded && (
      <CardContent className="space-y-6">
        {/* Status Alert */}
        {isConfigured && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Phone number ending in <strong>{preferences?.phoneNumber}</strong> is registered.
              {remindersEnabled && ' Reminders are active.'}
              {!remindersEnabled && ' Enable reminders below to receive messages.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-600 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Phone Number Input */}
        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp Phone Number</Label>
          <div className="flex gap-2">
            <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="+1">+1 (US)</SelectItem>
                <SelectItem value="+20">+20 (EG)</SelectItem>
                <SelectItem value="+44">+44 (UK)</SelectItem>
                <SelectItem value="+971">+971 (AE)</SelectItem>
                <SelectItem value="+966">+966 (SA)</SelectItem>
                <SelectItem value="+91">+91 (IN)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="phone"
              type="tel"
              placeholder="2025551234"
              value={phoneNumber}
              onChange={(e) => handlePhoneNumberChange(e.target.value)}
              className={phoneError ? 'border-red-500' : ''}
            />
          </div>
          {phoneError && (
            <p className="text-sm text-red-600">{phoneError}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Enter your WhatsApp-enabled number in international format (without + or country code)
          </p>
          {hasPhoneNumber && !phoneNumber && (
            <p className="text-sm text-green-600">
              ✓ Phone number ending in <strong>{preferences?.phoneNumber}</strong> is saved
            </p>
          )}
        </div>

        {/* Reminder Time */}
        <div className="space-y-2">
          <Label htmlFor="reminderTime">
            <Clock className="inline h-4 w-4 mr-1" />
            Reminder Time
          </Label>
          <Select
            value={reminderTimeHour.toString()}
            onValueChange={(v) => setReminderTimeHour(parseInt(v))}
          >
            <SelectTrigger id="reminderTime">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {i.toString().padStart(2, '0')}:00 ({i < 12 ? 'AM' : 'PM'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            What time should we send reminders? (in your timezone: {timezone})
          </p>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="enableReminders" className="text-base">
              Enable WhatsApp Reminders
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive payment reminders via WhatsApp
            </p>
          </div>
          <Switch
            id="enableReminders"
            checked={remindersEnabled}
            onCheckedChange={setRemindersEnabled}
          />
        </div>

        {/* Consent Checkboxes */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="whatsappConsent"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1"
            />
            <Label htmlFor="whatsappConsent" className="text-sm cursor-pointer">
              I consent to receive WhatsApp messages for payment reminders. I understand that standard
              messaging rates may apply.
            </Label>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="privacyNotice"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-1"
            />
            <Label htmlFor="privacyNotice" className="text-sm cursor-pointer">
              I accept the privacy notice. My phone number will be encrypted and used only for payment
              reminders. I can opt-out anytime.
            </Label>
          </div>
        </div>

        {/* Privacy Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Privacy & Security:</strong> Your phone number is encrypted using AES-256-GCM and
            stored securely. We only send reminder messages on payment due dates. Messages contain only
            the last 4 digits of your card number, amount, and payment reference. We never share your
            phone number with third parties.
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isPending || (!phoneNumber && !hasPhoneNumber)}
          className="w-full"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Reminder Preferences
        </Button>
      </CardContent>
      )}
    </Card>
  );
}
