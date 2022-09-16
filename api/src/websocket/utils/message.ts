import { WebsocketClient } from '../types';

/**
 * Message utils
 */
export const trimUpper = (str: string) => str.trim().toUpperCase();
export const stringify = (msg: any) => (typeof msg === 'string' ? msg : JSON.stringify(msg));

export const fmtMessage = (type: string, data: Record<string, any> = {}) => {
	return JSON.stringify({ type, ...data });
};
export const errorMessage = (error: any) => JSON.stringify({ error });

// we may need this later for slow connections
export const safeSend = async (client: WebsocketClient, data: string, delay = 100) => {
	if (client.readyState !== client.OPEN) return;
	if (client.bufferedAmount > 0) {
		// wait for the buffer to clear
		return new Promise((resolve) => {
			setTimeout(() => {
				safeSend(client, data, delay).finally(() => resolve(null));
			}, delay);
		});
	}
	client.send(data);
};
