import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Save, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { validatePhoneNumber, formatPhoneNumberE164 } from '@/lib/semi-account-generator';

export interface PhoneSection {
  index: 1 | 2 | 3 | 4;
  phoneNumber: string;
  label: string;
  isConfigured: boolean;
}

interface SmsPhoneConfigProps {
  phoneSections: PhoneSection[];
  onSave: (phoneSections: PhoneSection[]) => void;
}

export function SmsPhoneConfig({ phoneSections, onSave }: SmsPhoneConfigProps) {
  const [editedSections, setEditedSections] = useState<PhoneSection[]>(phoneSections);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handlePhoneNumberChange = (index: 1 | 2 | 3 | 4, value: string) => {
    const updated = editedSections.map(section =>
      section.index === index
        ? { ...section, phoneNumber: value, isConfigured: value.length > 0 }
        : section
    );
    setEditedSections(updated);
    setHasChanges(true);
    setSaveSuccess(false);

    // Validate phone number
    if (value && !validatePhoneNumber(value)) {
      setValidationErrors({
        ...validationErrors,
        [index]: 'Invalid phone number format. Use E.164 format: +1234567890',
      });
    } else {
      const { [index]: _, ...rest } = validationErrors;
      setValidationErrors(rest);
    }
  };

  const handleLabelChange = (index: 1 | 2 | 3 | 4, value: string) => {
    const updated = editedSections.map(section =>
      section.index === index ? { ...section, label: value } : section
    );
    setEditedSections(updated);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    // Validate all phone numbers before saving
    const errors: Record<number, string> = {};
    editedSections.forEach(section => {
      if (section.phoneNumber && !validatePhoneNumber(section.phoneNumber)) {
        errors[section.index] = 'Invalid phone number format';
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Format phone numbers to E.164 before saving
    const formattedSections = editedSections.map(section => ({
      ...section,
      phoneNumber: section.phoneNumber ? formatPhoneNumberE164(section.phoneNumber) : '',
    }));

    onSave(formattedSections);
    setHasChanges(false);
    setSaveSuccess(true);

    // Hide success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setEditedSections(phoneSections);
    setValidationErrors({});
    setHasChanges(false);
    setSaveSuccess(false);
  };

  const configuredCount = editedSections.filter(s => s.isConfigured).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              SMS Phone Number Configuration
            </CardTitle>
            <CardDescription>
              Assign phone numbers and labels to each SMS section
            </CardDescription>
          </div>
          <Badge variant={configuredCount === 4 ? 'default' : 'secondary'}>
            {configuredCount} / 4 Configured
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Each phone number will receive SMS messages from banks and other financial institutions.
            The Android app will automatically route messages to the correct section based on which
            phone number received them.
          </AlertDescription>
        </Alert>

        {/* Phone Sections Configuration */}
        <div className="space-y-4">
          {editedSections.map((section) => (
            <div
              key={section.index}
              className="border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Phone Section {section.index}</h4>
                {section.isConfigured && (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`phone-${section.index}`}>
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`phone-${section.index}`}
                    type="tel"
                    placeholder="+1234567890 (E.164 format)"
                    value={section.phoneNumber}
                    onChange={(e) => handlePhoneNumberChange(section.index, e.target.value)}
                    className={validationErrors[section.index] ? 'border-red-500' : ''}
                  />
                  {validationErrors[section.index] && (
                    <p className="text-xs text-red-500">{validationErrors[section.index]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`label-${section.index}`}>
                    Label <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`label-${section.index}`}
                    type="text"
                    placeholder="e.g., Personal, Business, Family"
                    value={section.label}
                    onChange={(e) => handleLabelChange(section.index, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span>Configuration saved successfully</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={!hasChanges}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || Object.keys(validationErrors).length > 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <Alert variant="default" className="border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Phone Number Format:</strong> Use E.164 format with country code
            (e.g., +12025551234 for US, +919876543210 for India, +201234567890 for Egypt).
            This ensures SMS messages are routed correctly across all devices.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
