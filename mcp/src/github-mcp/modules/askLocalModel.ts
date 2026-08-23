import { askModel } from '../common/model-client.js';

export async function askLocalModel(query: string): Promise<Record<string, unknown>> {
    return askModel(query);
}
