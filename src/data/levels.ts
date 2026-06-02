// Steam 官方等级样式配置 - 参考 https://blog.ninc.top/posts/cheat-sheet/steam-badge
export interface LevelStyle {
  level: number;
  type: 'circle' | 'sprite';
  color?: string;
  className: string;
}

// Steam 官方颜色配置（0-99级）
const STEAM_COLORS = {
  gray: '#9b9b9b',      // 0-9
  red: '#c02942',       // 10-19
  orange: '#d95b43',    // 20-29
  yellow: '#fecc23',    // 30-39
  green: '#467a3c',     // 40-49
  blue: '#4e8ddb',      // 50-59
  purple: '#7652c9',    // 60-69
  pink: '#c252c9',      // 70-79
  gold: '#997c52'       // 80-99
};

// 颜色循环数组（0-79级，每10级一个颜色）
const COLOR_CYCLE_0_79 = [
  STEAM_COLORS.gray,    // 0-9
  STEAM_COLORS.red,     // 10-19
  STEAM_COLORS.orange,  // 20-29
  STEAM_COLORS.yellow,  // 30-39
  STEAM_COLORS.green,   // 40-49
  STEAM_COLORS.blue,    // 50-59
  STEAM_COLORS.purple,  // 60-69
  STEAM_COLORS.pink     // 70-79
];

// 生成等级样式数据
export const generateLevelStyles = (): LevelStyle[] => {
  const styles: LevelStyle[] = [];
  
  // 0-99: 圆形边框样式
  for (let i = 0; i <= 99; i++) {
    let colorIndex: number;
    let isThinBorder = false;
    let color: string;
    
    if (i <= 79) {
      // 0-79级：每10级一个颜色（共8个颜色）
      colorIndex = Math.floor(i / 10);
      color = COLOR_CYCLE_0_79[colorIndex];
    } else {
      // 80-99级：金色细边框
      colorIndex = i < 90 ? 8 : 9;
      color = STEAM_COLORS.gold;
      isThinBorder = true;
    }
    
    const borderClass = isThinBorder ? 'thin-border' : '';
    
    styles.push({
      level: i,
      type: 'circle',
      color: color,
      className: `level-circle level-color-${colorIndex} ${borderClass}`.trim()
    });
  }
  
  // 100+级：精灵图背景样式
  for (let i = 100; i <= 599; i++) {
    // 计算百位数（100, 200, 300, 400, 500）
    const hundred = Math.floor(i / 100) * 100;
    // 计算十位数（0, 10, 20, ... 90）
    const ten = Math.floor((i % 100) / 10) * 10;
    
    // 使用下划线命名，与Steam官方一致
    styles.push({
      level: i,
      type: 'sprite',
      className: `level-sprite lvl_${hundred} lvl_plus_${ten}`
    });
  }
  
  return styles;
};

// 获取指定等级的样式
export const getLevelStyle = (level: number): LevelStyle | null => {
  // 对于超过599的等级，使用599的样式
  const effectiveLevel = Math.min(level, 599);
  const styles = generateLevelStyles();
  return styles.find(style => style.level === effectiveLevel) || null;
};

// 导出颜色配置供外部使用
export { STEAM_COLORS, COLOR_CYCLE_0_79 };
