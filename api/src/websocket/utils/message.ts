/**
 * Message utils
 */
export const trimUpper = (str: string) => str.trim().toUpperCase();
export const stringify = (msg: any) => (typeof msg === 'string' ? msg : JSON.stringify(msg));

export const fmtMessage = (type: string, data: Record<string, any> = {}) => {
	return JSON.stringify({ type, ...data });
};
