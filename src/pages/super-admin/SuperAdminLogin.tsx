import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Mail, Lock, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { ROUTES } from '@/lib/routes';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, resetPassword, signOut } = useAuth();
  const { isSuperAdmin, loading: roleLoading, checkSuperAdmin } = useSuperAdmin();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Only populated once credentials pass and 2FA is required — the real
  // session is dropped at that point, so this step exists outside the
  // normal `user` session state.
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  useEffect(() => {
    if (!authLoading && !roleLoading && user && isSuperAdmin && !awaitingOtp) {
      navigate(ROUTES.SUPER_ADMIN_ROOT);
    }
  }, [user, authLoading, roleLoading, isSuperAdmin, awaitingOtp, navigate]);

  // After credentials verify, request an OTP while the fresh session's
  // token is still valid. Returns true if the caller should proceed
  // straight to the dashboard (2FA off), false if an OTP screen is next.
  const requestOtpOrProceed = async (): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke('super-admin-request-otp');
    if (error || (data && 'error' in data)) {
      toast.error((data as { error?: string })?.error || error?.message || 'Could not start verification.');
      await signOut();
      return false;
    }
    if (!(data as { required?: boolean })?.required) {
      return true;
    }
    await signOut();
    setAwaitingOtp(true);
    toast.success('Enter the 6-digit code we emailed you');
    return false;
  };

  const handlePasswordReset = async () => {
    const validation = resetSchema.safeParse({ email });
    if (!validation.success) {
      toast.error('Enter your email address first');
      return;
    }

    setIsResetting(true);
    const { error } = await resetPassword(email);
    setIsResetting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent. Check your inbox.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      setIsSubmitting(false);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Check if user is super admin after login
    const isAdmin = await checkSuperAdmin();

    if (!isAdmin) {
      // Sign-in succeeded but the account isn't a super admin — don't leave
      // an authenticated session sitting in the browser for an account that
      // just failed this access check.
      await signOut();
      setIsSubmitting(false);
      toast.error('Access denied. You are not a Super Admin.');
      return;
    }

    const proceed = await requestOtpOrProceed();
    setIsSubmitting(false);
    if (proceed) {
      toast.success('Welcome, Super Admin!');
      navigate(ROUTES.SUPER_ADMIN_ROOT);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error('Enter the 6-digit code');
      return;
    }

    setIsVerifyingOtp(true);
    const { data, error } = await supabase.functions.invoke('super-admin-verify-otp', {
      body: { email, code: otpCode },
    });

    if (error || !(data as { ok?: boolean })?.ok) {
      setIsVerifyingOtp(false);
      toast.error((data as { error?: string })?.error || error?.message || 'Incorrect code');
      setOtpCode('');
      return;
    }

    // Code confirmed — re-establish the real session now.
    const { error: signInError } = await signIn(email, password);
    setIsVerifyingOtp(false);

    if (signInError) {
      toast.error(signInError.message);
      return;
    }

    toast.success('Welcome, Super Admin!');
    navigate(ROUTES.SUPER_ADMIN_ROOT);
  };

  const handleResendOtp = async () => {
    setIsResendingOtp(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setIsResendingOtp(false);
      toast.error('Could not resend — sign in again.');
      setAwaitingOtp(false);
      return;
    }
    await requestOtpOrProceed();
    setIsResendingOtp(false);
  };

  const handleBackToLogin = () => {
    setAwaitingOtp(false);
    setOtpCode('');
    setPassword('');
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin Portal</h1>
          <p className="text-slate-400 mt-2">Platform Administration Access</p>
        </div>

        {awaitingOtp ? (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <form onSubmit={handleVerifyOtp}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Enter verification code
                </CardTitle>
                <CardDescription className="text-slate-400">
                  We emailed a 6-digit code to {email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-slate-200">Code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 text-center text-2xl tracking-[0.5em] font-mono"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                    required
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0 py-0 text-slate-300 hover:text-white"
                    onClick={handleBackToLogin}
                  >
                    ← Back to login
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0 py-0 text-slate-300 hover:text-white"
                    disabled={isResendingOtp}
                    onClick={handleResendOtp}
                  >
                    {isResendingOtp ? 'Resending…' : 'Resend code'}
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                >
                  {isVerifyingOtp ? 'Verifying…' : 'Verify & Continue'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <form onSubmit={handleLogin}>
              <CardHeader>
                <CardTitle className="text-white">Admin Login</CardTitle>
                <CardDescription className="text-slate-400">
                  Enter your credentials to access the admin dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@kodipap.com"
                      className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0 py-0 text-sm text-slate-300 hover:text-white"
                    disabled={isResetting}
                    onClick={handlePasswordReset}
                  >
                    {isResetting ? 'Sending reset email...' : 'Forgot password?'}
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Authenticating...' : 'Access Dashboard'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          Kodipap Platform Administration
        </p>
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            onClick={() => navigate(ROUTES.AUTH)}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            ← Back to Landlord Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
