// Mock data for the Rent Collection Tracker

export interface House {
  id: string;
  houseNo: string;
  expectedRent: number;
  tenant?: Tenant;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  secondaryPhone?: string;
  houseId: string;
}

export interface Payment {
  id: string;
  amount: number;
  mpesaRef: string;
  date: string;
  houseId: string;
  tenantId: string;
  tenantName: string;
  houseNo: string;
}

export interface Balance {
  houseId: string;
  houseNo: string;
  month: string;
  expectedRent: number;
  paidAmount: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
}

export const houses: House[] = [
  { id: '1', houseNo: '212245 A1', expectedRent: 8000 },
  { id: '2', houseNo: '212245 A2', expectedRent: 8000 },
  { id: '3', houseNo: '212245 B1', expectedRent: 10000 },
  { id: '4', houseNo: '212245 B2', expectedRent: 10000 },
  { id: '5', houseNo: '212245 C1', expectedRent: 12000 },
  { id: '6', houseNo: '212245 C2', expectedRent: 12000 },
  { id: '7', houseNo: '212245 D1', expectedRent: 15000 },
  { id: '8', houseNo: '212245 D2', expectedRent: 15000 },
];

export const tenants: Tenant[] = [
  { id: '1', name: 'Beatrice Adhiambo', phone: '0791234635', houseId: '4' },
  { id: '2', name: 'John Kamau', phone: '0722345678', houseId: '1' },
  { id: '3', name: 'Mary Wanjiku', phone: '0733456789', houseId: '2' },
  { id: '4', name: 'Peter Omondi', phone: '0744567890', houseId: '3' },
  { id: '5', name: 'Grace Muthoni', phone: '0755678901', houseId: '5' },
  { id: '6', name: 'David Kipchoge', phone: '0766789012', houseId: '6' },
  { id: '7', name: 'Sarah Akinyi', phone: '0777890123', houseId: '7' },
];

export const payments: Payment[] = [
  { id: '1', amount: 10000, mpesaRef: 'TLC5B0WSBC', date: '2025-01-12T20:01:00', houseId: '4', tenantId: '1', tenantName: 'Beatrice Adhiambo', houseNo: '212245 B2' },
  { id: '2', amount: 8000, mpesaRef: 'TLC5B1XYZD', date: '2025-01-10T14:30:00', houseId: '1', tenantId: '2', tenantName: 'John Kamau', houseNo: '212245 A1' },
  { id: '3', amount: 5000, mpesaRef: 'TLC5B2ABCE', date: '2025-01-08T09:15:00', houseId: '2', tenantId: '3', tenantName: 'Mary Wanjiku', houseNo: '212245 A2' },
  { id: '4', amount: 10000, mpesaRef: 'TLC5B3DEFG', date: '2025-01-05T16:45:00', houseId: '3', tenantId: '4', tenantName: 'Peter Omondi', houseNo: '212245 B1' },
  { id: '5', amount: 12000, mpesaRef: 'TLC5B4GHIJ', date: '2025-01-03T11:20:00', houseId: '5', tenantId: '5', tenantName: 'Grace Muthoni', houseNo: '212245 C1' },
  { id: '6', amount: 8000, mpesaRef: 'TLC5B5KLMN', date: '2024-12-28T13:00:00', houseId: '6', tenantId: '6', tenantName: 'David Kipchoge', houseNo: '212245 C2' },
  { id: '7', amount: 15000, mpesaRef: 'TLC5B6OPQR', date: '2024-12-25T10:30:00', houseId: '7', tenantId: '7', tenantName: 'Sarah Akinyi', houseNo: '212245 D1' },
];

export const balances: Balance[] = [
  { houseId: '1', houseNo: '212245 A1', month: '2025-01', expectedRent: 8000, paidAmount: 8000, balance: 0, status: 'paid' },
  { houseId: '2', houseNo: '212245 A2', month: '2025-01', expectedRent: 8000, paidAmount: 5000, balance: 3000, status: 'partial' },
  { houseId: '3', houseNo: '212245 B1', month: '2025-01', expectedRent: 10000, paidAmount: 10000, balance: 0, status: 'paid' },
  { houseId: '4', houseNo: '212245 B2', month: '2025-01', expectedRent: 10000, paidAmount: 10000, balance: 0, status: 'paid' },
  { houseId: '5', houseNo: '212245 C1', month: '2025-01', expectedRent: 12000, paidAmount: 12000, balance: 0, status: 'paid' },
  { houseId: '6', houseNo: '212245 C2', month: '2025-01', expectedRent: 12000, paidAmount: 8000, balance: 4000, status: 'partial' },
  { houseId: '7', houseNo: '212245 D1', month: '2025-01', expectedRent: 15000, paidAmount: 15000, balance: 0, status: 'paid' },
  { houseId: '8', houseNo: '212245 D2', month: '2025-01', expectedRent: 15000, paidAmount: 0, balance: 15000, status: 'unpaid' },
];

export const getDashboardStats = () => {
  const totalHouses = houses.length;
  const paidHouses = balances.filter(b => b.status === 'paid').length;
  const partialHouses = balances.filter(b => b.status === 'partial').length;
  const unpaidHouses = balances.filter(b => b.status === 'unpaid').length;
  const totalExpected = balances.reduce((sum, b) => sum + b.expectedRent, 0);
  const totalCollected = balances.reduce((sum, b) => sum + b.paidAmount, 0);
  const totalOutstanding = balances.reduce((sum, b) => sum + b.balance, 0);
  
  return {
    totalHouses,
    paidHouses,
    partialHouses,
    unpaidHouses,
    totalExpected,
    totalCollected,
    totalOutstanding,
    collectionRate: Math.round((totalCollected / totalExpected) * 100),
  };
};

// Message parser utility
export const parsePaymentMessage = (message: string) => {
  // Example: "Dear MICHAEL O a transaction of KES 5,000.00 for 212245 B2 has been received from BEATRICE ADHIAMBO 079****635 on 12/12/2025 08:01 PM. M-Pesa Ref: TLC5B0WSBC. NCBA, Go for it."
  
  const amountMatch = message.match(/KES\s*([\d,]+\.?\d*)/i);
  const houseMatch = message.match(/for\s+(\d+\s*[A-Z]\d+)/i);
  const nameMatch = message.match(/from\s+([A-Z\s]+)\s+\d{3}/i);
  const refMatch = message.match(/M-Pesa Ref:\s*(\w+)/i);
  const dateMatch = message.match(/on\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*[AP]M)/i);
  
  return {
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    houseNo: houseMatch ? houseMatch[1].trim() : null,
    tenantName: nameMatch ? nameMatch[1].trim() : null,
    mpesaRef: refMatch ? refMatch[1] : null,
    date: dateMatch ? dateMatch[1] : null,
  };
};
