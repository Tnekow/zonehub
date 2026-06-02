export type DesktopCanvasMode = 'preview' | 'edit';

/** Desktop 壳通过 React Router Outlet 注入给子路由的上下文 */
export type DesktopOutletContext = {
  desktopCanvasMode: DesktopCanvasMode;
  setDesktopCanvasMode: (value: DesktopCanvasMode) => void;
};
