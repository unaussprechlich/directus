/**
 * Types for websockets
 */

export type SocketConfig = {
	enabled: boolean; // socket server enabled
	endpoint: string; // endpoint for request upgrade
	public: boolean; // whether to require auth before upgrading
};
