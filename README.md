# elder-fraud-toolkit

Generates the credit freeze request letters that Equifax, Experian and
TransUnion require by mail, addressed correctly for two different situations,
and turns the fraud prevention hotlines into one tap calls, a save all to
Contacts vCard, and QR codes. TypeScript, one dependency, no network calls
anywhere in it.

[![License: MIT with Attribution](https://img.shields.io/badge/License-MIT%20with%20Attribution-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Network calls](https://img.shields.io/badge/network%20calls-zero-brightgreen.svg)](#privacy-by-design)

Three ways to use it, in order of how little work they are:

1. **Just use the tool.** Free, no signup, at
   [stepuplaw.com/credit-freeze-letter-generator](https://stepuplaw.com/credit-freeze-letter-generator).
2. **Put it on your own site.** Two lines of HTML, no build step, no account.
   See [stepuplaw.com/credit-freeze-widget](https://stepuplaw.com/credit-freeze-widget).
3. **Install the library** and build your own thing on it. Below.

The demo in this repo runs at
[stepuplaw.github.io/elder-fraud-toolkit](https://stepuplaw.github.io/elder-fraud-toolkit/),
including the QR codes and the vCard.

## Why this exists

Americans over 60 reported more than $7.7 billion in fraud losses in 2025
across 201,266 complaints, an average of $38,500 each, per the FBI's Internet
Crime Complaint Center. A credit freeze closes the most common door, it is
free by federal law, and most families never place one because the version
that matters to them only works by mail.

### The freeze letters

Federal law, 15 U.S.C. §1681c-1, makes a security freeze free at all three
nationwide bureaus. Two things about it catch people out.

**A freeze is not shared between the bureaus.** Each one keeps its own file,
so freezing at Equifax does nothing at Experian or TransUnion, and no bureau
has to pass your request along. That is why this generates three letters and
not one. A fraud alert is the opposite: place one at any single bureau and
that bureau must tell the other two. The two get described together, so
people reasonably assume the one call rule covers both.

**Placing a freeze for someone who cannot do it themselves is mail only.**
That is the protected consumer freeze, and a guardian, a conservator, or an
agent under a power of attorney can place one. No bureau takes that request
by phone or web form, because it has to see the document that gives you
authority. Each bureau wants a different package in the envelope, and one of
them routes the mail to a different post office box depending on which
process you are using.

### The hotlines

The rest of a fraud prevention checklist is a list of phone numbers: bureau
freeze lines, the four other registries that decide whether someone can open
a bank account or turn on a phone in your parent's name, opt out registries,
and reporting hotlines. This ships that list plus three ways to act on it
without retyping anything. `tel:` links for one tap calling, a single vCard
that imports every number into Contacts at once, and QR codes so someone on a
desktop can hand a call to a phone.

## Privacy by design

- **Nothing this library does ever leaves the browser.** There is no network
  call anywhere in the package, no analytics, and no server.
- **The letter generator never asks for a Social Security number.** Two of
  the three bureaus do want one on a mailed request. The letters leave a
  blank line for it, so the number is written by hand on paper and never
  typed into a computer, and you should not add a field for it if you build a
  form on top of this.
- **QR codes are rendered locally** by a bundled encoder, not by a
  third party "QR generator" web API, so a phone number never round trips
  through an unrelated server to become a scannable code.
- Letter output is plain HTML meant to be printed, or piped into your own PDF
  renderer.

## Install

Not on the npm registry yet. Install from GitHub:

```bash
npm install github:stepuplaw/elder-fraud-toolkit
```

Or clone and build:

```bash
git clone https://github.com/stepuplaw/elder-fraud-toolkit.git
cd elder-fraud-toolkit
npm install
npm run build
npm test
```

To open the demo locally, serve it over http rather than opening the file
directly, because browsers block ES modules on the `file://` protocol. Run
`npx serve .` and visit `/demo/`. The build copies the QR encoder into
`demo/vendor/` and the demo's import map points at it, so the page runs with
no CDN and no network access.

## Usage

### Freeze letters

```ts
import { buildFreezeLetters, renderLettersDocument } from 'elder-fraud-toolkit';

// Someone freezing their own file:
const selfLetters = buildFreezeLetters({
  mode: 'self',
  person: {
    name: 'Jane Doe',
    address: { line1: '123 Main St', city: 'Miami', state: 'FL', zip: '33131' },
  },
});

// A POA agent, guardian, or conservator acting for someone who cannot:
const fiduciaryInput = {
  mode: 'fiduciary',
  protectedPerson: {
    name: 'Jane Doe',
    address: { line1: '123 Main St', city: 'Miami', state: 'FL', zip: '33131' },
    dateOfBirth: 'March 14, 1940', // optional
  },
  fiduciary: {
    name: 'John Doe',
    capacity: 'power-of-attorney', // or 'guardian' | 'conservator'
    phone: '555-123-4567',         // optional
  },
  authorityDocumentDate: 'January 5, 2020', // optional
};
const fiduciaryLetters = buildFreezeLetters(fiduciaryInput);

// One print ready HTML document, all three letters, one page each:
const html = renderLettersDocument(fiduciaryInput);
```

### Fraud prevention contacts

```ts
import {
  FRAUD_PREVENTION_CONTACTS,
  telHref,
  formatPhone,
  buildFraudPreventionVCard,
  qrCodeForContact,
} from 'elder-fraud-toolkit';

FRAUD_PREVENTION_CONTACTS[0];
// -> { id: 'equifax', name: 'Equifax Security Freeze', phone: '8882980045', category: 'Credit Bureau Freeze' }

telHref(FRAUD_PREVENTION_CONTACTS[0]);     // 'tel:+18882980045'
formatPhone(FRAUD_PREVENTION_CONTACTS[0]); // '(888) 298-0045'

// One .vcf file, all 15 contacts, one tap to import:
const vcard = buildFraudPreventionVCard();

// An inline SVG QR code encoding that contact's tel: link:
const svg = qrCodeForContact(FRAUD_PREVENTION_CONTACTS[0]);
```

## API

| Export | Signature | Notes |
|---|---|---|
| `buildFreezeLetters` | `(input: FreezeLetterInput) => FreezeLetter[]` | `input.mode` is `'self'` or `'fiduciary'`. Structured data, no HTML. |
| `renderLetterHtml` | `(letter: FreezeLetter, input: FreezeLetterInput) => string` | One letter as print ready HTML. |
| `renderLettersDocument` | `(input: FreezeLetterInput) => string` | All three letters as one HTML document, one page per bureau. |
| `FRAUD_PREVENTION_CONTACTS` | `FraudPreventionContact[]` | The 15 hotlines, in 5 categories. |
| `telHref` | `(contact: FraudPreventionContact) => string` | `tel:` link for one tap calling. |
| `formatPhone` | `(contact: FraudPreventionContact) => string` | Readable `(888) 298-0045` format. |
| `buildFraudPreventionVCard` | `(contacts?: FraudPreventionContact[]) => string` | One `.vcf` for all, or a subset. |
| `qrCodeSvg` | `(text: string, options?: QrCodeOptions) => string` | Inline SVG QR code for any text. |
| `qrCodeForContact` | `(contact: FraudPreventionContact, options?: QrCodeOptions) => string` | QR code for a contact's `tel:` link. |

Full types are in [`src/letters.ts`](./src/letters.ts),
[`src/contacts.ts`](./src/contacts.ts) and [`src/qr.ts`](./src/qr.ts), and
ship as `.d.ts` files.

## Verification

Every bureau address, enclosure list and phone number in this package was
checked against the bureaus' own published pages and forms, not against
secondary sources, most recently on **August 12, 2026**. Two findings worth
repeating, because widely copied templates get them wrong:

1. **TransUnion runs three different addresses** across these processes. Box
   160 for your own freeze by mail, Box 380 for a protected consumer freeze,
   and a third address in Chester for managing the freeze of a competent
   adult under a power of attorney. Templates that route every power of
   attorney request to Box 380 are wrong for the competent adult case.
2. **Equifax publishes its own forms** and does not say a plain letter is
   accepted. The letters here are written as a complete request, and the tool
   tells you to enclose the Equifax form as well.

Addresses and procedures change. If you find one that has moved, open an
issue and it gets corrected for everyone running the widget at once.

## What this does not do

It writes the letters and gives you the tools to call or save the numbers. It
does not mail anything and it does not place calls. Both are technically
possible, through a mail fulfillment API or browser based voice, and both
require a paid third party account and mean the data has to leave the browser
to reach that vendor. That breaks the guarantee that is the point of this
tool, so they are left out on purpose. Say so in an issue if you disagree.

## License and attribution

MIT terms with one added condition: **if you put this in front of users, keep
a visible credit that names Klagge Law, PLLC and links to
[stepuplaw.com](https://stepuplaw.com) with a link search engines can
follow.** The widget renders that credit for you. Everything else is yours:
restyle it, translate it, fork it, or ship it inside a commercial product.

That link is the entire price. This was built for our own clients, letting
you use it costs us nothing, and the credit is what makes giving it away
worth doing. Full terms in [LICENSE](./LICENSE).

The credit identifies where the tool came from. It does not mean we endorsed
or reviewed your product, and it creates no attorney-client relationship with
anyone.

## Disclaimer

This generates template letters from published law, 15 U.S.C. §1681c-1 and,
for Florida residents, Fla. Stat. §501.0051, and from procedures published by
the bureaus. It lists publicly available hotline numbers. It is general
information, not legal advice for any particular situation, and using it does
not create an attorney-client relationship. Confirm current bureau
requirements before mailing.

MIT with Attribution, © [Klagge Law, PLLC](https://stepuplaw.com).
Kevin D. Klagge, Esq., Fla. Bar No. 99502.
