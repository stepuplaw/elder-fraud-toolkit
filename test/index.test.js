import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFreezeLetters, renderLettersDocument } from '../dist/index.js';

const base = {
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

test('builds exactly three letters, one per bureau', () => {
  const letters = buildFreezeLetters(base);
  assert.equal(letters.length, 3);
  assert.deepEqual(
    letters.map((l) => l.bureau).sort(),
    ['Equifax', 'Experian', 'TransUnion'],
  );
});

test('TransUnion uses the protected-consumer P.O. Box 380, not the ordinary Box 160', () => {
  const letters = buildFreezeLetters(base);
  const tu = letters.find((l) => l.bureau === 'TransUnion');
  assert.ok(tu.mailingAddress.some((line) => line.includes('P.O. Box 380')));
  assert.ok(!tu.mailingAddress.some((line) => line.includes('P.O. Box 160')));
});

test('Equifax and Experian addresses match the verified addresses', () => {
  const letters = buildFreezeLetters(base);
  const eq = letters.find((l) => l.bureau === 'Equifax');
  const ex = letters.find((l) => l.bureau === 'Experian');
  assert.ok(eq.mailingAddress.some((line) => line.includes('P.O. Box 105788')));
  assert.ok(ex.mailingAddress.some((line) => line.includes('P.O. Box 9554')));
});

test('cites Fla. Stat. § 501.0051 only when the protected person is in Florida', () => {
  const flLetters = buildFreezeLetters(base);
  assert.ok(flLetters[0].paragraphs[0].includes('Fla. Stat. § 501.0051'));

  const nonFl = {
    ...base,
    protectedPerson: { ...base.protectedPerson, address: { ...base.protectedPerson.address, state: 'OH' } },
  };
  const ohLetters = buildFreezeLetters(nonFl);
  assert.ok(!ohLetters[0].paragraphs[0].includes('Fla. Stat.'));
  assert.ok(ohLetters[0].paragraphs[0].includes('15 U.S.C. § 1681c-1'));
});

test('enclosures list the correct authority document per capacity', () => {
  const guardian = { ...base, fiduciary: { ...base.fiduciary, capacity: 'guardian' } };
  const letters = buildFreezeLetters(guardian);
  assert.ok(letters[0].enclosures[0].includes('letters of guardianship'));

  const poaLetters = buildFreezeLetters(base);
  assert.ok(poaLetters[0].enclosures[0].includes('durable power of attorney'));
});

test('renderLettersDocument produces one printable page per bureau', () => {
  const html = renderLettersDocument(base);
  assert.equal((html.match(/class="freeze-letter"/g) || []).length, 3);
  assert.ok(html.includes('Jane Doe'));
});
