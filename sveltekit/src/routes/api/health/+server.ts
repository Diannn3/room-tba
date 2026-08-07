import type { RequestHandler } from './$types';


export const GET: RequestHandler = async () => {
	// TODO: latency stats need @lib/latency-tracker (astro/src/lib/latency-tracker.ts);
	// until that is ported this reports the same shape with an empty window.
	const stats = {
		totalRequests: 0,
		windowMinutes: 10,
		overall: null,
		routes: {}
	};

	return new Response(
		JSON.stringify(
			{
				status: 'ok',
				timestamp: new Date().toISOString(),
				latency: stats
			},
			null,
			2
		),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store'
			}
		}
	);
};
