import { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startYRef = useRef(0);

  const REFRESH_THRESHOLD = 80;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (container.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (container.scrollTop === 0 && startYRef.current > 0) {
        const pullDist = e.touches[0].clientY - startYRef.current;
        if (pullDist > 0) {
          // Only prevent default if we're actively pulling down (not scrolling up)
          if (pullDist > 10) {
            e.preventDefault();
          }
          setPullDistance(Math.min(pullDist, 150));
        }
      } else {
        // Reset pull when scrolling normally
        startYRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= REFRESH_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
        setPullDistance(0);
      } else {
        setPullDistance(0);
      }
      startYRef.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, false);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-y-auto">
      {/* Pull-to-refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-primary/10 border-b border-primary/20 transition-all"
        style={{
          height: `${Math.min(pullDistance, 80)}px`,
          opacity: pullDistance / 80,
        }}
      >
        <RefreshCw
          className={`w-5 h-5 text-primary transition-transform ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: `rotate(${Math.min(pullDistance / 2, 180)}deg)`,
          }}
        />
      </div>

      {/* Spacer for pull indicator */}
      <div style={{ height: `${pullDistance}px` }} />

      {/* Content */}
      {children}
    </div>
  );
}