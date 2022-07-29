import { createClient } from 'graphql-ws';
import { loadHistory, subscribeToChat } from './api';

const client = createClient({
	url: 'ws://localhost:8055/graphql',
	keepAlive: 30,
	connectionParams: async () => {
		return { token: 'admin' };
	},
});

const $status = document.getElementById('status')!;
client.on('connected', async () => {
	$status.innerText = 'connected';
	await loadHistory();
	document.querySelector('button[type="submit"]')?.removeAttribute('disabled');
});
client.on('connecting', () => {
	$status.innerText = 'connecting';
});
client.on('error', () => {
	$status.innerText = 'error';
	document.querySelector('button[type="submit"]')?.setAttribute('disabled', '');
});
client.on('closed', () => {
	$status.innerText = 'closed';
	document.querySelector('button[type="submit"]')?.setAttribute('disabled', '');
});
subscribeToChat(client);

document.querySelector('#send')?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const data = new FormData(event.target as HTMLFormElement);
	const value = Object.fromEntries(data.entries());

	await fetch('http://localhost:8055/items/chat_messages', {
		method: 'POST',
		body: JSON.stringify(value),
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer admin',
		},
	});

	document.querySelector('#send')?.reset();
});
