import type { ShareInfo } from '../components/common/share/types';

type EditableComponent = {
  type: string;
};

type BadgeSlot = {
  name?: string;
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function buildShareInfo(params: {
  themeName: string;
  backgroundName: string;
  mapComponentName: (componentType: string) => string;
  storage?: Storage;
}): ShareInfo {
  const storage = params.storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!storage) {
    return {
      themeName: params.themeName,
      backgroundName: params.backgroundName,
      badgeNames: [],
      componentNames: [],
    };
  }

  const badgeNames: string[] = [];
  const layouts: Array<'1x6' | '2x6'> = ['1x6', '2x6'];
  for (const layout of layouts) {
    const slots = parseJson<BadgeSlot[]>(storage.getItem(`steamzone_badgeCollector_${layout}`), []);
    slots.forEach((slot) => {
      if (slot?.name) badgeNames.push(slot.name);
    });
  }

  const componentNames = parseJson<EditableComponent[]>(
    storage.getItem('steamzone_editableComponents'),
    [],
  ).map((component) => params.mapComponentName(component.type));

  return {
    themeName: params.themeName,
    backgroundName: params.backgroundName,
    badgeNames,
    componentNames,
  };
}

