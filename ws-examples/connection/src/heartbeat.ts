/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 *
 * Heartbeat frontend implementation
 */
export type HeartbeatConfig = {
	message: string;
	frequency: number;
	timeout: number;
};
export class ClientHeartbeat {
	config: HeartbeatConfig;
	private responseTimeout: NodeJS.Timer | undefined;
	constructor(config: HeartbeatConfig) {
		this.config = config;
	}
	reset() {
		if (this.responseTimeout) clearInterval(this.responseTimeout);
	}
	start(callback: () => any) {
		this.reset();
		this.responseTimeout = setInterval(() => callback(), this.config.frequency);
	}
	ping(ws: WebSocket) {
		ws.send(JSON.stringify({ type: 'PING', message: this.config.message }));
		const timeout = setTimeout(() => {
			// if this ticks the client is unresponsive
			// console.error(`[ WS ] Socket timed out`);
			ws.close();
		}, this.config.timeout);
		const watchMessages = () => {
			// any message means the connection is still open
			clearTimeout(timeout);
			ws.removeEventListener('message', watchMessages);
		};
		ws.addEventListener('message', watchMessages);
	}
}
