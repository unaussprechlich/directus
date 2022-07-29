import { Client } from 'graphql-ws';

export async function loadHistory() {
	const $history = document.getElementById('history')!;
	$history.innerHTML = ''; // clear element
	// fetch history
	const { data = [] } = await fetch(
		'http://localhost:8055/items/chat_messages?' +
			new URLSearchParams({
				fields: 'message,date_created,user_created.first_name,user_created.last_name',
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
	for (const { message, user_created, date_created } of data) {
		$history.innerText += `\n\n${user_created?.first_name}${user_created?.last_name}[${date_created}] ${message}`;
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
		{
			query: `
subscription { 
    chatMessagesCreated { 
        message, 
        date_created, 
        user_created { first_name, last_name } 
    } 
}`,
		},
		{
			next: ({ data }) => {
				// console.log(data);
				const { message = '', date_created = '', user_created = '' } = data.chatMessagesCreated;
				document.getElementById(
					'history'
				)!.innerText += `\n\n${user_created?.first_name}${user_created?.last_name}[${date_created}] ${message}`;
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
