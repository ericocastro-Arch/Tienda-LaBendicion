const iconPaths = {
  cart: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="m1 1 4 4 2.7 13.4a2 2 0 0 0 2 1.6h9.9a2 2 0 0 0 1.9-1.4L23 8H6" /></>,
  box: <><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 16 4-5 3 3 6-8" /></>,
  dashboard: <><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /></>,
  report: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08A1.7 1.7 0 0 0 10.68 18.66a1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15a1.7 1.7 0 0 0-1.56-1.03h-.08v-3h.08A1.7 1.7 0 0 0 7.02 9.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.08h3v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.08v3h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
  money: <><rect width="20" height="14" x="2" y="5" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9h.01M18 15h.01" /></>,
  receipt: <><path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2Z" /><path d="M8 9h8M8 13h6" /></>,
  alert: <><path d="m10.3 2.9-8.4 14A2 2 0 0 0 3.6 20h16.8a2 2 0 0 0 1.7-3.1l-8.4-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
  tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
  scale: <><path d="m16 16 3-8 3 8a3 3 0 0 1-6 0ZM2 16l3-8 3 8a3 3 0 0 1-6 0ZM7 21h10M12 3v18M3 8h18" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  store: <><path d="M3 10v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10" /><path d="M2 10h20l-2-6H4l-2 6ZM6 22v-7h5v7M15 14h3" /><path d="M4 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /></>,
  printer: <><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></>,
};

export function Icon({ name, size = 20, className = '' }) {
  return <svg className={`app-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name] || iconPaths.dashboard}</svg>;
}

export function StoreLogo({ className = '' }) {
  return <svg className={`store-logo ${className}`} viewBox="0 0 64 64" fill="none" aria-label="La Bendición"><defs><linearGradient id="logo-gradient" x1="8" y1="8" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#F7E9FF"/><stop offset="1" stopColor="#D7B7FF"/></linearGradient></defs><path d="M10 27.5V51a5 5 0 0 0 5 5h34a5 5 0 0 0 5-5V27.5" fill="url(#logo-gradient)"/><path d="M8 27.5h48L51.5 14H12.5L8 27.5Z" fill="#FFF9FF"/><path d="M12 27.5a7 7 0 0 0 13 0 7 7 0 0 0 14 0 7 7 0 0 0 13 0" stroke="#6C45B9" strokeWidth="3.2" strokeLinecap="round"/><path d="M22 56V39h12v17M40 39h6v7h-6z" stroke="#6C45B9" strokeWidth="3.2" strokeLinejoin="round"/><path d="m32 8 2.3 4.7L39.5 13l-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.3L32 8Z" fill="#F5B6D0" stroke="#6C45B9" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}
