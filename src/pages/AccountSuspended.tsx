import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, LogOut, Phone, Mail, CreditCard } from 'lucide-react';

const AccountSuspended = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-destructive/40">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Account Suspended</CardTitle>
          <CardDescription className="text-base">
            Your KODI PAP account has been suspended. Kindly update your payment status
            to restore access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <CreditCard className="h-4 w-4 text-primary" />
              Payment Instructions
            </div>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">M-Pesa Paybill:</span> 247247
              </li>
              <li>
                <span className="font-medium text-foreground">Account Number:</span> Your registered phone number
              </li>
              <li>
                <span className="font-medium text-foreground">Amount:</span> As per your subscription plan
              </li>
            </ul>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="font-semibold text-sm">Need help?</div>
            <a
              href="tel:+254700000000"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Phone className="h-4 w-4" /> +254 700 000 000
            </a>
            <a
              href="mailto:support@kodipap.com"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Mail className="h-4 w-4" /> support@kodipap.com
            </a>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Once payment is confirmed, your account will be reactivated and access restored.
          </p>

          <Button variant="outline" className="w-full" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSuspended;
