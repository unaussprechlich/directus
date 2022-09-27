import type { WebSocket, MessageEvent } from 'ws';

export const waitForMessage = (client: WebSocket, timeout: number) => {
	return new Promise((resolve, reject) => {
		client.addEventListener('message', awaitMessage);
		const timer = setTimeout(() => {
			client.removeEventListener('message', awaitMessage);
			reject();
		}, timeout);

		function awaitMessage(event: MessageEvent) {
			try {
				clearTimeout(timer);
				client.removeEventListener('message', awaitMessage);
				resolve(JSON.parse(event.data as string));
			} catch (err) {
				reject(err);
			}
		}
	});
};
