import { createClient } from 'graphql-ws';

const client = createClient({
	url: 'ws://localhost:8055/graphql',
	connectionParams: async () => {
		return { token: 'admin' };
	},
});

client.subscribe(
	{
		query: 'subscription { message }',
	},
	{
		next: (data) => {
			document.querySelector('#messages').innerText += '\n\n' + data.data.message.message;
		},
		error: (err) => {
			/*console.error(err)*/
		},
		complete: () => {
			//console.log('Complete (whatever that means)');
		},
	}
);

document.querySelector('#send')?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const data = new FormData(event.target as HTMLFormElement);
	const value = Object.fromEntries(data.entries());

	await fetch('http://localhost:8055/items/messages', {
		method: 'POST',
		body: JSON.stringify(value),
		headers: {
			'Content-Type': 'application/json',
		},
	});

	document.querySelector('#send')?.reset();
});
