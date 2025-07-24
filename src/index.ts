import * as PostalMime from 'postal-mime';
import xApiPost from '@kworq/x-api-post';

export default {
	async email(message: any, env: any, ctx: any) {
		const parser = new PostalMime.default();
		const rawEmail = new Response(message.raw);
		const email = await parser.parse(await rawEmail.arrayBuffer());
		const from = email.from.address;
		const body = email.text ?? '';
		const subject = email.subject ?? '';
		const maxPostLength: uint8 = 280;
		// Check and Change
		const fromInReachSubject = 'inReachメッセージ';

		let bodyLines = body.split(/\r?\n/).filter(line => line.trim() !== '');
		let lat: string | null = null;
		let lon: string | null = null;
		let googlemapsUrl = 'https://maps.google.com/?q=';

		// Check sender is allowed
		const allowList = JSON.parse(env.allowed);
		if (!allowList.address.includes(from)) {
				message.setReject(`Sender not allowed: ${from}`);
				return -1;
		}

		let text: string = bodyLines[0];

		if (subject.includes(frominReachSubject)) {
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
		}

		if (0 < text.length && text.length <= maxPostLength) {
				const config = {
						X_API_KEY: env.X_API_KEY || '',
						X_API_SECRET: env.X_API_SECRET || '',
						X_API_ACCESS_TOKEN: env.X_API_ACCESS_TOKEN || '',
						X_API_ACCESS_TOKEN_SECRET: env.X_API_ACCESS_TOKEN_SECRET || ''
				};
				const xApiClient = new xApiPost(config);
				await xApiClient.postTweetWithMedia(text).then((response) => console.log(response))
						.catch((error: any) => console.error("Error posting tweet:", error));
  		} else {
					// Failed to post
					console.log(`Failed: ${text} ${text.length} ${from}`);
					return -1;
				}
		}
}
