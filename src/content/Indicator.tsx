import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useMovable } from './useMovable';
import { statusConfig, connectionStatusConfig } from './constants';
import type {
  IndicatorProps,
  RunHistoryEntry,
  TabState,
  ConnectionStatus,
} from '../types';

function formatElapsedTime(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  return `${paddedMinutes}:${paddedSeconds}`;
}

function HistoryEntry({
  entry,
  onNavigate,
}: {
  entry: RunHistoryEntry;
  onNavigate: () => void;
}) {
  return (
    <button
      className="flex items-center justify-between text-xs w-full px-2 py-1 hover:bg-white/10 rounded text-left"
      onClick={onNavigate}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`truncate font-mono ${
            entry.status === 'stopped' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {new Date(entry.endTime).toLocaleString(undefined, {
            year: '2-digit',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <span className="font-mono text-gray-400 pl-2">
        {formatElapsedTime(entry.durationMs)}
      </span>
    </button>
  );
}

const SIDEBAR_WIDTH_STORAGE_KEY = 'indicator-sidebar-width';
const MIN_SIDEBAR_WIDTH = 100;
const MIN_CONTENT_WIDTH = 200;

function Indicator({
  currentTabState,
  allTabsState,
  connectionStatus,
  onPauseResume,
  onClose,
  onNavigate,
}: IndicatorProps) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTabIdForHistory, setSelectedTabIdForHistory] =
    useState<number | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(160);

  const sidebarWidthRef = useRef(sidebarWidth);
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    chrome.storage.local.get(SIDEBAR_WIDTH_STORAGE_KEY, (result) => {
      if (
        result[SIDEBAR_WIDTH_STORAGE_KEY] &&
        typeof result[SIDEBAR_WIDTH_STORAGE_KEY] === 'number'
      ) {
        setSidebarWidth(result[SIDEBAR_WIDTH_STORAGE_KEY]);
      }
    });
  }, []);

  const historyTabs = useMemo<TabState[]>(
    () =>
      Object.values(allTabsState)
        .filter((tab) => tab.history.length > 0)
        .sort((a, b) => {
          const aLast = a.history[0]?.endTime ?? 0;
          const bLast = b.history[0]?.endTime ?? 0;
          return bLast - aLast;
        }),
    [allTabsState]
  );

  useEffect(() => {
    if (isExpanded) {
      const isSelectionValid = historyTabs.some(
        (t) => t.tabId === selectedTabIdForHistory
      );

      if (!isSelectionValid) {
        if (historyTabs.find((t) => t.tabId === currentTabState.tabId)) {
          setSelectedTabIdForHistory(currentTabState.tabId);
        } else if (historyTabs.length > 0) {
          setSelectedTabIdForHistory(historyTabs[0].tabId);
        } else {
          // No history, so collapse
          setIsExpanded(false);
        }
      }
    } else {
      setSelectedTabIdForHistory(null);
    }
  }, [isExpanded, historyTabs, currentTabState.tabId, selectedTabIdForHistory]);

  const handleToggleExpand = useCallback(() => {
    // Only allow expanding if there is history to show
    if (historyTabs.length > 0) {
      setIsExpanded((expanded) => !expanded);
    }
  }, [historyTabs]);

  const { position, size, handleMouseDown, handleMouseMoveForCursor } =
    useMovable(indicatorRef, {
      onDragHandleClick: handleToggleExpand,
      isResizable: isExpanded,
      dragHandleClassName: 'drag-handle',
      initialSize: { width: 550, height: 400 },
      minSize: {
        width: MIN_SIDEBAR_WIDTH + MIN_CONTENT_WIDTH + 6, // 6px for resizer
        height: 250,
      },
    });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleMouseDownResizeSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const totalWidth =
        indicatorRef.current?.getBoundingClientRect().width ?? 0;
      const dx = moveEvent.clientX - startX;
      let newWidth = startWidth + dx;

      if (newWidth < MIN_SIDEBAR_WIDTH) {
        newWidth = MIN_SIDEBAR_WIDTH;
      }
      if (totalWidth && newWidth > totalWidth - MIN_CONTENT_WIDTH - 6) {
        // 6px for resizer
        newWidth = totalWidth - MIN_CONTENT_WIDTH - 6;
      }
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      chrome.storage.local.set({
        [SIDEBAR_WIDTH_STORAGE_KEY]: sidebarWidthRef.current,
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
    // Preload audio element when component mounts
    const soundUrl = chrome.runtime.getURL('notification.mp3');
    audioRef.current = new Audio(soundUrl);
  }, []);

  useEffect(() => {
    if (currentTabState?.status === 'stopped') {
      audioRef.current
        ?.play()
        .catch((err) => console.error('Audio play failed: ', err));
    }
  }, [currentTabState?.status]);

  if (!currentTabState) {
    return null;
  }

  const isConnected = connectionStatus === 'connected';

  const config = isConnected
    ? statusConfig[currentTabState.status]
    : connectionStatusConfig[connectionStatus];

  const isPausable =
    isConnected &&
    (currentTabState.status === 'running' ||
      currentTabState.status === 'paused' ||
      currentTabState.status === 'monitoring');

  const totalRuns = historyTabs.reduce(
    (sum, tab) => sum + tab.history.length,
    0
  );
  const totalDuration = historyTabs.reduce(
    (sum: number, tab: TabState) =>
      sum +
      tab.history.reduce(
        (tabSum: number, run: RunHistoryEntry) => tabSum + run.durationMs,
        0
      ),
    0
  );
  const avgDuration = totalRuns > 0 ? totalDuration / totalRuns : 0;

  return (
    <div
      ref={indicatorRef}
      className="fixed top-0 left-0 z-[99999] rounded-lg shadow-lg text-white font-sans select-none flex flex-col"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        backdropFilter: 'blur(4px)',
        width: isExpanded ? `${size.width}px` : '256px',
        height: isExpanded ? `${size.height}px` : 'auto',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMoveForCursor}
    >
      <div className="drag-handle flex items-center gap-3 p-2 cursor-grab flex-shrink-0">
        <div className="flex items-center gap-2 flex-grow min-w-0">
          <span
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              config.bgColor
            } ${config.animate ? 'animate-pulse' : ''}`}
          ></span>
          <span className="text-sm font-medium truncate">
            {isConnected
              ? currentTabState.runName
                ? currentTabState.runName
                : config.text
              : config.text}
          </span>
          {isConnected &&
            (currentTabState.status === 'running' ||
              currentTabState.status === 'paused' ||
              currentTabState.status === 'stopped') && (
              <span className="text-sm font-mono text-gray-300">
                {formatElapsedTime(currentTabState.elapsedTime)}
              </span>
            )}
        </div>
        <div className="flex items-center flex-shrink-0">
          {isPausable && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onPauseResume}
              className="text-gray-400 hover:text-white cursor-pointer p-1 rounded-full"
              title={currentTabState.status === 'paused' ? 'Resume' : 'Pause'}
            >
              {currentTabState.status === 'running' ||
              currentTabState.status === 'monitoring' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="block"
                >
                  <path d="M14 19h4V5h-4v14zm-8 0h4V5H6v14z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="block"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer p-1 rounded-full"
            title="Hide Indicator"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="block"
            >
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        </div>
      </div>
      {isConnected &&
        currentTabState.status === 'error' &&
        currentTabState.error && (
          <p className="text-xs text-red-400 px-2 pb-2 -mt-1">
            {currentTabState.error}
          </p>
        )}

      {/* Expanded History View */}
      {isConnected && isExpanded && (
        <>
          <div className="flex-grow flex border-t border-white/20 min-h-0">
            {/* Sidebar */}
            <div
              className="overflow-y-auto flex-shrink-0 flex flex-col py-1"
              style={{ width: `${sidebarWidth}px` }}
            >
              {historyTabs.map((tab) => {
                const tabDisplayName =
                  tab.history[0]?.runName || `Tab ${tab.tabId}`;
                const isSelected = selectedTabIdForHistory === tab.tabId;
                return (
                  <button
                    key={tab.tabId}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        onNavigate(tab.tabId, tab.windowId);
                        e.preventDefault();
                      } else {
                        setSelectedTabIdForHistory(tab.tabId);
                      }
                    }}
                    className={`w-full text-left p-2 text-xs ${
                      isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                    title={`${tabDisplayName}\n(Ctrl+Click to go to tab)`}
                  >
                    <div className="flex items-center gap-2 font-bold text-gray-200">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          statusConfig[tab.status].bgColor
                        } ${
                          statusConfig[tab.status].animate
                            ? 'animate-pulse'
                            : ''
                        }`}
                      ></span>
                      <span className="truncate">{tabDisplayName}</span>
                    </div>
                    <div className="text-gray-400 pl-4">
                      {tab.history.length} run
                      {tab.history.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Resizer */}
            <div
              onMouseDown={handleMouseDownResizeSidebar}
              className="w-1.5 flex-shrink-0 cursor-col-resize bg-white/10 hover:bg-white/20 transition-colors"
            ></div>

            {/* Main Content */}
            <div className="flex-grow overflow-y-auto">
              {(() => {
                const selectedTabData = selectedTabIdForHistory
                  ? allTabsState[selectedTabIdForHistory]
                  : null;

                if (!selectedTabData) {
                  return (
                    <p className="text-xs text-gray-400 text-center py-4">
                      Select a tab to view its history.
                    </p>
                  );
                }

                return (
                  <div className="flex flex-col gap-0.5 p-2">
                    {selectedTabData.history.map((entry) => (
                      <HistoryEntry
                        key={entry.id}
                        entry={entry}
                        onNavigate={() =>
                          onNavigate(
                            selectedTabData.tabId,
                            selectedTabData.windowId
                          )
                        }
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
          {historyTabs.length > 0 ? (
            <div className="flex-shrink-0 text-xs text-gray-400 px-3 py-1.5 border-t border-white/20 flex justify-between">
              <span>
                Total Runs:{' '}
                <span className="font-medium text-gray-300">{totalRuns}</span>
              </span>
              <span>
                Avg:{' '}
                <span className="font-mono font-medium text-gray-300">
                  {formatElapsedTime(avgDuration)}
                </span>
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default Indicator;