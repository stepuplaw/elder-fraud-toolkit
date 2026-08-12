# elder-fraud-toolkit

A small TypeScript library that automates the mail- and phone-based steps
from a real elder-fraud-prevention checklist: it fills in credit-freeze
request letters (for yourself, or for a guardian/conservator/POA agent
acting for someone who can't), and turns a list of fraud-prevention
hotlines into one-tap calls, a save-all-to-Contacts vCard, and scannable
QR codes.

## Why this exists

Americans over sixty reported more than **$7.7 billion** in fraud losses in
2025 (FBI IC3 data). Most of the doors that fraud relies on close with a
handful of free, simple steps, but two things get in the way in practice:
some of those steps only work by mail, and the rest are numbers nobody
has saved anywhere. This library automates both.

### Freeze letters

Federal law (**15 U.S.C. § 1681c-1**) already requires the three major
bureaus to honor a free credit freeze, including one requested by a
guardian, conservator, or POA agent on behalf of someone who can't place
it themselves — a protection most families never hear about. The catch:
that fiduciary request is **mail-only** at all three bureaus, each wants a
slightly different package, and one bureau's mailing address changes
depending on which of the two processes you're using.

**A gotcha this library gets right so you don't have to find out the hard
way:** TransUnion uses a *different* P.O. box for a fiduciary/protected-
consumer freeze (Box 380) than it does for an individual's own
freeze-by-mail request (Box 160). Equifax and Experian use the same
address either way. Mixing these up is a common, invisible way for a
hand-written letter to land on the wrong desk.

### Fraud-prevention contacts

The rest of a checklist like this is a list of phone numbers: bureau
freeze lines, opt-out registries, and reporting hotlines. This library
ships that list plus three ways to act on it without retyping anything:
`tel:` links for one-tap calling on a phone, a single-file vCard that
imports every number into Contacts at once, and QR codes so someone on a
desktop can hand a call off to an actual phone.

## Privacy, by design

- **Nothing this library does ever leaves the browser.** There is no
  network call anywhere in this package, no analytics, no server.
- **The letter generator never asks for a Social Security number**, and
  you shouldn't add that field if you build a form on top of it. Bureaus
  verify identity from copies of ID physically enclosed in the envelope,
  not from anything typed online. The only inputs are names, mailing
  addresses, and an optional date of birth.
- **QR codes are rendered locally** (via a dependency-free encoder, not a
  third-party "QR generator" web API), so a phone number never round-trips
  through an unrelated server just to become a scannable code.
- The letter output is plain HTML, meant to be printed (browser "Print →
  Save as PDF" works well) or piped into your own PDF renderer.

## Install

Not yet published to the npm registry. Install straight from GitHub:

```bash
npm install github:stepuplaw/elder-fraud-toolkit
```

Or clone and build locally:

```bash
git clone https://github.com/stepuplaw/elder-fraud-toolkit.git
cd elder-fraud-toolkit
npm install
npm run build
npm test
```

A working browser demo (plain HTML + ES modules — mode toggle, letter
generator, print button, and the full contact list with QR codes and a
"Save all to Contacts" button) is in
[`demo/index.html`](./demo/index.html) — open it after `npm run build`.

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

// A POA agent, guardian, or conservator acting for someone else:
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

// One print-ready HTML document with all three letters, one page each:
const html = renderLettersDocument(fiduciaryInput);
```

### Fraud-prevention contacts

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

telHref(FRAUD_PREVENTION_CONTACTS[0]);   // 'tel:+18882980045'
formatPhone(FRAUD_PREVENTION_CONTACTS[0]); // '(888) 298-0045'

// One .vcf file, all 15 contacts, one tap to import on iOS/Android/macOS/Windows:
const vcard = buildFraudPreventionVCard();

// An inline SVG QR code encoding that contact's tel: link:
const svg = qrCodeForContact(FRAUD_PREVENTION_CONTACTS[0]);
```

## API

| Export | Signature | Notes |
|---|---|---|
| `buildFreezeLetters` | `(input: FreezeLetterInput) => FreezeLetter[]` | `input.mode` is `'self'` or `'fiduciary'`. Structured data, no HTML. |
| `renderLetterHtml` | `(letter: FreezeLetter, input: FreezeLetterInput) => string` | One letter as print-ready HTML. |
| `renderLettersDocument` | `(input: FreezeLetterInput) => string` | All three letters as one HTML document, one page per bureau. |
| `FRAUD_PREVENTION_CONTACTS` | `FraudPreventionContact[]` | The 15 hotlines, grouped into 5 categories. |
| `telHref` | `(contact: FraudPreventionContact) => string` | `tel:` link for one-tap calling. |
| `formatPhone` | `(contact: FraudPreventionContact) => string` | Human-readable `(888) 298-0045` format. |
| `buildFraudPreventionVCard` | `(contacts?: FraudPreventionContact[]) => string` | One `.vcf` file for all (or a subset of) contacts. |
| `qrCodeSvg` | `(text: string, options?: QrCodeOptions) => string` | Inline SVG QR code for arbitrary text. |
| `qrCodeForContact` | `(contact: FraudPreventionContact, options?: QrCodeOptions) => string` | QR code encoding a contact's `tel:` link. |

Full types are in [`src/letters.ts`](./src/letters.ts),
[`src/contacts.ts`](./src/contacts.ts), and [`src/qr.ts`](./src/qr.ts),
and are shipped as `.d.ts` files in the built package.

## What this doesn't do (yet)

It generates the letters and the tools to call or save contacts. It
doesn't mail anything or place calls for you. A "we mail it for you" or
in-browser-call feature is technically possible (mail-fulfillment APIs
like Lob or PostGrid; browser-based VoIP via something like Twilio's
Voice SDK), but both require a paid third-party account and, more
importantly, mean the data has to leave the browser to reach that vendor
— which breaks the "nothing is ever transmitted" guarantee that's the
point of this tool. Left out deliberately; happy to hear if this should
become an opt-in add-on.

## Attribution

MIT licensed, so you can use this anywhere with no obligation beyond
keeping the license notice in copies of the software. If you build a
public tool on top of it, a visible credit line ("powered by
elder-fraud-toolkit") is appreciated but not required.

## Disclaimer

This tool generates template letters based on published bureau
procedures and 15 U.S.C. § 1681c-1 (and, for Florida residents,
Fla. Stat. § 501.0051), and lists publicly available hotline numbers. It
is general information, not legal advice for any particular situation,
and using it does not create an attorney-client relationship. Bureau
procedures and phone numbers change; confirm current details before
mailing or relying on any number listed here.

## License

MIT © [Klagge Law, PLLC](https://stepuplaw.com) — Kevin D. Klagge, Esq.,
Fla. Bar No. 99502.
