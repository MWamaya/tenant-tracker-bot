import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface EmailLog {
  id: string;
  landlord_id: string;
  raw_message: string;
  parsed_amount: number | null;
  parsed_house_no: string | null;
  parsed_tenant_name: string | null;
  parsed_mpesa_ref: string | null;
  parsed_date: string | null;
  status: 'pending' | 'processed' | 'failed';
  error_message: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailLogInsert {
  raw_message: string;
}

export interface EmailLogUpdate {
  raw_message?: string;
  parsed_amount?: number | null;
  parsed_house_no?: string | null;
  parsed_tenant_name?: string | null;
  parsed_mpesa_ref?: string | null;
  parsed_date?: string | null;
  status?: 'pending' | 'processed' | 'failed';
  error_message?: string | null;
  payment_id?: string | null;
}

// Parse M-Pesa message using regex
export const parsePaymentMessage = (message: string) => {
  try {
    // Extract amount - matches "KES X,XXX.XX" or "KES XXXX"
    const amountMatch = message.match(/KES\s*([\d,]+(?:\.\d{2})?)/i);
    const amount = amountMatch 
      ? parseFloat(amountMatch[1].replace(/,/g, '')) 
      : null;

    // Extract house number - matches patterns like "212245 B2" or just alphanumeric
    const houseMatch = message.match(/for\s+(\d+\s*[A-Z0-9]+)/i);
    const houseNo = houseMatch ? houseMatch[1].trim() : null;

    // Extract sender name - matches "from NAME" pattern
    const nameMatch = message.match(/from\s+([A-Z\s]+?)(?:\s+\d|\s+on)/i);
    const tenantName = nameMatch ? nameMatch[1].trim() : null;

    // Extract M-Pesa reference
    const refMatch = message.match(/M-Pesa\s*Ref[:\s]*([A-Z0-9]+)/i);
    const mpesaRef = refMatch ? refMatch[1] : null;

    // Extract date - matches "DD/MM/YYYY HH:MM AM/PM" format
    const dateMatch = message.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    let paymentDate: string | null = null;
    
    if (dateMatch) {
      const [datePart, timePart] = dateMatch[1].split(/\s+/);
      const [day, month, year] = datePart.split('/');
      paymentDate = new Date(`${year}-${month}-${day} ${timePart}`).toISOString();
    }

    return {
      amount,
      houseNo,
      tenantName,
      mpesaRef,
      paymentDate,
      isValid: !!(amount && mpesaRef),
    };
  } catch (error) {
    return {
      amount: null,
      houseNo: null,
      tenantName: null,
      mpesaRef: null,
      paymentDate: null,
      isValid: false,
    };
  }
};

export const useEmailLogs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const emailLogsQuery = useQuery({
    queryKey: ['emailLogs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailLog[];
    },
    enabled: !!user?.id,
  });

  const addEmailLog = useMutation({
    mutationFn: async (emailLog: EmailLogInsert) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Parse the message
      const parsed = parsePaymentMessage(emailLog.raw_message);

      const { data, error } = await supabase
        .from('email_logs')
        .insert({
          landlord_id: user.id,
          raw_message: emailLog.raw_message,
          parsed_amount: parsed.amount,
          parsed_house_no: parsed.houseNo,
          parsed_tenant_name: parsed.tenantName,
          parsed_mpesa_ref: parsed.mpesaRef,
          parsed_date: parsed.paymentDate,
          status: parsed.isValid ? 'pending' : 'failed',
          error_message: parsed.isValid ? null : 'Could not parse required fields from message',
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmailLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
      if (data.status === 'failed') {
        toast.warning('Message added but parsing failed. Please review manually.');
      } else {
        toast.success('Email log added successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to add email log: ${error.message}`);
    },
  });

  const updateEmailLog = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmailLogUpdate }) => {
      const { data: updated, error } = await supabase
        .from('email_logs')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as EmailLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
      toast.success('Email log updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update email log: ${error.message}`);
    },
  });

  const processEmailLog = useMutation({
    mutationFn: async (emailLog: EmailLog) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!emailLog.parsed_amount || !emailLog.parsed_mpesa_ref) {
        throw new Error('Missing required payment details');
      }

      // Find matching house by house_no
      let houseId: string | null = null;
      let tenantId: string | null = null;

      if (emailLog.parsed_house_no) {
        const { data: houses } = await supabase
          .from('houses')
          .select('id')
          .eq('landlord_id', user.id)
          .ilike('house_no', `%${emailLog.parsed_house_no}%`)
          .limit(1);

        if (houses && houses.length > 0) {
          houseId = houses[0].id;

          // Find tenant for this house
          const { data: tenants } = await supabase
            .from('tenants')
            .select('id')
            .eq('house_id', houseId)
            .limit(1);

          if (tenants && tenants.length > 0) {
            tenantId = tenants[0].id;
          }
        }
      }

      // Create payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          landlord_id: user.id,
          house_id: houseId,
          tenant_id: tenantId,
          amount: emailLog.parsed_amount,
          mpesa_ref: emailLog.parsed_mpesa_ref,
          payment_date: emailLog.parsed_date || new Date().toISOString(),
          sender_name: emailLog.parsed_tenant_name,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update email log status
      const { error: updateError } = await supabase
        .from('email_logs')
        .update({
          status: 'processed',
          payment_id: payment.id,
          error_message: null,
        })
        .eq('id', emailLog.id);

      if (updateError) throw updateError;

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment processed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to process payment: ${error.message}`);
    },
  });

  return {
    emailLogs: emailLogsQuery.data || [],
    isLoading: emailLogsQuery.isLoading,
    error: emailLogsQuery.error,
    addEmailLog,
    updateEmailLog,
    processEmailLog,
    refetch: emailLogsQuery.refetch,
  };
};
