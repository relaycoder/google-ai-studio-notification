import { useState, useCallback, RefObject, useEffect, useRef } from 'react';

const POSITION_STORAGE_KEY = 'indicator-position';
const SIZE_STORAGE_KEY = 'indicator-size';

interface Position {
  x: number;
  y: number;
}
interface Size {
  width: number;
  height: number;
}
type Edges = { top: boolean; right: boolean; bottom: boolean; left: boolean };

const EDGE_SENSITIVITY = 8; // px

function initDragInteraction(
  onMove: (e: MouseEvent) => void,
  onEnd: (didMove: boolean) => void
) {
  let didInteract = false;
  const handleMouseMove = (moveEvent: MouseEvent) => {
    didInteract = true;
    onMove(moveEvent);
  };
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    onEnd(didInteract);
  };
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

export function useMovable(
  ref: RefObject<HTMLElement>,
  options: {
    onDragHandleClick?: () => void;
    isResizable?: boolean;
    initialSize?: Size;
    minSize?: Size;
    dragHandleClassName?: string;
  }
) {
  const {
    onDragHandleClick,
    isResizable = false,
    initialSize = { width: 256, height: 300 },
    minSize = { width: 220, height: 150 },
    dragHandleClassName,
  } = options;

  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - (initialSize.width + 20),
    y: 20,
  });
  const [size, setSize] = useState<Size>(initialSize);

  const stateRef = useRef({ position, size });

  useEffect(() => {
    chrome.storage.local.get(
      [POSITION_STORAGE_KEY, SIZE_STORAGE_KEY],
      (result) => {
        const storedPosition = result[POSITION_STORAGE_KEY];
        if (
          storedPosition &&
          typeof storedPosition.x === 'number' &&
          typeof storedPosition.y === 'number'
        ) {
          setPosition(storedPosition);
        }
        const storedSize = result[SIZE_STORAGE_KEY];
        if (
          isResizable &&
          storedSize &&
          typeof storedSize.width === 'number' &&
          typeof storedSize.height === 'number'
        ) {
          setSize(storedSize);
        }
      }
    );
  }, [isResizable]);

  useEffect(() => {
    stateRef.current = { position, size };
  }, [position, size]);

  const getResizeEdges = (
    e: React.MouseEvent<HTMLDivElement>,
    element: HTMLElement
  ): Edges | null => {
    if (!isResizable) return null;
    const rect = element.getBoundingClientRect();
    return {
      top: e.clientY < rect.top + EDGE_SENSITIVITY,
      bottom: e.clientY > rect.bottom - EDGE_SENSITIVITY,
      left: e.clientX < rect.left + EDGE_SENSITIVITY,
      right: e.clientX > rect.right - EDGE_SENSITIVITY,
    };
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only for left mouse button
      if (e.button !== 0) return;

      const element = ref.current;
      if (!element) return;

      const isDragHandle = dragHandleClassName
        ? !!(e.target as HTMLElement).closest(`.${dragHandleClassName}`)
        : true;
      const edges = getResizeEdges(e, element);
      const isResizing =
        edges && (edges.top || edges.bottom || edges.left || edges.right);

      if (isResizing && edges) {
        e.preventDefault();
        e.stopPropagation();

        const startMousePos = { x: e.clientX, y: e.clientY };
        const { position: startElementPos, size: startElementSize } =
          stateRef.current;

        const handleMouseMoveResize = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - startMousePos.x;
          const dy = moveEvent.clientY - startMousePos.y;

          let newWidth = startElementSize.width;
          let newHeight = startElementSize.height;
          let newX = startElementPos.x;
          let newY = startElementPos.y;

          if (edges.right) {
            newWidth = Math.max(minSize.width, startElementSize.width + dx);
          }
          if (edges.left) {
            const proposedWidth = startElementSize.width - dx;
            if (proposedWidth >= minSize.width) {
              newWidth = proposedWidth;
              newX = startElementPos.x + dx;
            }
          }
          if (edges.bottom) {
            newHeight = Math.max(minSize.height, startElementSize.height + dy);
          }
          if (edges.top) {
            const proposedHeight = startElementSize.height - dy;
            if (proposedHeight >= minSize.height) {
              newHeight = proposedHeight;
              newY = startElementPos.y + dy;
            }
          }

          setPosition({ x: newX, y: newY });
          setSize({ width: newWidth, height: newHeight });
        };

        initDragInteraction(handleMouseMoveResize, (didMove) => {
          if (didMove) {
            chrome.storage.local.set({
              [POSITION_STORAGE_KEY]: stateRef.current.position,
              [SIZE_STORAGE_KEY]: stateRef.current.size,
            });
          }
        });
      } else if (isDragHandle) {
        e.preventDefault();
        const startMousePos = { x: e.clientX, y: e.clientY };
        const { position: startElementPos } = stateRef.current;

        const handleMouseMoveDrag = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - startMousePos.x;
          const dy = moveEvent.clientY - startMousePos.y;
          setPosition({
            x: startElementPos.x + dx,
            y: startElementPos.y + dy,
          });
        };

        initDragInteraction(handleMouseMoveDrag, (didMove) => {
          if (didMove) {
            chrome.storage.local.set({
              [POSITION_STORAGE_KEY]: stateRef.current.position,
            });
          } else if (onDragHandleClick) {
            onDragHandleClick();
          }
        });
      }
    },
    [
      ref,
      isResizable,
      minSize.width,
      minSize.height,
      onDragHandleClick,
      dragHandleClassName,
    ]
  );

  const handleMouseMoveForCursor = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isResizable || e.buttons > 0) return;
      const element = ref.current;
      if (!element) return;
      const edges = getResizeEdges(e, element);
      if (!edges) return;

      let cursor = 'auto';
      if (edges.top && edges.left) cursor = 'nwse-resize';
      else if (edges.top && edges.right) cursor = 'nesw-resize';
      else if (edges.bottom && edges.left) cursor = 'nesw-resize';
      else if (edges.bottom && edges.right) cursor = 'nwse-resize';
      else if (edges.left || edges.right) cursor = 'ew-resize';
      else if (edges.top || edges.bottom) cursor = 'ns-resize';

      if (cursor === 'auto') {
        const isDragHandle = dragHandleClassName
          ? !!(e.target as HTMLElement).closest(`.${dragHandleClassName}`)
          : false;
        if (isDragHandle) {
          cursor = 'grab';
        }
      }

      // To avoid flickering, only set cursor if it needs to change
      if (element.style.cursor !== cursor) {
        element.style.cursor = cursor;
      }
    },
    [ref, isResizable, dragHandleClassName]
  );

  return { position, size, handleMouseDown, handleMouseMoveForCursor };
}