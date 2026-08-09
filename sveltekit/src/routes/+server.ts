import { type RequestHandler, redirect } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
	return redirect(308, "/map");
};
