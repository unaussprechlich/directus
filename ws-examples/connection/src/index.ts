import { v4 as uuidv4 } from 'uuid';
import { Query } from '@directus/shared/types';

type UrlOptions = {
	protocol: 'ws' | 'wss';
	domain: string;
	path: string;
};
type ConnectionOptions = {
	enableHeartbeat: boolean;
	heartbeatInterval: number;
	enableHandshake: boolean;
	handshakeTimeout: number;
	maxRetries: number;
	messageDelay: number;
};
type SocketEvents = 'open' | 'close' | 'error' | 'message';
type SocketListener = (data: any) => any;
type SocketHandlerMap = {
	[evt in SocketEvents]: Set<SocketListener>;
};

interface WebConnector {
	ws: WebSocket | undefined;
	url: UrlOptions;
	connection: ConnectionOptions;
}

const DefaultUrlOptions: UrlOptions = {
	protocol: 'ws',
	domain: 'localhost:8055',
	path: 'websocket',
};
const DefaultConnectionOptions: ConnectionOptions = {
	enableHeartbeat: true,
	heartbeatInterval: 1000,
	enableHandshake: true,
	handshakeTimeout: 5000,
	maxRetries: 5,
	messageDelay: 100,
};

class BunnyConnect implements WebConnector {
	ws: WebSocket | undefined;
	url: UrlOptions;
	connection: ConnectionOptions;
	isConnecting: boolean;
	isConnected: boolean;
	debug: boolean;
	retries: number;
	handlers: SocketHandlerMap;
	sendQueue: string[];

	constructor() {
		this.ws = undefined;
		this.url = DefaultUrlOptions;
		this.connection = DefaultConnectionOptions;
		this.isConnecting = false;
		this.isConnected = false;
		this.debug = true;
		this.retries = 0;
		this.handlers = {} as SocketHandlerMap;
		this.sendQueue = [];
	}
	init(url: Partial<UrlOptions>, options: Partial<ConnectionOptions> | false = false) {
		this.log('init', url, options);
		this.url = { ...DefaultUrlOptions, ...url };
		if (options) {
			this.connection = { ...DefaultConnectionOptions, ...options };
		}
	}
	reset() {
		this.log('reset');
		if (this.ws && this.ws.readyState === this.ws.OPEN) {
			this.ws.close();
		}
		this.ws = undefined;
		this.isConnected = false;
		this.isConnecting = false;
	}
	connect() {
		const url = this.getUrl();
		this.log('connect', url);
		if (this.isConnecting) return;
		if (this.isConnected) return;
		this.isConnecting = true;
		this.ws = new WebSocket(url);
		this.ws.addEventListener('open', (event) => {
			this.log('ws-open', event);
			this.isConnecting = false;
			this.isConnected = true;
			this.dispatch('open', event);
			this.runSendQueue();
		});
		this.ws.addEventListener('message', (event) => {
			this.log('ws-message', event);
			try {
				const msg = JSON.parse(event.data);
				this.dispatch('message', msg);
			} catch (err) {
				this.error(err);
			}
		});
		this.ws.addEventListener('error', (event) => {
			this.log('ws-error', event);
			this.reset();
			this.dispatch('error', event);
			this.reconnect();
		});
		this.ws.addEventListener('close', (event) => {
			this.log('ws-close', event);
			this.reset();
			this.dispatch('close', event);
			this.reconnect();
		});
	}
	reconnect() {
		if (this.isConnected || this.isConnecting) {
			return this.error('There seems to be an open connection');
		}
		this.log('reconnect');
		if (this.retries < this.connection.maxRetries) {
			this.retries++;
			setTimeout(() => this.connect(), 200 * this.retries);
		}
	}
	send(message: string | object) {
		const msg = typeof message === 'string' ? message : JSON.stringify(message);
		if (this.isConnected && this.ws) {
			this.ws.send(msg);
		} else {
			this.sendQueue.push(msg);
		}
	}
	on(event: SocketEvents, handler: SocketListener) {
		if (!this.handlers[event]) {
			this.handlers[event] = new Set();
		}
		this.handlers[event]?.add(handler);
	}
	off(event: SocketEvents, handler: SocketListener) {
		if (this.handlers[event]) {
			this.handlers[event].delete(handler);
		}
	}
	async get(collection: string, query: Query = {}): Promise<any[]> {
		return new Promise((resolve, reject) => {
			const uid = uuidv4();
			const waitForResponse = ({ type, data, uid: id }: any) => {
				if (type !== 'RESPONSE' || id != uid) return;
				this.off('message', waitForResponse);
				resolve(data);
			};
			this.on('message', waitForResponse);
			this.send({ type: 'GET', uid, collection, query });
			setTimeout(() => {
				this.off('message', waitForResponse);
				reject('Timeout');
			}, 600000 /*10mins*/);
		});
	}
	subscribe(collection: string, query: Query = {}) {
		const uid = uuidv4();
		this.send({ type: 'SUBSCRIBE', collection, query, uid });
		return uid;
	}
	unsubscribe(uid: string) {
		this.send({ type: 'UNSUBSCRIBE', uid });
	}
	private runSendQueue() {
		if (this.sendQueue.length === 0 || !this.isConnected) return;
		const msg = this.sendQueue.shift();
		if (msg && this.ws) this.ws.send(msg);
		if (this.connection.messageDelay > 0) {
			setTimeout(() => this.runSendQueue(), this.connection.messageDelay);
		} else {
			this.runSendQueue();
		}
	}
	private dispatch(event: SocketEvents, data: any) {
		if (this.handlers[event]) {
			for (const handler of this.handlers[event]) {
				handler(data);
			}
		}
	}
	private log(...msg: any) {
		// eslint-disable-next-line no-console
		if (this.debug) console.log('[BunnyConnect]', ...msg);
	}
	private error(...msg: any) {
		// eslint-disable-next-line no-console
		console.error('[BunnyConnect]', ...msg);
	}
	private getUrl(): string {
		return `${this.url.protocol}://${this.url.domain}/${this.url.path}`;
	}
}

const bunnyConnect = new BunnyConnect();

export default bunnyConnect;
