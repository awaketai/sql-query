/**
 * Global antd message instance.
 *
 * antd v5's static `message.error()` doesn't render inside <App> context.
 * This module holds a reference to the context-aware message API, injected
 * once at App mount via `setupMessage()`.
 *
 * Usage:
 *   import { msg } from './message';
 *   msg.error('something went wrong');
 */

import type { MessageInstance } from 'antd/es/message/interface';

let _message: MessageInstance | null = null;

/** Call once from a component inside <App> to inject the real message API. */
export function setupMessage(instance: MessageInstance) {
  _message = instance;
}

/**
 * Proxy that forwards to the injected antd message instance.
 * Falls back to console.error if called before setup (should not happen).
 */
export const msg = {
  error(content: string) {
    _message ? _message.error(content) : console.error('[msg]', content);
  },
  success(content: string) {
    _message ? _message.success(content) : console.log('[msg]', content);
  },
  warning(content: string) {
    _message ? _message.warning(content) : console.warn('[msg]', content);
  },
  info(content: string) {
    _message ? _message.info(content) : console.info('[msg]', content);
  },
};
