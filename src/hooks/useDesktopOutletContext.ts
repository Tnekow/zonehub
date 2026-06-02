import { useOutletContext } from 'react-router-dom';
import type { DesktopOutletContext } from '../types/desktopOutletContext';

const noop = () => {};

const defaultOutlet: DesktopOutletContext = {
  desktopCanvasMode: 'preview',
  setDesktopCanvasMode: noop,
};

/** 读取桌面壳注入的画布模式；非 /desktop 子路由下返回预览态默认值。 */
export function useDesktopOutletContext(): DesktopOutletContext {
  const ctx = useOutletContext<DesktopOutletContext | null | undefined>();
  return ctx ?? defaultOutlet;
}
