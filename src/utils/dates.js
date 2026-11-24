// Shared date helpers — the CRM's business day runs on Manila time.
export const todayManila = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
