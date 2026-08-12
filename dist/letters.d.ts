/**
 * Credit-freeze request letters, addressed correctly for Equifax, Experian,
 * and TransUnion — for both routes a person actually needs a mailed letter
 * for:
 *
 *  - `self`: freezing your OWN file by mail, for anyone who would rather
 *    send a letter than use each bureau's online form or sit on hold.
 *    Federal law (15 U.S.C. § 1681c-1) makes this free.
 *  - `fiduciary`: a guardian, conservator, or POA agent freezing the file
 *    of someone who can no longer do it themselves. This is the "protected
 *    consumer" freeze most families never hear about, and it's mail-only
 *    at all three bureaus.
 *
 * **TransUnion uses a different P.O. box for each route** (Box 160 for an
 * individual's own freeze, Box 380 for a protected-consumer/fiduciary
 * freeze). Equifax and Experian use the same address either way. Getting
 * this wrong is a common, invisible way for a hand-written letter to land
 * on the wrong desk — this library gets it right by construction.
 *
 * @see https://stepuplaw.com/florida-elder-abuse-attorney
 */
export type FiduciaryCapacity = 'power-of-attorney' | 'guardian' | 'conservator';
export interface Address {
    line1: string;
    line2?: string;
    city: string;
    /** Two-letter USPS state code, e.g. "FL". */
    state: string;
    zip: string;
}
export interface PersonInfo {
    name: string;
    address: Address;
    /**
     * Optional, free text (e.g. "March 14, 1940"). Never collect a full
     * Social Security number here or anywhere in a form built on this
     * library — it is not needed for the letter and should only travel as
     * a physical copy enclosed in the envelope.
     */
    dateOfBirth?: string;
}
export interface SelfFreezeInput {
    mode: 'self';
    /** The person freezing their own file. */
    person: PersonInfo;
    phone?: string;
    /** Defaults to today. */
    date?: Date;
}
export interface FiduciaryFreezeInput {
    mode: 'fiduciary';
    /** The person the freeze protects. */
    protectedPerson: PersonInfo;
    /** The person acting on the protected person's behalf. */
    fiduciary: {
        name: string;
        capacity: FiduciaryCapacity;
        /** Defaults to the protected person's address if omitted. */
        address?: Address;
        phone?: string;
    };
    /** Date the authority document (POA / guardianship or conservatorship order) was signed or entered, if known. */
    authorityDocumentDate?: string;
    /** Defaults to today. */
    date?: Date;
}
export type FreezeLetterInput = SelfFreezeInput | FiduciaryFreezeInput;
export type Bureau = 'Equifax' | 'Experian' | 'TransUnion';
export interface FreezeLetter {
    bureau: Bureau;
    mailingAddress: string[];
    subject: string;
    paragraphs: string[];
    /** What that bureau wants in the envelope. Differs per bureau, by a lot. */
    enclosures: string[];
    /**
     * Guidance for the person mailing the letter, not part of the letter itself.
     * Render it on screen and keep it out of the printed page. Each bureau has
     * its own, because each one departs from the others somewhere.
     */
    caution: string;
}
export declare function formatDate(d: Date): string;
/**
 * Builds three freeze-request letters, one per major credit bureau.
 * Pass `mode: 'self'` for someone freezing their own file, or
 * `mode: 'fiduciary'` for a guardian/conservator/POA agent acting for
 * someone who can't.
 */
export declare function buildFreezeLetters(input: FreezeLetterInput): FreezeLetter[];
/** Renders one letter as print-ready, semantic HTML. No external dependencies. */
export declare function renderLetterHtml(letter: FreezeLetter, input: FreezeLetterInput): string;
/** Renders all three letters as one print-ready HTML document, one page per bureau. */
export declare function renderLettersDocument(input: FreezeLetterInput): string;
