# freeze-letter-generator

A small, dependency-free TypeScript library that fills in three
protected-consumer credit-freeze request letters, one addressed to each
major bureau (Equifax, Experian, TransUnion), for a guardian, conservator,
or power-of-attorney agent acting for someone who can no longer freeze their
own credit.

## Why this exists

Americans over sixty reported more than **$7.7 billion** in fraud losses in
2025 (FBI IC3 data), and a security freeze closes most of the doors that
fraud relies on. Federal law (**15 U.S.C. § 1681c-1**) already requires the
three bureaus to honor a free freeze requested by a guardian, conservator,
or POA agent on behalf of someone who can't place it themselves — this is
the protection most families never hear about. The catch: all three bureaus
only take this specific request **by mail**, each wants a slightly
different package, and getting it wrong (see below) means a rejected
letter and a second trip to the post office.

This library exists so a family, a fiduciary, or another site serving this
same audience can generate a correct package in under a minute instead of
hand-writing three letters and guessing at addresses.

**A gotcha this library gets right so you don't have to find out the hard
way:** TransUnion uses a *different* P.O. box for a protected-consumer
freeze (Box 380) than it does for an ordinary individual freeze-by-mail
request (Box 160). Mixing these up is a common, invisible way for a
hand-written letter to go to the wrong desk.

## Privacy, by design

- **Nothing this library does ever leaves the browser.** There is no
  network call anywhere in this package, no analytics, no server.
- **It never asks for a Social Security number**, and you shouldn't add
  that field if you build a form on top of it. Bureaus verify identity
  from copies of ID physically enclosed in the envelope, not from anything
  typed online. The only inputs are names, mailing addresses, and an
  optional date of birth.
- The output is plain HTML, meant to be printed (browser "Print → Save as
  PDF" works well) or piped into your own PDF renderer. No PDF library is
  bundled, so there's nothing here that touches the network to render one.

## Install

Not yet published to the npm registry. Install straight from GitHub:

```bash
npm install github:stepuplaw/freeze-letter-generator
```

Or clone and build locally:

```bash
git clone https://github.com/stepuplaw/freeze-letter-generator.git
cd freeze-letter-generator
npm install
npm run build
npm test
```

A working browser demo (plain HTML + ES modules, form in, three letters
out, print button) is in [`demo/index.html`](./demo/index.html) — open it
after `npm run build`.

## Usage

```ts
import { buildFreezeLetters, renderLettersDocument } from 'freeze-letter-generator';

const input = {
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

const letters = buildFreezeLetters(input);
// -> [{ bureau: 'Equifax', mailingAddress: [...], subject, paragraphs, enclosures }, ...]

// Or get one print-ready HTML document with all three letters, one page each:
const html = renderLettersDocument(input);
```

## API

| Export | Signature | Notes |
|---|---|---|
| `buildFreezeLetters` | `(input: FreezeLetterInput) => FreezeLetter[]` | Structured data, no HTML. Framework-agnostic. |
| `renderLetterHtml` | `(letter: FreezeLetter, input: FreezeLetterInput) => string` | One letter as print-ready HTML. |
| `renderLettersDocument` | `(input: FreezeLetterInput) => string` | All three letters as one HTML document, one page per bureau via `page-break-after`. |

Full types are in [`src/index.ts`](./src/index.ts) and shipped as `.d.ts`
files in the built package.

## What this doesn't do (yet)

It generates the letters. It doesn't mail them. Actually printing,
signing, enclosing the ID/authority-document copies, and mailing is still
on the person using it — automating that (e.g. a paid print-and-mail API)
is a real, separate project with its own cost and its own privacy
trade-off (the data would have to leave the browser to reach a mail
vendor), so it isn't part of this free tool.

It also only covers the protected-consumer / fiduciary process, not an
individual's own freeze of their own file (which the bureaus already make
fast online or by phone, no letter needed).

## Attribution

MIT licensed, so you can use this anywhere with no obligation beyond
keeping the license notice in copies of the software. If you build a
public tool on top of it, a visible credit line ("freeze letters powered
by freeze-letter-generator") is appreciated but not required.

## Disclaimer

This tool generates a template letter based on published bureau
procedures and 15 U.S.C. § 1681c-1 (and, for Florida residents,
Fla. Stat. § 501.0051). It is general information, not legal advice for
any particular situation, and using it does not create an attorney-client
relationship. Bureau procedures change; confirm current requirements
before mailing.

## License

MIT © [Klagge Law, PLLC](https://stepuplaw.com) — Kevin D. Klagge, Esq.,
Fla. Bar No. 99502.
