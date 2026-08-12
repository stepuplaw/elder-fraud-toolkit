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
export type FraudPreventionCategory = 'Credit Bureau Freeze' | 'Other Freeze Registries' | 'Opt Out and Do Not Call' | 'Government' | 'Report Fraud or Abuse';
export interface FraudPreventionContact {
    id: string;
    name: string;
    /** 10-digit US number, digits only. */
    phone: string;
    category: FraudPreventionCategory;
    note?: string;
}
export declare const FRAUD_PREVENTION_CONTACTS: FraudPreventionContact[];
/** A `tel:` href for a contact, safe to drop straight into an `<a href>`. */
export declare function telHref(contact: FraudPreventionContact): string;
/** The phone number formatted as `(888) 298-0045`. */
export declare function formatPhone(contact: FraudPreventionContact): string;
/**
 * Builds one .vcf file containing all (or a chosen subset of) fraud-
 * prevention contacts — importable into Contacts in a single tap on iOS,
 * Android, macOS, and Windows.
 */
export declare function buildFraudPreventionVCard(contacts?: FraudPreventionContact[]): string;
