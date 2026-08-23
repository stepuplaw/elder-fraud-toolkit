import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { CreditFreeze, default as CreditFreezeDefault, createWidgetEmbedEngine, WIDGET_EMBED_SRC } from '../dist/react.js';

// --- rendered markup (server render: no DOM, no effects) ---

test('renders the data-stepup-freeze container the widget script scans for', () => {
  const html = renderToString(createElement(CreditFreeze));
  assert.match(html, /data-stepup-freeze/);
});

test('the credit line renders by default and drops with credit={false}', () => {
  assert.ok(!renderToString(createElement(CreditFreeze)).includes('data-sufz-credit'));
  assert.match(renderToString(createElement(CreditFreeze, { credit: false })), /data-sufz-credit="off"/);
});

test('theme props become the --sufz-* custom properties the widget reads', () => {
  const html = renderToString(
    createElement(CreditFreeze, {
      brand: '#123456',
      fg: '#222',
      mut: '#555',
      line: 'rgba(0,0,0,.1)',
      edge: '#333',
    }),
  );
  for (const [prop, value] of [
    ['--sufz-brand', '#123456'],
    ['--sufz-fg', '#222'],
    ['--sufz-mut', '#555'],
    ['--sufz-line', 'rgba(0,0,0,.1)'],
    ['--sufz-edge', '#333'],
  ]) {
    assert.ok(html.includes(`${prop}:${value}`), `expected ${prop}:${value} in ${html}`);
  }
});

test('unset theme props stay unset, so widget defaults apply', () => {
  const html = renderToString(createElement(CreditFreeze, { brand: '#123456' }));
  assert.ok(html.includes('--sufz-brand:#123456'));
  assert.ok(!html.includes('--sufz-fg'));
});

test('div props land on the outer element, which the widget does not touch', () => {
  const html = renderToString(createElement(CreditFreeze, { className: 'prose my-widget', id: 'freeze-box' }));
  assert.match(html, /class="prose my-widget"/);
  assert.match(html, /id="freeze-box"/);
});

test('named and default exports are the same component', () => {
  assert.equal(CreditFreezeDefault, CreditFreeze);
});

// --- the mount engine, against a minimal fake document ---

// The real embed script scans once at load and marks containers it has
// rendered with data-sufz-ready. The engine has three ways through:
// add the script (first placement), wait out an in-flight scan, or re-run the
// scan for a container that mounted after boot. Each path gets a test.
function makeFakeNode(attrs = {}) {
  return {
    attrs: { ...attrs },
    listeners: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    getAttribute(k) {
      return k in this.attrs ? this.attrs[k] : null;
    },
    addEventListener(type, fn) {
      (this.listeners[type] ??= []).push(fn);
    },
    // Test hook: pretend the browser finished loading the script file,
    // which fires the engine's own load listener.
    fireLoad() {
      for (const fn of this.listeners.load ?? []) fn();
    },
    replacedBy: null,
    replaceWith(node) {
      this.replacedBy = node;
    },
  };
}

function makeFakeDoc() {
  const doc = { scripts: [], created: [], appendedToHead: [] };
  doc.head = {
    appendChild(node) {
      doc.appendedToHead.push(node);
      doc.scripts.push(node);
    },
  };
  doc.createElement = () => {
    const node = makeFakeNode();
    doc.created.push(node);
    return node;
  };
  doc.querySelectorAll = () => doc.scripts.slice();
  return doc;
}

function makeContainer(ownerDocument, attrs = {}) {
  const container = { attrs: { ...attrs }, ownerDocument };
  container.getAttribute = (k) => (k in container.attrs ? container.attrs[k] : null);
  return container;
}

test('first placement appends one async embed script and stops there', () => {
  const doc = makeFakeDoc();
  const engine = createWidgetEmbedEngine(doc);
  engine.mount(makeContainer(doc));

  assert.equal(doc.appendedToHead.length, 1);
  const script = doc.appendedToHead[0];
  assert.equal(script.getAttribute('src'), WIDGET_EMBED_SRC);
  assert.equal(script.getAttribute('async'), '');
  assert.equal(script.getAttribute('data-stepup-freeze-embed'), '');
});

test('a scan still in flight covers later containers, so nothing else runs', () => {
  const doc = makeFakeDoc();
  const engine = createWidgetEmbedEngine(doc);
  engine.mount(makeContainer(doc)); // starts the one in-flight scan
  engine.mount(makeContainer(doc)); // mounts before the script loads

  assert.equal(doc.appendedToHead.length, 1, 'no second script while the first is loading');
});

test('a container that mounts after boot gets the scan re-run over it', () => {
  const doc = makeFakeDoc();
  const engine = createWidgetEmbedEngine(doc);

  // First placement, then its script finishes loading and boots.
  engine.mount(makeContainer(doc));
  const first = doc.appendedToHead[0];
  first.fireLoad();

  // React routes to a view with another instance, long after boot: the page
  // scan has to run again so the new container renders too.
  engine.mount(makeContainer(doc));
  assert.ok(first.replacedBy, 'the live tag is swapped for a fresh scan');
  assert.equal(first.replacedBy.getAttribute('src'), WIDGET_EMBED_SRC);
  assert.equal(doc.appendedToHead.length, 1, 'the replacement takes the old tag\'s place, nothing added to head');

  // While that rescan is in flight, yet another late instance waits it out.
  const before = doc.scripts.length;
  engine.mount(makeContainer(doc));
  assert.equal(doc.scripts.length, before);
});

test('containers the widget already rendered are left alone', () => {
  const doc = makeFakeDoc();
  const engine = createWidgetEmbedEngine(doc);
  const ready = makeContainer(doc, { 'data-sufz-ready': '1' });
  engine.mount(ready);
  assert.equal(doc.appendedToHead.length, 0);
});

test('without any document there is nothing to do and nothing throws', () => {
  const engine = createWidgetEmbedEngine(undefined);
  engine.mount(makeContainer(undefined)); // e.g. server-side render artifact
});
