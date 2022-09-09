/**
 * Types for websocket messaging
 */
import { Accountability } from '@directus/shared/types';
import { IncomingMessage } from 'http';

export type WebRequest = IncomingMessage & { accountability: Accountability };
export type WebsocketMessage = { type: string } & Record<string, any>;
