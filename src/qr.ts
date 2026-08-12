/**
 * QR codes rendered fully client-side (via `qrcode-generator`, a
 * dependency-free encoder), so a phone number never has to round-trip
 * through a third-party "QR generator" web service to become a QR code.
 * That matters here specifically: several of these numbers are freeze
 * and fraud-reporting lines, and sending them to an unrelated server
 * just to draw a QR code would be an odd thing for a fraud-prevention
 * tool to do.
 *
 * The main use: someone reading this on a desktop or a printed page can
 * scan the code with a phone camera, which offers to dial the number
 * directly — a low-friction way to hand a call off to a device that
 * actually has a dial pad and a cell signal.
 */

import qrcode from 'qrcode-generator';
import { telHref, type FraudPreventionContact } from './contacts.js';

export interface QrCodeOptions {
  /** Pixel size of each QR module. Defaults to 4. */
  cellSize?: number;
  /** Quiet-zone margin in modules. Defaults to 4. */
  margin?: number;
}

/** Renders a QR code encoding arbitrary text as an inline SVG string. */
export function qrCodeSvg(text: string, options: QrCodeOptions = {}): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: options.cellSize ?? 4, margin: options.margin ?? 4 });
}

/**
 * A QR code encoding a `tel:` link for a fraud-prevention contact.
 * Scanning it with a phone camera prompts to call the number directly.
 */
export function qrCodeForContact(contact: FraudPreventionContact, options?: QrCodeOptions): string {
  return qrCodeSvg(telHref(contact), options);
}
