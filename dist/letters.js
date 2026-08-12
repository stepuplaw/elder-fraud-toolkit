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
const CAPACITY_LABEL = {
    'power-of-attorney': 'agent under a valid durable power of attorney',
    guardian: 'court-appointed guardian',
    conservator: 'court-appointed conservator',
};
const AUTHORITY_DOCUMENT_LABEL = {
    'power-of-attorney': 'durable power of attorney',
    guardian: 'letters of guardianship',
    conservator: 'letters of conservatorship',
};
const BUREAU_SPECS = {
    Equifax: {
        self: {
            mailingAddress: ['Equifax Information Services LLC', 'P.O. Box 105788', 'Atlanta, GA 30348-5788'],
            enclosures: [
                'A copy of one document showing your Social Security number, meaning your Social Security card, a pay stub that shows the number, or a W2 or 1099',
                'A copy of one document showing your current address, such as a driver license, a lease or deed, a pay stub, or a utility or phone bill',
            ],
            caution: 'Equifax routes every mail request to its own form and never says a plain letter is enough, so enclose the Equifax security freeze request form with this letter. Equifax also does not accept a driver license as proof of identity, only as proof of address, so the identity document has to show the Social Security number.',
        },
        fiduciary: {
            mailingAddress: ['Equifax Information Services LLC', 'P.O. Box 105788', 'Atlanta, GA 30348-5788'],
            caution: 'Equifax calls this an Incapacitated Adult freeze rather than a protected consumer freeze, and publishes a form for it, so enclose that form too. Equifax is the only bureau that requires both the Social Security card and the birth certificate of the person being protected.',
        },
    },
    Experian: {
        self: {
            mailingAddress: ['Experian Security Freeze', 'P.O. Box 9554', 'Allen, TX 75013'],
            enclosures: [
                'A copy of a government-issued photo ID, such as a driver license',
                'A copy of a utility bill or bank statement showing your name, current mailing address, and issue date',
            ],
            caution: 'Experian accepts a plain letter, and wants the Social Security number, date of birth, and every address from the past two years in the letter itself. Fill in those blanks before mailing.',
        },
        fiduciary: {
            // Same box, different addressee line. Experian publishes no "ATTN: Protected
            // Consumer" line anywhere, despite that string circulating widely.
            mailingAddress: ['Experian', 'PO Box 9554', 'Allen, TX 75013'],
            caution: 'Experian is the gap in this process. The only mail procedure it publishes covers minors and court-appointed guardians, and it publishes nothing for a power of attorney or an adult conservatorship. Call Experian at (888) 397-3742 before mailing and ask where to send it. This letter is the right request, but the address may not be.',
        },
    },
    TransUnion: {
        self: {
            mailingAddress: ['TransUnion', 'P.O. Box 160', 'Woodlyn, PA 19094'],
            enclosures: [
                'Nothing is required. TransUnion asks only for your name, address, and Social Security number in the letter itself',
                'Optional, and it helps them find the file faster: one proof of identity and two proofs of current address',
            ],
            caution: 'TransUnion is the lightest of the three by mail. No form, no mandatory enclosures, and P.O. Box 160 for your own freeze. Do not send this one to Box 380.',
        },
        fiduciary: {
            mailingAddress: ['TransUnion', 'P.O. Box 380', 'Woodlyn, PA 19094'],
            caution: 'Box 380 is the protected consumer address, covering a minor or an incapacitated adult. If the person can still manage their own affairs and you are simply acting under a power of attorney, TransUnion publishes a different address for that, P.O. Box 2000, Chester, PA 19016. Send copies only, never originals.',
        },
    },
};
/** Enclosures for a fiduciary request. Each bureau wants a different set. */
function fiduciaryEnclosures(bureau, authorityDoc, personName) {
    switch (bureau) {
        case 'Equifax':
            return [
                `A copy of your ${authorityDoc}`,
                'A copy of your own identification',
                `A copy of the Social Security card of ${personName}`,
                `A copy of the birth certificate of ${personName}`,
            ];
        case 'Experian':
            return [
                'A copy of your government-issued photo ID',
                'Proof of your address, such as a bank statement, utility bill, or insurance statement',
                `A copy of your ${authorityDoc}`,
            ];
        case 'TransUnion':
            return [
                `A copy of your ${authorityDoc}`,
                `Proof of identification for ${personName}, meaning a Social Security card, a certified birth certificate, or a government-issued ID`,
                'Proof of identification for the person signing below',
            ];
    }
}
/**
 * Two of the three bureaus want a Social Security number on a mailed request.
 * This library will not collect one, so the letter carries a blank line and the
 * number is written on the paper by hand, where it never touches a computer.
 * Do not replace this with a field.
 */
const SSN_LINE = 'Social Security number: ____________________';
function formatAddress(a) {
    const line2 = a.line2 ? `${a.line2}, ` : '';
    return `${a.line1}, ${line2}${a.city}, ${a.state} ${a.zip}`;
}
export function formatDate(d) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
const BUREAUS = ['Equifax', 'Experian', 'TransUnion'];
function buildSelfLetters(input) {
    const dobLine = input.person.dateOfBirth ? `Date of birth: ${input.person.dateOfBirth}` : undefined;
    return BUREAUS.map((bureau) => {
        const spec = BUREAU_SPECS[bureau].self;
        const paragraphs = [
            `I am requesting a security freeze on my own credit file under the Fair Credit Reporting Act, 15 U.S.C. § 1681c-1.`,
            `Please place a security freeze on my file effective immediately, and send written confirmation, along with the PIN or password I will need to lift it later, to the address below.`,
            [
                input.person.name,
                formatAddress(input.person.address),
                dobLine,
                SSN_LINE,
                'Addresses for the past two years: ____________________',
            ]
                .filter(Boolean)
                .join('\n'),
        ];
        return {
            bureau,
            mailingAddress: spec.mailingAddress,
            subject: `Request for a Security Freeze, ${input.person.name}`,
            paragraphs,
            enclosures: spec.enclosures,
            caution: spec.caution,
        };
    });
}
function buildFiduciaryLetters(input) {
    const capacityLabel = CAPACITY_LABEL[input.fiduciary.capacity];
    const authorityDoc = AUTHORITY_DOCUMENT_LABEL[input.fiduciary.capacity];
    const isFlorida = input.protectedPerson.address.state.trim().toUpperCase() === 'FL';
    const authorityDateClause = input.authorityDocumentDate ? ` dated ${input.authorityDocumentDate}` : '';
    const statuteClause = isFlorida
        ? 'under 15 U.S.C. § 1681c-1 and Fla. Stat. § 501.0051'
        : 'under 15 U.S.C. § 1681c-1';
    const dobLine = input.protectedPerson.dateOfBirth ? `Date of birth: ${input.protectedPerson.dateOfBirth}` : undefined;
    return BUREAUS.map((bureau) => {
        const spec = BUREAU_SPECS[bureau].fiduciary;
        const paragraphs = [
            `I am writing ${statuteClause} to request a security freeze on the credit file of ${input.protectedPerson.name}, who is unable to place this freeze themselves. I am acting as their ${capacityLabel}${authorityDateClause}, and I have enclosed a copy of my ${authorityDoc}.`,
            `Please place a security freeze on this consumer's file effective immediately, and send written confirmation to the address below. I have enclosed the documents listed at the end of this letter. Please let me know if any further documentation is required.`,
            [input.protectedPerson.name, formatAddress(input.protectedPerson.address), dobLine, SSN_LINE]
                .filter(Boolean)
                .join('\n'),
        ];
        return {
            bureau,
            mailingAddress: spec.mailingAddress,
            subject: `Request for a Protected Consumer Security Freeze on Behalf of ${input.protectedPerson.name}`,
            paragraphs,
            enclosures: fiduciaryEnclosures(bureau, authorityDoc, input.protectedPerson.name),
            caution: spec.caution,
        };
    });
}
/**
 * Builds three freeze-request letters, one per major credit bureau.
 * Pass `mode: 'self'` for someone freezing their own file, or
 * `mode: 'fiduciary'` for a guardian/conservator/POA agent acting for
 * someone who can't.
 */
export function buildFreezeLetters(input) {
    return input.mode === 'self' ? buildSelfLetters(input) : buildFiduciaryLetters(input);
}
function signatureFor(input) {
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
export function renderLetterHtml(letter, input) {
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
export function renderLettersDocument(input) {
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
