import disposableDomains from 'disposable-email-domains';

// Curated, actively-maintained list of ~3,000 known disposable/throwaway email
// domains (Yopmail, Mailinator, Guerrilla Mail, 10 Minute Mail, etc.) — NOT a
// restriction on real providers like Gmail, Outlook/Hotmail, or Yahoo.
const disposableSet = new Set(disposableDomains.map(d => d.toLowerCase()));

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  return disposableSet.has(domain);
}
