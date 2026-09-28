/**
 * A thin React wrapper around the hosted credit-freeze widget, exported as
 * `elder-fraud-toolkit/react`.
 *
 * The widget's own embed is two lines of HTML: a container carrying
 * `data-stepup-freeze`, and an async script from stepuplaw.com that scans the
 * page for those containers and renders a tabbed tool into each one (fraud
 * alert, freeze letters, stolen-funds steps). This component renders exactly
 * that container and manages exactly that script, so a React app gets the same
 * widget with one import instead of a script tag.
 *
 * Theming passes straight through. The widget reads five CSS custom properties
 * off its container, so each of them is exposed here as a prop:
 *
 *   brand -> --sufz-brand   buttons and accents
 *   fg    -> --sufz-fg      body text
 *   mut   -> --sufz-mut     muted text
 *   line  -> --sufz-line    hairlines inside the card
 *   edge  -> --sufz-edge    outer frame and tab strip
 *
 * Anything left unset keeps the widget's own default, so `<CreditFreeze />`
 * with no props at all renders the stock palette.
 *
 * Why load the script from stepuplaw.com rather than bundling a copy of it?
 * The bureau addresses, enclosure lists, and phone numbers inside the widget
 * move without notice, and the hosted file is the copy that gets re-verified.
 * Embedding sites pick corrections up automatically; a bundled copy would go
 * quietly stale. The script makes no other network call of any kind — no
 * analytics, no tracking, nothing typed into the widget is transmitted
 * anywhere, and it never asks for a Social Security number.
 *
 * One wrinkle this wrapper exists to handle: the embed script scans the page
 * once, when it loads. A single-page app mounts components after that scan,
 * so if the container is not yet rendered when the script boots, this wrapper
 * re-runs the scan by swapping in a fresh copy of the script tag. Both sides
 * of that are idempotent — the injected stylesheet is guarded by its id, and
 * containers already carrying `data-sufz-ready` are skipped — so a rescan can
 * only ever fill in the widgets that are missing.
 */

import { forwardRef, useEffect, useRef } from 'react';
import type { CSSProperties, ComponentPropsWithoutRef } from 'react';

/** Where the widget script lives. Overridable only in tests, via the engine factory. */
export const WIDGET_EMBED_SRC = 'https://stepuplaw.com/embed/credit-freeze.js';

/* ---------------------------------------------------------------------------------- */
/* Mount engine                                                                        */
/*                                                                                     */
/* The DOM surface used here is deliberately narrow so tests can drive it with          */
/* plain objects; every method lines up with the real thing one for one.                */
/* ---------------------------------------------------------------------------------- */

interface EmbedScriptNode {
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  addEventListener(type: string, listener: () => void): void;
  replaceWith(node: EmbedScriptNode): void;
}

interface EmbedDocument {
  createElement(tag: string): EmbedScriptNode;
  querySelectorAll(selectors: string): ArrayLike<EmbedScriptNode>;
  head: { appendChild(node: EmbedScriptNode): void };
}

export interface WidgetEmbedEngine {
  /** Ensures the widget ends up rendered inside `container`, however late it mounted. */
  mount(container: Element): void;
}

/**
 * Builds the mount logic the component runs on mount, against an injectable
 * document so tests do not need a DOM. Production uses the shared instance
 * below; the document is taken from the container itself at call time, which
 * also keeps server-side rendering safe — nothing here touches `document`
 * unless and until the effect runs in a browser.
 */
export function createWidgetEmbedEngine(doc?: EmbedDocument): WidgetEmbedEngine {
  // Script executions we have started whose scan has not run yet. While any
  // are in flight there is nothing to do: their boot will find every
  // container currently in the page, including ours.
  let inflight = 0;

  function isEmbedScript(node: EmbedScriptNode): boolean {
    return node.getAttribute('src') === WIDGET_EMBED_SRC || node.getAttribute('data-stepup-freeze-embed') !== null;
  }

  function makeScript(d: EmbedDocument): EmbedScriptNode {
    const s = d.createElement('script');
    s.setAttribute('src', WIDGET_EMBED_SRC);
    s.setAttribute('async', '');
    s.setAttribute('data-stepup-freeze-embed', '');
    s.addEventListener('load', () => {
      inflight -= 1;
    });
    s.addEventListener('error', () => {
      inflight -= 1;
    });
    return s;
  }

  return {
    mount(container) {
      const d = doc ?? (container.ownerDocument as unknown as EmbedDocument | undefined);
      if (!d) return;

      // The script marks every container it renders. If ours is marked, done.
      if (container.getAttribute('data-sufz-ready')) return;

      let existing: EmbedScriptNode | undefined;
      const nodes = d.querySelectorAll('script');
      for (let i = 0; i < nodes.length; i += 1) {
        if (isEmbedScript(nodes[i])) existing = nodes[i];
      }

      if (!existing) {
        // First placement on the page: add the script and let its own boot
        // render this container along with any others already present.
        d.head.appendChild(makeScript(d));
        inflight += 1;
        return;
      }

      if (inflight > 0) {
        // A scan is on its way; it will cover this container too.
        return;
      }

      // The script loaded long ago and has already scanned the page, which
      // happens whenever React routes to a view containing this component.
      // Re-running the whole script is safe (see file header), costs one
      // cache hit, and is the only way in through the public pattern.
      const retry = makeScript(d);
      existing.replaceWith(retry);
      inflight += 1;
    },
  };
}

const engine = createWidgetEmbedEngine();

/* ---------------------------------------------------------------------------------- */
/* Component                                                                           */
/* ---------------------------------------------------------------------------------- */

export interface CreditFreezeProps extends Omit<ComponentPropsWithoutRef<'div'>, 'style'> {
  /** Buttons and accents. Passes through as `--sufz-brand`. Defaults to the widget green. */
  brand?: string;
  /** Body text. Passes through as `--sufz-fg`. */
  fg?: string;
  /** Muted text. Passes through as `--sufz-mut`. */
  mut?: string;
  /** Hairlines inside the card. Passes through as `--sufz-line`. */
  line?: string;
  /** Outer frame and tab strip. Passes through as `--sufz-edge`. */
  edge?: string;
  /**
   * Whether to render the credit line naming Kevin D. Klagge, Esq. with its
   * link to stepuplaw.com. On by default; pass false to drop it, matching
   * `data-sufz-credit="off"` on the raw embed. It is a request, not a licence
   * condition — see ATTRIBUTION.md — but the link is how corrections travel
   * back to everyone running the widget.
   */
  credit?: boolean;
  /** Merged after the theme variables, so you can add or override any CSS property. */
  style?: CSSProperties;
}

/**
 * The credit freeze / fraud alert widget, as a React component.
 *
 * Renders an outer div carrying your class name, style, and the rest of any
 * div props, with an inner `data-stepup-freeze` container inside it. The
 * widget takes the inner div over completely, which is why your props land on
 * the outer one: the widget replaces the inner container's content and class
 * name, and theming still reaches it because CSS custom properties inherit.
 *
 * Server-side rendering is fine — markup is an empty pair of divs, and the
 * widget attaches in an effect, in the browser only.
 */
export const CreditFreeze = forwardRef<HTMLDivElement, CreditFreezeProps>(function CreditFreeze(
  // Children are taken out rather than rendered: the widget replaces the
  // content of its own container, so anything placed here would float above
  // an already-occupied box.
  { brand, fg, mut, line, edge, credit = true, style, children: _ignored, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (innerRef.current) engine.mount(innerRef.current);
    // Deliberately once. Theme changes flow through style on re-render; the
    // widget's own content must not be torn down and rebuilt for them.
  }, []);

  const setExternalRef = (node: HTMLDivElement | null) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const cssVars = {
    '--sufz-brand': brand,
    '--sufz-fg': fg,
    '--sufz-mut': mut,
    '--sufz-line': line,
    '--sufz-edge': edge,
    ...style,
  } as CSSProperties;

  return (
    <div {...rest} ref={setExternalRef} style={cssVars}>
      <div ref={innerRef} data-stepup-freeze="" data-sufz-credit={credit ? undefined : 'off'} />
    </div>
  );
});

export default CreditFreeze;
