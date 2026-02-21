import { useEffect, useMemo, useState } from 'react';
import type { AppState, CashbookEntry, Client, OwnerCapitalTransaction, SessionUser, Transaction } from './types';
import { formatDate, formatTime, makeId, normalizePhoneNumber } from './utils';

const KEY = 'texas-finance-state';
const USER_KEY = 'texas-finance-user';

const defaultState: AppState = { clients: [], transactions: [], cashbook: [], ownerCapital: [] };

export const useAppStore = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : defaultState;
  });
  const [user, setUser] = useState<SessionUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(state)), [state]);
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const kpis = useMemo(() => {
    const activeClients = state.clients.filter((c) => c.status === 'Active').length;
    const totalLent = state.clients.reduce((s, c) => s + c.loanAmount, 0);
    const outstanding = state.clients.reduce((s, c) => s + c.outstandingBalance, 0);
    const collected = state.transactions.reduce((s, t) => s + t.amount, 0);
    return { activeClients, totalLent, outstanding, collected, activeLoans: activeClients };
  }, [state]);

  const login = (email: string) => setUser({ email, role: email === 'william@boss.com' ? 'owner' : 'staff' });

  const addClient = (client: Omit<Client, 'id' | 'processingFee' | 'totalPayable' | 'totalPaid' | 'outstandingBalance' | 'status' | 'currentLoanNumber' | 'totalLoansCompleted'>) => {
    const amount = client.loanAmount;
    const totalPayable = amount * 1.2;
    const newClient: Client = {
      ...client,
      id: makeId(),
      phoneNumber: normalizePhoneNumber(client.phoneNumber),
      guarantorPhone: normalizePhoneNumber(client.guarantorPhone),
      processingFee: 10000,
      totalPayable,
      totalPaid: 0,
      outstandingBalance: totalPayable,
      status: 'Active',
      currentLoanNumber: 1,
      totalLoansCompleted: 0
    };
    const now = new Date();
    const disb: CashbookEntry = {
      id: makeId(), date: formatDate(now), time: formatTime(now), description: `Loan disbursement - ${newClient.fullName}`,
      type: 'Expense', amount: newClient.loanAmount, status: 'Disbursement', enteredBy: client.addedBy
    };
    const fee: CashbookEntry = {
      id: makeId(), date: formatDate(now), time: formatTime(now), description: `Processing fee - ${newClient.fullName}`,
      type: 'Income', amount: 10000, status: 'Income', enteredBy: client.addedBy
    };
    setState((s) => ({ ...s, clients: [newClient, ...s.clients], cashbook: [fee, disb, ...s.cashbook] }));
  };

  const recordPayment = (clientId: string, amount: number, notes: string, recordedBy: string) => {
    const now = new Date();
    setState((s): AppState => {
      const clients: Client[] = s.clients.map((c): Client => {
        if (c.id !== clientId) return c;
        const totalPaid = c.totalPaid + amount;
        const outstandingBalance = Math.max(c.totalPayable - totalPaid, 0);
        const status: Client['status'] = outstandingBalance === 0 ? 'Completed' : 'Active';
        return { ...c, totalPaid, outstandingBalance, status };
      });
      const client = clients.find((c) => c.id === clientId);
      if (!client) return s;
      const tx: Transaction = {
        id: makeId(), clientId, clientName: client.fullName, date: formatDate(now), time: formatTime(now), amount,
        notes, status: 'Paid', recordedBy, loanNumber: client.currentLoanNumber
      };
      const cb: CashbookEntry = {
        id: makeId(), date: tx.date, time: tx.time, description: `Loan repayment - ${client.fullName}`,
        type: 'Income', amount, status: 'Paid', enteredBy: recordedBy
      };
      return { ...s, clients, transactions: [tx, ...s.transactions], cashbook: [cb, ...s.cashbook] };
    });
  };

  const addOwnerCapital = (type: OwnerCapitalTransaction['type'], amount: number, notes: string, recordedBy: string) => {
    const now = new Date();
    const capital: OwnerCapitalTransaction = { id: makeId(), date: formatDate(now), time: formatTime(now), type, amount, notes, recordedBy };
    const entry: CashbookEntry = {
      id: makeId(), date: capital.date, time: capital.time,
      description: `Owner Capital ${type} - ${notes}`,
      type: type === 'Injection' ? 'Income' : 'Expense', amount,
      status: type === 'Injection' ? 'Income' : 'Expense', enteredBy: recordedBy
    };
    setState((s) => ({ ...s, ownerCapital: [capital, ...s.ownerCapital], cashbook: [entry, ...s.cashbook] }));
  };

  return { state, user, setUser, login, kpis, addClient, recordPayment, addOwnerCapital };
};
