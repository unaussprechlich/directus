// not really the way to do this but it works for PoC
export function extractToken(req: any, query: any): string | null {
	if (query && query.access_token) {
		return query.access_token as string;
	}

	let token: string | null = null;
	if (req.headers && req.headers.authorization) {
		const parts = req.headers.authorization.split(' ');

		if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
			token = parts[1];
		}
	}
	return token;
}
