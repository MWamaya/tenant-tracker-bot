import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
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
      return apiClient.get<EmailLog[]>('/api/email-logs');
    },
    enabled: !!user?.id,
  });

  const addEmailLog = useMutation({
    mutationFn: async (emailLog: EmailLogInsert) => {
      if (!user?.id) throw new Error('User not authenticated');
      const parsed = parsePaymentMessage(emailLog.raw_message);
      return apiClient.post<EmailLog>('/api/email-logs', {
        raw_message: emailLog.raw_message,
        parsed_amount: parsed.amount,
        parsed_house_no: parsed.houseNo,
        parsed_tenant_name: parsed.tenantName,
        parsed_mpesa_ref: parsed.mpesaRef,
        parsed_date: parsed.paymentDate,
        status: parsed.isValid ? 'pending' : 'failed',
        error_message: parsed.isValid ? null : 'Could not parse required fields from message',
      });
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
      return apiClient.put<EmailLog>(`/api/email-logs/${id}`, data);
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
      return apiClient.post(`/api/email-logs/${emailLog.id}/process`);
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
