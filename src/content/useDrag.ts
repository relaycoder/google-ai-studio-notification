import { useState, useCallback, RefObject, useEffect, useRef } from 'react';

const STORAGE_KEY = 'indicator-position';

interface Position {
  x: number;
  y: number;
}

export function useDrag(ref: RefObject<HTMLElement>) {
  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - 250, // Initial position top-right
    y: 20,
  });
  const positionRef = useRef(position);

  // Load position from storage on initial mount
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (
        result[STORAGE_KEY] &&
        typeof result[STORAGE_KEY].x === 'number' &&
        typeof result[STORAGE_KEY].y === 'number'
      ) {
        setPosition(result[STORAGE_KEY]);
      }
    });
  }, []); // Empty dependency array ensures this runs only once on mount

  // Keep ref in sync with state for access in callbacks
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Prevents text selection while dragging
      e.preventDefault();

      const startPos = { x: e.clientX, y: e.clientY };
      const elementStartPos = positionRef.current; // Use ref to get position at drag start
      const element = ref.current;
      if (!element) return;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startPos.x;
        const dy = moveEvent.clientY - startPos.y;
        setPosition({
          x: elementStartPos.x + dx,
          y: elementStartPos.y + dy,
        });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // On mouse up, the drag is over. The `position` state has been updated
        // by the last `handleMouseMove`. The `useEffect` listening to `position`
        // will have updated `positionRef.current`. We can now save it.
        chrome.storage.local.set({ [STORAGE_KEY]: positionRef.current });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [ref] // No dependency on `position` state
  );

  return {
    position,
    setPosition, // Expose setPosition for potential programmatic updates
    handleMouseDown,
  };
}