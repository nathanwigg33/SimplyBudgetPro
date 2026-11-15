import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'home' | 'budget' | 'activity' | 'user' | 'search' | 'close' | 'check' | 'chevron' | 'back' | 'worth';

export function Icon({ name, size = 24, color = '#000', strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Path d="M3.5 10.5 12 3.8l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z" {...p} />
        </>
      )}
      {name === 'budget' && (
        <>
          <Path d="M12 3a9 9 0 1 0 9 9h-9z" {...p} />
          <Path d="M15 3.5A9 9 0 0 1 20.5 9H15z" {...p} />
        </>
      )}
      {name === 'activity' && (
        <>
          <Rect x="4" y="3.5" width="16" height="17" rx="3" {...p} />
          <Path d="M8 9h8M8 13h8M8 17h5" {...p} />
        </>
      )}
      {name === 'user' && (
        <>
          <Circle cx="12" cy="8.5" r="4" {...p} />
          <Path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" {...p} />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="6.5" {...p} />
          <Path d="m16 16 4.5 4.5" {...p} />
        </>
      )}
      {name === 'close' && <Path d="M6 6l12 12M18 6 6 18" {...p} />}
      {name === 'check' && <Path d="m5 12.5 4.5 4.5L19 7.5" {...p} />}
      {name === 'chevron' && <Path d="m9 5 7 7-7 7" {...p} />}
      {name === 'worth' && (
        <>
          <Path d="M3.5 17.5 9 12l4 4 7.5-8" {...p} />
          <Path d="M15 8h5.5v5.5" {...p} />
        </>
      )}
      {name === 'back' && <Path d="M15 5 8 12l7 7" {...p} />}
    </Svg>
  );
}
