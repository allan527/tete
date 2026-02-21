export const formatUGX = (amount: number) => `UGX ${amount.toLocaleString('en-UG')}`;

export const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

export const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

export const normalizePhoneNumber = (phone: string) => {
  let normalized = phone.replace(/\s+/g, '');
  if (normalized.startsWith('+256')) normalized = `0${normalized.slice(4)}`;
  else if (normalized.startsWith('256')) normalized = `0${normalized.slice(3)}`;
  return normalized;
};

export const maskPhoneNumber = (phone: string) =>
  phone.length === 10 ? `${phone.substring(0, 4)} XXX XXX` : phone;

export const makeId = () => crypto.randomUUID();
