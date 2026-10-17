/**
 * Security & Data Integrity Information
 *
 * Static, read-only copy for Settings → Security/About
 * Shows:
 * - "Your financial history is immutable"
 * - "Past data is never recalculated"
 * - "All data is encrypted locally"
 *
 * NO technical details exposed (no encryption keys, algorithms, etc.)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Database, CheckCircle } from 'lucide-react';

export function SecurityDataIntegrityInfo() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Data Integrity
          </CardTitle>
          <CardDescription>
            How AUREX protects your financial data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Immutability */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Your financial history is immutable</h4>
              <p className="text-sm text-muted-foreground">
                All transactions are recorded in a permanent ledger that cannot be altered or deleted.
                This ensures a complete, tamper-proof audit trail of your financial activity.
              </p>
            </div>
          </div>

          {/* No Recalculation */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Past data is never recalculated</h4>
              <p className="text-sm text-muted-foreground">
                Historical balances, exchange rates, and analytics are preserved exactly as they
                were at the time of recording. This prevents retroactive changes and maintains
                data integrity.
              </p>
            </div>
          </div>

          {/* Local Encryption */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium">All data is encrypted locally</h4>
              <p className="text-sm text-muted-foreground">
                Your financial data is encrypted on your device before being stored or transmitted.
                This ensures that your sensitive information remains private and secure.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Security Info */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Enterprise-grade security:</strong> AUREX uses bank-level encryption and
          security practices to protect your financial data. Your information is never sold
          or shared with third parties.
        </AlertDescription>
      </Alert>
    </div>
  );
}
