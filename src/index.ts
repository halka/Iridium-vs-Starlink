import PostalMime from 'postal-mime';
import xApiPost from '@kworq/x-api-post';

export default {
	async email(message: any, env: any, ctx: any) {
		const parser = new PostalMime();
		const rawEmail = new Response(message.raw);
		const email = await parser.parse(await rawEmail.arrayBuffer());
		let from = email.from.address;
		let body = email.text ?? '';
		let subject = email.subject ?? '';
		let bodyLines = body.split(/\r?\n/).filter(line => line.trim() !== '');
		let lat: string | null = null;
		let lon: string | null = null;
		let googlemapsUrl = 'https://maps.google.com/?q=';
		let text = '';

		// Check if sender is allowed
		let allowList = env.allowed;
		if (!Array.isArray(allowList)) {
			try {
				allowList = JSON.parse(allowList);
			} catch {
				allowList = [];
			}
		}
		if (!allowList.address.includes(from)) {
			message.setReject(`Sender not allowed: ${from}`);
			// Sender not allowed, do not post
			return;
		}

		if (subject.includes('inReachメッセージ')) {
			for (const line of bodyLines) {
				const match = line.match(/Lat\s([0-9.\-]+)\sLon\s([0-9.\-]+)/);
				if (match) {
					lat = match[1];
					lon = match[2];
					googlemapsUrl += `${lat},${lon}`;
					text = `${bodyLines[0]}\n${googlemapsUrl}`;
					break;
				}
			}
		} else {
			lat = null;
			lon = null;
			text = bodyLines[0];
		}

		// Tweet using x-api-post
		const config = {
			X_API_KEY: env.X_API_KEY || '',
			X_API_SECRET: env.X_API_SECRET || '',
			X_API_ACCESS_TOKEN: env.X_API_ACCESS_TOKEN || '',
			X_API_ACCESS_TOKEN_SECRET: env.X_API_ACCESS_TOKEN_SECRET || ''
		};
		const xApiClient = new xApiPost(config);
		await xApiClient.postTweetWithMedia(text).then((response) => console.log(response))
			.catch((error: any) => console.error("Error posting tweet:", error));
		console.log(text);
	}
}