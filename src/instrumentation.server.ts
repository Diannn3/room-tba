import { bootstrapObservability } from '$lib/utils/observability/bootstrap';

export function register(): void {
	bootstrapObservability();
}
