import type { IdentifyResponse } from './services/identify';
import type { ActionEstimate } from './services/pricing';

export interface AnswersState {
  power?: 'plug' | 'battery' | 'none';
  material?: string;
}

export interface AppState {
  files: File[];
  identify: IdentifyResponse | null;
  answers: AnswersState;
  estimates: ActionEstimate | null;
  zip?: string;
}

export const state: AppState = {
  files: [],
  identify: null,
  answers: {},
  estimates: null,
  zip: undefined,
};

