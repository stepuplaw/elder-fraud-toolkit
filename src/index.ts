/**
 * Protected consumer / fiduciary credit-freeze letter generator.
 *
 * When someone loses the ability to manage their own finances, federal law
 * still lets a guardian, conservator, or power-of-attorney agent freeze
 * their credit file so no one can open new accounts in their name — but
 * the three major bureaus only accept that request by mail, and each wants
 * a slightly different package. This library fills in one letter per
 * bureau from a name and an address, with the correct mailing address for
 * each bureau's *protected consumer* freeze process (not the address you'd
 * use for your own ordinary freeze — TransUnion in particular uses a
 * different P.O. box for the two processes).
 *
 * Grounded in 15 U.S.C. § 1681c-1 (the federal statute requiring the
 * bureaus to honor a free freeze requested on behalf of an adult who can't
 * act for themselves) and, for Florida residents, Fla. Stat. § 501.0051.
 *
 * This library never asks for or handles a Social Security number. Bureaus
 * verify identity from copies of ID you enclose in the envelope, not from
 * anything typed into a form — so nothing this library touches is more
 * sensitive than a name and a mailing address, and none of it leaves the
 * browser (there is no network call anywhere in this package).
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

export interface FreezeLetterInput {
  /** The person the freeze protects. */
  protectedPerson: {
    name: string;
    address: Address;
    /**
     * Optional, free text (e.g. "March 14, 1940"). Never collect a full
     * Social Security number here or anywhere in a form built on this
     * library — it is not needed for the letter and should only travel as
     * a physical copy enclosed in the envelope.
     */
    dateOfBirth?: string;
  };
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

export type Bureau = 'Equifax' | 'Experian' | 'TransUnion';

export interface FreezeLetter {
  bureau: Bureau;
  mailingAddress: string[];
  subject: string;
  paragraphs: string[];
  enclosures: string[];
}

// Protected-consumer / fiduciary freeze mailing addresses. NOTE: TransUnion
// uses P.O. Box 380 for this process, distinct from the P.O. Box 160 used
// for an individual's own freeze-by-mail request. Do not merge these.
const BUREAU_ADDRESSES: Record<Bureau, string[]> = {
  Equifax: ['Equifax Security Freeze', 'P.O. Box 105788', 'Atlanta, GA 30348'],
  Experian: ['Experian Security Freeze', 'P.O. Box 9554', 'Allen, TX 75013'],
  TransUnion: ['TransUnion Protected Consumer Freeze', 'P.O. Box 380', 'Woodlyn, PA 19094'],
};

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

function formatAddress(a: Address): string {
  const line2 = a.line2 ? `${a.line2}, ` : '';
  return `${a.line1}, ${line2}${a.city}, ${a.state} ${a.zip}`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Builds three protected-consumer freeze request letters, one per major
 * credit bureau (Equifax, Experian, TransUnion), for a fiduciary acting on
 * behalf of someone who cannot freeze their own credit file.
 */
export function buildFreezeLetters(input: FreezeLetterInput): FreezeLetter[] {
  const capacityLabel = CAPACITY_LABEL[input.fiduciary.capacity];
  const authorityDoc = AUTHORITY_DOCUMENT_LABEL[input.fiduciary.capacity];
  const isFlorida = input.protectedPerson.address.state.trim().toUpperCase() === 'FL';

  const authorityDateClause = input.authorityDocumentDate ? ` dated ${input.authorityDocumentDate}` : '';
  const statuteClause = isFlorida
    ? 'under 15 U.S.C. § 1681c-1 and Fla. Stat. § 501.0051'
    : 'under 15 U.S.C. § 1681c-1';
  const dobLine = input.protectedPerson.dateOfBirth ? `Date of birth: ${input.protectedPerson.dateOfBirth}` : undefined;

  return (Object.keys(BUREAU_ADDRESSES) as Bureau[]).map((bureau) => {
    const paragraphs = [
      `I am writing ${statuteClause} to request a security freeze on the credit file of ${input.protectedPerson.name}, who is unable to place this freeze themselves. I am acting as their ${capacityLabel}${authorityDateClause}, and I have enclosed a copy of my ${authorityDoc}.`,
      `Please place a security freeze on this consumer's file effective immediately, and send written confirmation to the address below. I have also enclosed copies of identification for both ${input.protectedPerson.name} and myself. Please let me know if any further documentation is required.`,
      [input.protectedPerson.name, formatAddress(input.protectedPerson.address), dobLine].filter(Boolean).join('\n'),
    ];

    return {
      bureau,
      mailingAddress: BUREAU_ADDRESSES[bureau],
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

/** Renders one letter as print-ready, semantic HTML. No external dependencies. */
export function renderLetterHtml(letter: FreezeLetter, input: FreezeLetterInput): string {
  const date = formatDate(input.date ?? new Date());
  const fromAddress = input.fiduciary.address ?? input.protectedPerson.address;
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
    ${input.fiduciary.name}<br>
    ${CAPACITY_LABEL[input.fiduciary.capacity]} for ${input.protectedPerson.name}<br>
    ${formatAddress(fromAddress)}${input.fiduciary.phone ? `<br>${input.fiduciary.phone}` : ''}
  </p>
  <p class="enclosures"><strong>Enclosures:</strong> ${letter.enclosures.join('; ')}</p>
</section>`.trim();
}

/** Renders all three letters as one print-ready HTML document, one page per letter. */
export function renderLettersDocument(input: FreezeLetterInput): string {
  const letters = buildFreezeLetters(input);
  const sections = letters.map((l) => renderLetterHtml(l, input)).join('\n');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Protected Consumer Freeze Letters — ${input.protectedPerson.name}</title>
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
