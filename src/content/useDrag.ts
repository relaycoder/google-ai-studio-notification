import { useState, useCallback, RefObject } from 'react';

interface Position {
  x: number;
  y: number;
}

export function useDrag(ref: RefObject<HTMLElement>) {
  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - 250, // Initial position top-right
    y: 20,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Prevents text selection while dragging
      e.preventDefault();

      const startPos = { x: e.clientX, y: e.clientY };
      const element = ref.current;
      if (!element) return;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startPos.x;
        const dy = moveEvent.clientY - startPos.y;
        setPosition({
          x: position.x + dx,
          y: position.y + dy,
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [position.x, position.y, ref]
  );

  return {
    position,
    setPosition, // Expose setPosition for potential programmatic updates
    handleMouseDown,
  };
}