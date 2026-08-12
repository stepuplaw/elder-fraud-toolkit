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
  enclosures: string[];
}

const CAPACITY_LABEL: Record<FiduciaryCapacity, string> = {
  'power-of-attorney': 'agent under a valid durable power of attorney',
  guardian: 'court-appointed guardian',
  conservator: 'court-appointed conservator',
};

const AUTHORITY_DOCUMENT_LABEL: Record<FiduciaryCapacity, string> = {
  'power-of-attorney': 'durable power of attorney',
  guardian: 'letters of guardianship',
  conservator: 'letters of conservatorship',
};

/** Mailing address for one bureau's freeze-by-mail process. Addressee lines match each bureau's own published wording. */
function bureauAddress(bureau: Bureau, mode: 'self' | 'fiduciary'): string[] {
  switch (bureau) {
    case 'Equifax':
      return ['Equifax Security Freeze', 'P.O. Box 105788', 'Atlanta, GA 30348'];
    case 'Experian':
      return ['Experian Security Freeze', 'P.O. Box 9554', 'Allen, TX 75013'];
    case 'TransUnion':
      // Same recipient, two different boxes depending on which process this is.
      return mode === 'fiduciary'
        ? ['TransUnion', 'P.O. Box 380', 'Woodlyn, PA 19094']
        : ['TransUnion', 'P.O. Box 160', 'Woodlyn, PA 19094'];
  }
}

function formatAddress(a: Address): string {
  const line2 = a.line2 ? `${a.line2}, ` : '';
  return `${a.line1}, ${line2}${a.city}, ${a.state} ${a.zip}`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const BUREAUS: Bureau[] = ['Equifax', 'Experian', 'TransUnion'];

function buildSelfLetters(input: SelfFreezeInput): FreezeLetter[] {
  const dobLine = input.person.dateOfBirth ? `Date of birth: ${input.person.dateOfBirth}` : undefined;

  return BUREAUS.map((bureau) => {
    const paragraphs = [
      `I am requesting a security freeze on my own credit file under the Fair Credit Reporting Act, 15 U.S.C. § 1681c-1.`,
      `Please place a security freeze on my file effective immediately, and send written confirmation, along with the PIN or password I will need to lift it later, to the address below.`,
      [input.person.name, formatAddress(input.person.address), dobLine].filter(Boolean).join('\n'),
    ];
    return {
      bureau,
      mailingAddress: bureauAddress(bureau, 'self'),
      subject: `Request for a Security Freeze — ${input.person.name}`,
      paragraphs,
      enclosures: [
        'Copy of a government-issued photo ID',
        'Proof of current address if it differs from the ID (a recent utility bill or bank statement works)',
      ],
    };
  });
}

function buildFiduciaryLetters(input: FiduciaryFreezeInput): FreezeLetter[] {
  const capacityLabel = CAPACITY_LABEL[input.fiduciary.capacity];
  const authorityDoc = AUTHORITY_DOCUMENT_LABEL[input.fiduciary.capacity];
  const isFlorida = input.protectedPerson.address.state.trim().toUpperCase() === 'FL';
  const authorityDateClause = input.authorityDocumentDate ? ` dated ${input.authorityDocumentDate}` : '';
  const statuteClause = isFlorida
    ? 'under 15 U.S.C. § 1681c-1 and Fla. Stat. § 501.0051'
    : 'under 15 U.S.C. § 1681c-1';
  const dobLine = input.protectedPerson.dateOfBirth ? `Date of birth: ${input.protectedPerson.dateOfBirth}` : undefined;

  return BUREAUS.map((bureau) => {
    const paragraphs = [
      `I am writing ${statuteClause} to request a security freeze on the credit file of ${input.protectedPerson.name}, who is unable to place this freeze themselves. I am acting as their ${capacityLabel}${authorityDateClause}, and I have enclosed a copy of my ${authorityDoc}.`,
      `Please place a security freeze on this consumer's file effective immediately, and send written confirmation to the address below. I have also enclosed copies of identification for both ${input.protectedPerson.name} and myself. Please let me know if any further documentation is required.`,
      [input.protectedPerson.name, formatAddress(input.protectedPerson.address), dobLine].filter(Boolean).join('\n'),
    ];
    return {
      bureau,
      mailingAddress: bureauAddress(bureau, 'fiduciary'),
      subject: `Request for a Protected Consumer Security Freeze on Behalf of ${input.protectedPerson.name}`,
      paragraphs,
      enclosures: [
        `Copy of ${authorityDoc}`,
        `Copy of identification for ${input.protectedPerson.name}`,
        'Copy of identification for the person signing below',
      ],
    };
  });
}

/**
 * Builds three freeze-request letters, one per major credit bureau.
 * Pass `mode: 'self'` for someone freezing their own file, or
 * `mode: 'fiduciary'` for a guardian/conservator/POA agent acting for
 * someone who can't.
 */
export function buildFreezeLetters(input: FreezeLetterInput): FreezeLetter[] {
  return input.mode === 'self' ? buildSelfLetters(input) : buildFiduciaryLetters(input);
}

function signatureFor(input: FreezeLetterInput): { name: string; capacityLine?: string; address: Address; phone?: string } {
  if (input.mode === 'self') {
    return { name: input.person.name, address: input.person.address, phone: input.phone };
  }
  return {
    name: input.fiduciary.name,
    capacityLine: `${CAPACITY_LABEL[input.fiduciary.capacity]} for ${input.protectedPerson.name}`,
    address: input.fiduciary.address ?? input.protectedPerson.address,
    phone: input.fiduciary.phone,
  };
}

/** Renders one letter as print-ready, semantic HTML. No external dependencies. */
export function renderLetterHtml(letter: FreezeLetter, input: FreezeLetterInput): string {
  const date = formatDate(input.date ?? new Date());
  const sig = signatureFor(input);
  return `
<section class="freeze-letter">
  <p class="date">${date}</p>
  <address>${letter.mailingAddress.join('<br>')}</address>
  <p class="re"><strong>Re:</strong> ${letter.subject}</p>
  <p>To Whom It May Concern:</p>
  ${letter.paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n  ')}
  <p>Sincerely,</p>
  <p class="signature-block">
    ____________________________<br>
    ${sig.name}<br>
    ${sig.capacityLine ? `${sig.capacityLine}<br>` : ''}
    ${formatAddress(sig.address)}${sig.phone ? `<br>${sig.phone}` : ''}
  </p>
  <p class="enclosures"><strong>Enclosures:</strong> ${letter.enclosures.join('; ')}</p>
</section>`.trim();
}

/** Renders all three letters as one print-ready HTML document, one page per bureau. */
export function renderLettersDocument(input: FreezeLetterInput): string {
  const letters = buildFreezeLetters(input);
  const name = input.mode === 'self' ? input.person.name : input.protectedPerson.name;
  const sections = letters.map((l) => renderLetterHtml(l, input)).join('\n');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Credit Freeze Letters — ${name}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #111; }
  .freeze-letter { max-width: 6.5in; margin: 0 auto; padding: 1in 0; page-break-after: always; }
  .freeze-letter:last-child { page-break-after: auto; }
  address { font-style: normal; margin: 1.5em 0; }
  .signature-block { margin-top: 2em; }
  .enclosures { margin-top: 1.5em; font-size: 0.95em; }
</style>
</head>
<body>
${sections}
</body>
</html>`;
}
