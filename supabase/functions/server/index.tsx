import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TABLE = 'kv_store_68baa523';

const getKey = async <T,>(key: string): Promise<T[]> => {
  const { data } = await supabase.from(TABLE).select('value').eq('key', key).single();
  return (data?.value as T[]) ?? [];
};

const putKey = async (key: string, value: unknown) => {
  await supabase.from(TABLE).upsert({ key, value }, { onConflict: 'key' });
};

const crud = <T extends { id: string }>(key: string) => {
  app.get(`/${key}`, async (c) => c.json(await getKey<T>(key)));
  app.post(`/${key}`, async (c) => {
    const payload = await c.req.json<T>();
    const rows = await getKey<T>(key);
    rows.unshift(payload);
    await putKey(key, rows);
    return c.json(payload, 201);
  });
  app.put(`/${key}/:id`, async (c) => {
    const id = c.req.param('id');
    const payload = await c.req.json<Partial<T>>();
    const rows = await getKey<T>(key);
    const next = rows.map((r) => (r.id === id ? { ...r, ...payload } : r));
    await putKey(key, next);
    return c.json({ ok: true });
  });
  app.delete(`/${key}/:id`, async (c) => {
    const id = c.req.param('id');
    const rows = await getKey<T>(key);
    await putKey(key, rows.filter((r) => r.id !== id));
    return c.json({ ok: true });
  });
};

crud('clients');
crud('transactions');
crud('cashbook');
crud('owner-capital');

const sendSMS = async (to: string, message: string) => {
  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'apiKey': process.env.AFRICAS_TALKING_API_KEY || '',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({ username: process.env.AFRICAS_TALKING_USERNAME || 'william_main_user', to, message, from: 'ATTech' })
  });
  return res.json();
};

app.post('/sms/:type', async (c) => {
  try {
    const { to, message } = await c.req.json<{ to: string; message: string }>();
    const data = await sendSMS(to, message);
    return c.json({ ok: true, data });
  } catch (error) {
    console.error('SMS failed', error);
    return c.json({ ok: false }, 500);
  }
});

export default app;
