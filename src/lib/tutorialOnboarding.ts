export const TUTORIAL_ONBOARDING_STORAGE_KEY = 'steamzone_tutorial_onboarding_v1';

export interface TutorialOnboardingState {
  activeStepId: string;
  completedStepIds: string[];
  unlockedAchievementIds: string[];
  updatedAt: number;
}

export function loadTutorialOnboardingState(stepIds: string[]): TutorialOnboardingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TUTORIAL_ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TutorialOnboardingState;
    if (!parsed || !Array.isArray(parsed.completedStepIds) || !Array.isArray(parsed.unlockedAchievementIds)) {
      return null;
    }
    if (!stepIds.includes(parsed.activeStepId)) return null;
    return {
      activeStepId: parsed.activeStepId,
      completedStepIds: parsed.completedStepIds.filter((id) => stepIds.includes(id)),
      unlockedAchievementIds: parsed.unlockedAchievementIds,
      updatedAt: Number(parsed.updatedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveTutorialOnboardingState(state: TutorialOnboardingState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUTORIAL_ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore persistence failure
  }
}

export function markStepCompleted(
  state: TutorialOnboardingState,
  stepId: string,
  totalSteps: number
): TutorialOnboardingState {
  const completed = state.completedStepIds.includes(stepId)
    ? state.completedStepIds
    : [...state.completedStepIds, stepId];

  const unlocked = new Set(state.unlockedAchievementIds);
  if (completed.length >= 1) unlocked.add('tutorial_onboarding_started');
  if (completed.length >= 3) unlocked.add('tutorial_three_steps_completed');
  if (completed.length >= totalSteps) unlocked.add('tutorial_onboarding_completed');

  return {
    activeStepId: stepId,
    completedStepIds: completed,
    unlockedAchievementIds: Array.from(unlocked),
    updatedAt: Date.now(),
  };
}

