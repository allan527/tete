import { useMemo, useState } from 'react';
import { createBrowserRouter, Link, Navigate, Outlet, RouterProvider, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Banknote, CheckCircle, LayoutDashboard, Users, Wallet } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useAppStore } from './lib/store';
import { formatDate, formatUGX } from './lib/utils';
import './styles.css';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`glass rounded-xl p-4 shadow-md ${className}`}>{children}</div>;
const Btn = ({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button className={`rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 ${className}`} {...props}>{children}</button>;

function Root() {
  const store = useAppStore();
  if (!store.user) return <Login onLogin={store.login} />;
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-slate-800 p-4 text-white">
        <h1 className="mb-8 text-2xl font-bold" style={{ fontFamily: 'Sora' }}>Texas Finance</h1>
        <nav className="space-y-2">
          {[
            ['/', 'Dashboard'], ['/clients', 'Clients'], ['/loans', 'Loans'], ['/transactions', 'Transactions'], ['/cashbook', 'Cashbook'], ['/owner-capital', 'Owner Capital'], ['/evaluation', 'Evaluation'], ['/data-view', 'Data View']
          ].map(([to, label]) => <Link key={to} className="block rounded-lg px-3 py-2 hover:bg-violet-500/30" to={to}>{label}</Link>)}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet context={store} />
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}

function Login({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState('william@boss.com');
  return <div className="grid min-h-screen place-items-center"><Card className="w-full max-w-md"><h2 className="mb-4 text-xl font-bold">Login</h2><input className="w-full rounded border p-2" value={email} onChange={(e) => setEmail(e.target.value)} /><Btn className="mt-4 w-full bg-violet-600 text-white" onClick={() => onLogin(email)}>Enter Dashboard</Btn></Card></div>;
}

function Dashboard({ store }: any) {
  const { kpis, state } = store;
  const cards = [
    ['Active Clients', kpis.activeClients, 'from-emerald-500 to-emerald-600', Users],
    ['Total Active Loans', kpis.activeLoans, 'from-blue-500 to-blue-600', LayoutDashboard],
    ['Total Money Lent', formatUGX(kpis.totalLent), 'from-violet-500 to-violet-600', Banknote],
    ['Outstanding Balance', formatUGX(kpis.outstanding), 'from-orange-500 to-orange-600', AlertCircle],
    ['Money Collected', formatUGX(kpis.collected), 'from-green-500 to-green-600', CheckCircle]
  ];
  return <div className="space-y-5"><h2 className="text-2xl font-bold">Dashboard</h2><div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">{cards.map(([l,v,g,Icon]: any)=><Card key={l} className={`bg-gradient-to-br ${g} text-white border-2 border-white/30`}><Icon/><p className="text-xs">{l}</p><p className="text-xl font-bold">{v}</p></Card>)}</div><Card><h3 className="mb-2 font-semibold">Recent Payments</h3>{state.transactions.slice(0,6).map((t:any)=><div className="flex justify-between border-b py-2 text-sm" key={t.id}><span>{t.date} - {t.clientName}</span><span>{formatUGX(t.amount)}</span></div>)}</Card></div>;
}

function Clients({ store }: any) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const clients = useMemo(() => store.state.clients.filter((c: any) => [c.fullName, c.phoneNumber, c.nationalId].join(' ').toLowerCase().includes(q.toLowerCase())), [q, store.state.clients]);
  return <div className="space-y-4"><div className="flex justify-between"><h2 className="text-2xl font-bold">Clients</h2><Btn className="bg-violet-600 text-white" onClick={() => nav('/clients/new')}>Add Client</Btn></div><input className="w-full rounded border p-2" placeholder="Search" value={q} onChange={(e)=>setQ(e.target.value)} /><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{clients.map((c:any)=><Card key={c.id}><p className="font-semibold">{c.fullName}</p><p className="text-xs text-slate-500">{c.phoneNumber}</p><p className="text-sm">Outstanding: {formatUGX(c.outstandingBalance)}</p><Btn className="mt-3 bg-slate-900 text-white" onClick={()=>nav(`/clients/${c.id}`)}>View</Btn></Card>)}</div></div>;
}

function AddClient({ store }: any) {
  const nav = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loanAmount, setLoanAmount] = useState(100000);
  const submit = () => {
    const start = new Date(); const end = new Date(); end.setDate(end.getDate() + 30);
    store.addClient({ fullName, phoneNumber, loanAmount, nationalId: 'NIN', location: 'Kampala', guarantorName: 'Guarantor', guarantorId: 'GID', guarantorPhone: phoneNumber, guarantorLocation: 'Kampala', startDate: formatDate(start), endDate: formatDate(end), addedBy: store.user.email });
    toast.success('Client added successfully!');
    nav('/clients');
  };
  return <Card className="max-w-xl"><h2 className="mb-3 text-xl font-bold">Add Client</h2><div className="space-y-3"><input className="w-full rounded border p-2" placeholder="Full name" value={fullName} onChange={(e)=>setFullName(e.target.value)} /><input className="w-full rounded border p-2" placeholder="Phone" value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} /><input type="number" className="w-full rounded border p-2" value={loanAmount} onChange={(e)=>setLoanAmount(Number(e.target.value))} /><Btn className="bg-violet-600 text-white" onClick={submit}>Create Loan</Btn></div></Card>;
}

function ClientDetail({ store }: any) {
  const { id } = useParams();
  const client = store.state.clients.find((c: any) => c.id === id);
  if (!client) return <Navigate to="/clients" replace />;
  return <div className="space-y-4"><Card><h2 className="text-2xl font-bold">{client.fullName}</h2><p>{client.phoneNumber} • {client.status}</p><p>Outstanding: {formatUGX(client.outstandingBalance)}</p></Card><Btn className="bg-emerald-600 text-white" onClick={()=>{store.recordPayment(client.id, Math.min(50000, client.outstandingBalance), 'Installment', store.user.email); toast.success('Payment recorded successfully!')}}>Record Payment</Btn></div>;
}

function TablePage({ title, rows }: { title: string; rows: any[] }) {
  return <div><h2 className="mb-4 text-2xl font-bold">{title}</h2><Card><pre className="overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre></Card></div>;
}

function Evaluation({ store }: any) {
  const collections = store.state.cashbook.filter((e: any) => e.type === 'Income').reduce((s: number, e: any) => s + e.amount, 0);
  const loaned = store.state.cashbook.filter((e: any) => e.status === 'Disbursement').reduce((s: number, e: any) => s + e.amount, 0);
  const expenses = store.state.cashbook.filter((e: any) => e.type === 'Expense' && e.status !== 'Disbursement').reduce((s: number, e: any) => s + e.amount, 0);
  return <div className="space-y-4"><h2 className="text-2xl font-bold">Weekly Evaluation</h2><div className="grid gap-4 md:grid-cols-3"><Card><p>Total Collections</p><p className="font-bold">{formatUGX(collections)}</p></Card><Card><p>Amount Loaned</p><p className="font-bold">{formatUGX(loaned)}</p></Card><Card><p>Total Expenses</p><p className="font-bold">{formatUGX(expenses)}</p></Card></div></div>;
}

function GuardOwner({ store, children }: any) {
  return store.user.role === 'owner' ? children : <Card><p>Access denied: Owner only</p></Card>;
}

function Wrapper({ element }: any) {
  return <Outlet context={element} />;
}

const App = () => {
  const store = useAppStore();
  const router = createBrowserRouter([
    {
      path: '/', element: <Root />, children: [
        { index: true, element: <Dashboard store={store} /> },
        { path: 'clients', element: <Clients store={store} /> },
        { path: 'clients/new', element: <AddClient store={store} /> },
        { path: 'clients/:id', element: <ClientDetail store={store} /> },
        { path: 'loans', element: <TablePage title="Loans" rows={store.state.clients} /> },
        { path: 'transactions', element: <TablePage title="Transactions" rows={store.state.transactions} /> },
        { path: 'cashbook', element: <TablePage title="Cashbook" rows={store.state.cashbook} /> },
        { path: 'owner-capital', element: <TablePage title="Owner Capital" rows={store.state.ownerCapital} /> },
        { path: 'evaluation', element: <Evaluation store={store} /> },
        { path: 'data-view', element: <GuardOwner store={store}><TablePage title="Data View" rows={store.state} /></GuardOwner> }
      ]
    }
  ]);
  return <RouterProvider router={router} />;
};

export default App;
