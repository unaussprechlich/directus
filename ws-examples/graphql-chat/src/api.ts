import { Client } from 'graphql-ws';

export async function loadHistory() {
	const $history = document.getElementById('history')!;
	$history.innerHTML = ''; // clear element
	// fetch history
	const { data = [] } = await fetch(
		'http://localhost:8055/items/chat_messages?' +
			new URLSearchParams({
				'fields[]': 'message',
				sort: 'date_created',
			}),
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer admin',
			},
		}
	).then((resp) => resp.json());
	for (const { message } of data) {
		$history.innerText += '\n\n' + message;
	}
}

export async function sendMessage(message: string) {
	return await fetch('http://localhost:8055/items/chat_messages', {
		method: 'POST',
		body: JSON.stringify({ message }),
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer admin',
		},
	});
}

export function subscribeToChat(client: Client) {
	client.subscribe(
		{ query: 'subscription { chatMessages }' },
		{
			next: ({ data: { chatMessages } }) => {
				document.getElementById('history')!.innerText += '\n\n' + chatMessages.message;
			},
			error: (err) => {
				/*console.error(err)*/
			},
			complete: () => {
				//console.log('Complete (whatever that means)');
			},
		}
	);
}
