/**
 * Types for websocket messaging
 */
import type { Accountability } from '@directus/shared/types';
import type { IncomingMessage } from 'http';

export type WebRequest = IncomingMessage & { accountability: Accountability };
export type WebsocketMessage = { type: string } & Record<string, any>;
