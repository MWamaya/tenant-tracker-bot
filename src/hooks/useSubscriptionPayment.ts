import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SubscriptionPaymentStatus =
  | 'idle'
  | 'requesting'
  | 'awaiting_pin'
  | 'completed'
  | 'failed'
  | 'timed_out';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90_000;

/**
 * Drives the "landlord pays for their own subscription" M-Pesa flow:
 * triggers mpesa-subscription-stk-push, then polls subscription_mpesa_requests
 * for the row mpesa-callback updates once Safaricom confirms the payment.
 */
export const useSubscriptionPayment = () => {
  const [status, setStatus] = useState<SubscriptionPaymentStatus>('idle');
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    pollTimer.current = null;
    timeoutTimer.current = null;
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setFailureReason(null);
  }, [stopPolling]);

  const pay = useCallback(
    async (planName: string, phoneNumber: string) => {
      setStatus('requesting');
      setFailureReason(null);

      const { data, error } = await supabase.functions.invoke('mpesa-subscription-stk-push', {
        body: { plan_name: planName, phone_number: phoneNumber },
      });

      if (error || data?.error) {
        const message = data?.error || error?.message || 'Failed to start M-Pesa payment';
        setStatus('failed');
        setFailureReason(message);
        toast.error(message);
        return;
      }

      if (data.activated) {
        setStatus('completed');
        return;
      }

      setStatus('awaiting_pin');
      toast.info('Check your phone and enter your M-Pesa PIN to complete payment');

      const checkoutRequestId = data.checkout_request_id as string;
      const startedAt = Date.now();

      pollTimer.current = setInterval(async () => {
        const { data: row } = await supabase
          .from('subscription_mpesa_requests')
          .select('status, failure_reason')
          .eq('checkout_request_id', checkoutRequestId)
          .maybeSingle();

        if (row?.status === 'completed') {
          stopPolling();
          setStatus('completed');
          return;
        }

        if (row?.status === 'failed') {
          stopPolling();
          setStatus('failed');
          setFailureReason(row.failure_reason || 'Payment was not completed');
          toast.error(row.failure_reason || 'Payment was not completed');
          return;
        }

        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          stopPolling();
          setStatus('timed_out');
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  return { status, failureReason, pay, reset };
};
