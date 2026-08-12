import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFreezeLetters,
  renderLettersDocument,
  FRAUD_PREVENTION_CONTACTS,
  telHref,
  formatPhone,
  buildFraudPreventionVCard,
  qrCodeSvg,
  qrCodeForContact,
} from '../dist/index.js';

const fiduciaryInput = {
  mode: 'fiduciary',
  protectedPerson: {
    name: 'Jane Doe',
    address: { line1: '123 Main St', city: 'Miami', state: 'FL', zip: '33131' },
    dateOfBirth: 'March 14, 1940',
  },
  fiduciary: {
    name: 'John Doe',
    capacity: 'power-of-attorney',
    phone: '555-123-4567',
  },
  authorityDocumentDate: 'January 5, 2020',
  date: new Date('2026-08-12'),
};

const selfInput = {
  mode: 'self',
  person: {
    name: 'Jane Doe',
    address: { line1: '123 Main St', city: 'Miami', state: 'FL', zip: '33131' },
  },
  date: new Date('2026-08-12'),
};

// --- letters: fiduciary route ---

test('fiduciary mode builds exactly three letters, one per bureau', () => {
  const letters = buildFreezeLetters(fiduciaryInput);
  assert.equal(letters.length, 3);
  assert.deepEqual(
    letters.map((l) => l.bureau).sort(),
    ['Equifax', 'Experian', 'TransUnion'],
  );
});

test('fiduciary mode: TransUnion uses P.O. Box 380, not the self-freeze Box 160', () => {
  const letters = buildFreezeLetters(fiduciaryInput);
  const tu = letters.find((l) => l.bureau === 'TransUnion');
  assert.ok(tu.mailingAddress.some((line) => line.includes('P.O. Box 380')));
  assert.ok(!tu.mailingAddress.some((line) => line.includes('P.O. Box 160')));
});

test('Equifax and Experian use one box each across both modes', () => {
  for (const input of [fiduciaryInput, selfInput]) {
    const letters = buildFreezeLetters(input);
    const eq = letters.find((l) => l.bureau === 'Equifax');
    const ex = letters.find((l) => l.bureau === 'Experian');
    assert.ok(eq.mailingAddress.some((line) => line.includes('105788')));
    assert.ok(ex.mailingAddress.some((line) => line.includes('9554')));
  }
});

// Experian prints the same box two ways: "Experian Security Freeze / P.O. Box 9554"
// for an adult's own freeze, and "Experian / PO Box 9554" on the protected-consumer
// page. Matching their wording keeps the letter recognisable to their mailroom.
test('Experian addressee line differs between the two routes, as Experian publishes it', () => {
  const self = buildFreezeLetters(selfInput).find((l) => l.bureau === 'Experian');
  const fid = buildFreezeLetters(fiduciaryInput).find((l) => l.bureau === 'Experian');
  assert.equal(self.mailingAddress[0], 'Experian Security Freeze');
  assert.equal(fid.mailingAddress[0], 'Experian');
  assert.ok(
    !fid.mailingAddress.some((l) => /ATTN/i.test(l)),
    'the widely copied "ATTN: Protected Consumer" line is published nowhere by Experian',
  );
});

test('Equifax uses its full entity name and the ZIP+4 from its own forms', () => {
  const eq = buildFreezeLetters(selfInput).find((l) => l.bureau === 'Equifax');
  assert.equal(eq.mailingAddress[0], 'Equifax Information Services LLC');
  assert.ok(eq.mailingAddress.some((l) => l.includes('30348-5788')));
});

test('every letter carries a blank Social Security line instead of collecting the number', () => {
  for (const input of [fiduciaryInput, selfInput]) {
    for (const letter of buildFreezeLetters(input)) {
      assert.match(letter.paragraphs.join('\n'), /Social Security number: _+/);
    }
  }
});

test('enclosures differ per bureau, because the bureaus differ', () => {
  const letters = buildFreezeLetters(fiduciaryInput);
  const eq = letters.find((l) => l.bureau === 'Equifax');
  const ex = letters.find((l) => l.bureau === 'Experian');
  const tu = letters.find((l) => l.bureau === 'TransUnion');

  // Equifax is the only bureau demanding both vital records of the protected person.
  assert.ok(eq.enclosures.some((e) => /Social Security card of/.test(e)));
  assert.ok(eq.enclosures.some((e) => /birth certificate of/.test(e)));
  assert.ok(!tu.enclosures.some((e) => /birth certificate of/.test(e)));
  assert.ok(!ex.enclosures.some((e) => /birth certificate of/.test(e)));

  const sets = [eq, ex, tu].map((l) => JSON.stringify(l.enclosures));
  assert.equal(new Set(sets).size, 3, 'one shared enclosure list would be wrong for at least two bureaus');
});

test('every letter carries a caution, and the two known traps are surfaced', () => {
  for (const input of [fiduciaryInput, selfInput]) {
    for (const letter of buildFreezeLetters(input)) {
      assert.ok(letter.caution && letter.caution.length > 20);
    }
  }
  const fid = buildFreezeLetters(fiduciaryInput);
  assert.match(fid.find((l) => l.bureau === 'Experian').caution, /397-3742/);
  assert.match(
    fid.find((l) => l.bureau === 'TransUnion').caution,
    /Box 2000/,
    'the competent-adult POA address has to be surfaced somewhere',
  );
});

test('the caution is guidance for the sender and never prints inside the letter', () => {
  const html = renderLettersDocument(fiduciaryInput);
  for (const letter of buildFreezeLetters(fiduciaryInput)) {
    assert.ok(!html.includes(letter.caution));
  }
});

test('fiduciary mode cites Fla. Stat. § 501.0051 only when the protected person is in Florida', () => {
  const flLetters = buildFreezeLetters(fiduciaryInput);
  assert.ok(flLetters[0].paragraphs[0].includes('Fla. Stat. § 501.0051'));

  const nonFl = {
    ...fiduciaryInput,
    protectedPerson: { ...fiduciaryInput.protectedPerson, address: { ...fiduciaryInput.protectedPerson.address, state: 'OH' } },
  };
  const ohLetters = buildFreezeLetters(nonFl);
  assert.ok(!ohLetters[0].paragraphs[0].includes('Fla. Stat.'));
  assert.ok(ohLetters[0].paragraphs[0].includes('15 U.S.C. § 1681c-1'));
});

test('fiduciary mode enclosures list the correct authority document per capacity', () => {
  const guardian = { ...fiduciaryInput, fiduciary: { ...fiduciaryInput.fiduciary, capacity: 'guardian' } };
  const letters = buildFreezeLetters(guardian);
  assert.ok(letters[0].enclosures[0].includes('letters of guardianship'));

  const poaLetters = buildFreezeLetters(fiduciaryInput);
  assert.ok(poaLetters[0].enclosures[0].includes('durable power of attorney'));
});

// --- letters: self route ---

test('self mode uses TransUnion Box 160 (not the fiduciary Box 380) and never cites the protected-consumer statute', () => {
  const letters = buildFreezeLetters(selfInput);
  const tu = letters.find((l) => l.bureau === 'TransUnion');
  assert.ok(tu.mailingAddress.some((line) => line.includes('P.O. Box 160')));
  assert.ok(!tu.mailingAddress.some((line) => line.includes('P.O. Box 380')));
  assert.ok(!letters[0].paragraphs[0].includes('Fla. Stat.'));
});

test('renderLettersDocument produces one printable page per bureau in either mode', () => {
  for (const input of [fiduciaryInput, selfInput]) {
    const html = renderLettersDocument(input);
    assert.equal((html.match(/class="freeze-letter"/g) || []).length, 3);
    assert.ok(html.includes('Jane Doe'));
  }
});

// --- contacts ---

test('every fraud prevention contact has a 10-digit phone number', () => {
  for (const c of FRAUD_PREVENTION_CONTACTS) {
    assert.match(c.phone, /^\d{10}$/, `${c.name} has a malformed phone number: ${c.phone}`);
  }
});

test('telHref and formatPhone render the Equifax number correctly', () => {
  const equifax = FRAUD_PREVENTION_CONTACTS.find((c) => c.id === 'equifax');
  assert.equal(telHref(equifax), 'tel:+18882980045');
  assert.equal(formatPhone(equifax), '(888) 298-0045');
});

test('buildFraudPreventionVCard produces one VCARD block per contact', () => {
  const vcard = buildFraudPreventionVCard();
  const beginCount = (vcard.match(/BEGIN:VCARD/g) || []).length;
  assert.equal(beginCount, FRAUD_PREVENTION_CONTACTS.length);
  assert.ok(vcard.includes('FN:Equifax Security Freeze'));
  assert.ok(vcard.includes('TEL;TYPE=WORK,VOICE:+18882980045'));
});

test('buildFraudPreventionVCard accepts a subset of contacts', () => {
  const subset = FRAUD_PREVENTION_CONTACTS.filter((c) => c.category === 'Credit Bureau Freeze');
  const vcard = buildFraudPreventionVCard(subset);
  assert.equal((vcard.match(/BEGIN:VCARD/g) || []).length, 3);
});

// --- QR ---

test('qrCodeSvg returns an inline SVG string', () => {
  const svg = qrCodeSvg('tel:+18882980045');
  assert.ok(svg.startsWith('<svg'));
});

test('qrCodeForContact encodes that contact\'s tel: link', () => {
  const equifax = FRAUD_PREVENTION_CONTACTS.find((c) => c.id === 'equifax');
  const svg = qrCodeForContact(equifax);
  assert.ok(svg.startsWith('<svg'));
});
