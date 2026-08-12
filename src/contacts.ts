/**
 * The phone-only side of elder fraud prevention: every hotline and
 * opt-out line that a person can act on with a single call, with no
 * letter needed. Meant to be one tap away, however someone is looking
 * at the page — a `tel:` link on a phone, a downloadable vCard that
 * imports every number into Contacts in one shot on desktop or mobile,
 * or a QR code so someone on a desktop can hand the call off to a phone
 * that actually has a dial pad.
 *
 * All data here comes straight from the firm's own client-facing fraud
 * sheet (verified against each agency's own published number).
 */

export type FraudPreventionCategory =
  | 'Credit Bureau Freeze'
  | 'Other Freeze Registries'
  | 'Opt Out and Do Not Call'
  | 'Government'
  | 'Report Fraud or Abuse';

export interface FraudPreventionContact {
  id: string;
  name: string;
  /** 10-digit US number, digits only. */
  phone: string;
  category: FraudPreventionCategory;
  note?: string;
}

export const FRAUD_PREVENTION_CONTACTS: FraudPreventionContact[] = [
  { id: 'equifax', name: 'Equifax Security Freeze', phone: '8882980045', category: 'Credit Bureau Freeze' },
  { id: 'experian', name: 'Experian Security Freeze', phone: '8883973742', category: 'Credit Bureau Freeze' },
  { id: 'transunion', name: 'TransUnion Credit Freeze', phone: '8889098872', category: 'Credit Bureau Freeze' },
  {
    id: 'innovis',
    name: 'Innovis',
    phone: '8005402505',
    category: 'Other Freeze Registries',
    note: 'A fourth, lesser-known credit bureau',
  },
  {
    id: 'chexsystems',
    name: 'ChexSystems',
    phone: '8008877652',
    category: 'Other Freeze Registries',
    note: 'Screens applications for new bank accounts',
  },
  {
    id: 'nctue',
    name: 'NCTUE',
    phone: '8663495355',
    category: 'Other Freeze Registries',
    note: 'Covers utility, phone, and cable applications',
  },
  {
    id: 'lexisnexis',
    name: 'LexisNexis Risk Solutions',
    phone: '8004561244',
    category: 'Other Freeze Registries',
    note: 'Supplies consumer data to insurers and lenders',
  },
  {
    id: 'optoutprescreen',
    name: 'Opt Out of Prescreened Offers',
    phone: '8885678688',
    category: 'Opt Out and Do Not Call',
    note: 'Removes you from prescreened credit card and insurance lists for five years',
  },
  { id: 'donotcall', name: 'National Do Not Call Registry', phone: '8883821222', category: 'Opt Out and Do Not Call' },
  {
    id: 'ssa',
    name: 'Social Security Administration',
    phone: '8007721213',
    category: 'Government',
    note: 'Ask to block electronic access to your account',
  },
  {
    id: 'fl-abuse-hotline',
    name: 'Florida Abuse Hotline',
    phone: '8009622873',
    category: 'Report Fraud or Abuse',
    note: 'Report exploitation of a vulnerable adult, day or night',
  },
  {
    id: 'doj-elder-fraud',
    name: 'National Elder Fraud Hotline (DOJ)',
    phone: '8333728311',
    category: 'Report Fraud or Abuse',
  },
  {
    id: 'aarp-fraud-watch',
    name: 'AARP Fraud Watch Helpline',
    phone: '8779083360',
    category: 'Report Fraud or Abuse',
    note: 'No AARP membership needed',
  },
  {
    id: 'fl-ag-fraud',
    name: 'Florida Attorney General Fraud Line',
    phone: '8669667226',
    category: 'Report Fraud or Abuse',
  },
  {
    id: 'medicare-patrol',
    name: 'Senior Medicare Patrol',
    phone: '8778082468',
    category: 'Report Fraud or Abuse',
    note: 'Report Medicare billing that looks wrong',
  },
];

/** A `tel:` href for a contact, safe to drop straight into an `<a href>`. */
export function telHref(contact: FraudPreventionContact): string {
  return `tel:+1${contact.phone}`;
}

/** The phone number formatted as `(888) 298-0045`. */
export function formatPhone(contact: FraudPreventionContact): string {
  const d = contact.phone;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function escapeVCardText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function vCardEntry(contact: FraudPreventionContact): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardText(contact.name)};;;;`,
    `FN:${escapeVCardText(contact.name)}`,
    `TEL;TYPE=WORK,VOICE:+1${contact.phone}`,
    `ORG:${escapeVCardText(contact.category)}`,
  ];
  if (contact.note) lines.push(`NOTE:${escapeVCardText(contact.note)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/**
 * Builds one .vcf file containing all (or a chosen subset of) fraud-
 * prevention contacts — importable into Contacts in a single tap on iOS,
 * Android, macOS, and Windows.
 */
export function buildFraudPreventionVCard(contacts: FraudPreventionContact[] = FRAUD_PREVENTION_CONTACTS): string {
  return contacts.map(vCardEntry).join('\r\n');
}
