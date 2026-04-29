const KEY = '__cw_address_book__';

export interface Contact {
  id: string;
  name: string;
  address: string;
  note?: string;
  addedAt: number;
}

export function loadContacts(): Contact[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

function save(contacts: Contact[]) {
  localStorage.setItem(KEY, JSON.stringify(contacts));
}

export function addContact(contact: Omit<Contact, 'id' | 'addedAt'>): Contact[] {
  const contacts = loadContacts();
  contacts.push({ ...contact, id: crypto.randomUUID(), addedAt: Date.now() });
  save(contacts);
  return contacts;
}

export function updateContact(id: string, patch: Partial<Omit<Contact, 'id' | 'addedAt'>>): Contact[] {
  const contacts = loadContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx >= 0) contacts[idx] = { ...contacts[idx], ...patch };
  save(contacts);
  return contacts;
}

export function deleteContact(id: string): Contact[] {
  const contacts = loadContacts().filter(c => c.id !== id);
  save(contacts);
  return contacts;
}

export function findContact(address: string): Contact | undefined {
  return loadContacts().find(c => c.address.toLowerCase() === address.toLowerCase());
}
