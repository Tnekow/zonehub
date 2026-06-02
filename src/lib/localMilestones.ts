type MilestoneDefinition = {
  id: string;
  event: string;
};

const MILESTONES: MilestoneDefinition[] = [
  {
    id: 'desktop_first_mode_switch',
    event: 'desktop.edit_mode_entered_first_time',
  },
  {
    id: 'desktop_first_showcase_added',
    event: 'desktop.showcase.added.first_time',
  },
  {
    id: 'desktop_first_collected_guide_showcase',
    event: 'desktop.collected_guide_showcase.created.first_time',
  },
  {
    id: 'desktop_first_new_canvas',
    event: 'desktop.new_canvas.clicked_first_time',
  },
];

const EVENT_TO_MILESTONE: Record<string, MilestoneDefinition> = MILESTONES.reduce(
  (acc, milestone) => {
    acc[milestone.event] = milestone;
    return acc;
  },
  {} as Record<string, MilestoneDefinition>,
);

/** Track a local-only milestone event (no external platform sync). */
export function trackMilestoneByEvent(event: string): { tracked: boolean; id?: string } {
  const milestone = EVENT_TO_MILESTONE[event];
  if (!milestone) return { tracked: false };
  return { tracked: true, id: milestone.id };
}

/** @deprecated Use trackMilestoneByEvent */
export const unlockAchievementByEvent = trackMilestoneByEvent;
