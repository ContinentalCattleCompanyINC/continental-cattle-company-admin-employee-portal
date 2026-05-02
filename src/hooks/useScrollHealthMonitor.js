import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useScrollHealthMonitor(containerRef, pagePath = '') {
  const monitorRef = useRef(null);
  const lastCheckRef = useRef(0);
  const scrollStateRef = useRef({ lastY: 0, lastTime: 0, velocity: 0 });

  useEffect(() => {
    if (!containerRef?.current) return;

    const container = containerRef.current;
    let checkTimeout;

    const detectScrollIssues = () => {
      const now = Date.now();
      const currentY = container.scrollTop;
      const timeDelta = now - scrollStateRef.current.lastTime;
      const posDelta = currentY - scrollStateRef.current.lastY;
      const velocity = timeDelta > 0 ? posDelta / timeDelta : 0;

      // Detect scroll lock: no movement but user is scrolling
      if (Math.abs(velocity) < 0.01 && timeDelta > 100 && posDelta === 0) {
        reportIssue({
          type: 'scroll_lock',
          scrollTop: currentY,
          severity: 'high',
          details: { velocity, lastMovement: timeDelta }
        });
        autoFixScrollLock(container);
      }

      // Detect momentum blocked: sudden stop without user action
      if (Math.abs(velocity) > 2 && timeDelta > 500) {
        reportIssue({
          type: 'momentum_blocked',
          scrollTop: currentY,
          severity: 'medium',
          details: { velocity, stopDuration: timeDelta }
        });
        autoFixMomentum(container);
      }

      scrollStateRef.current = { lastY: currentY, lastTime: now, velocity };
    };

    const reportIssue = async (issue) => {
      if (Date.now() - lastCheckRef.current < 2000) return; // Debounce
      
      lastCheckRef.current = Date.now();
      
      try {
        await base44.functions.invoke('autonomousUIHealthMonitor', {
          scrollIssue: issue,
          pagePath: pagePath || window.location.pathname,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('UI monitor report failed:', error);
      }
    };

    const autoFixScrollLock = (container) => {
      // Force reflow
      container.style.overflow = 'hidden';
      setTimeout(() => {
        container.style.overflow = 'auto';
      }, 50);

      // Reset touch handlers by triggering a synthetic scroll
      const currentScroll = container.scrollTop;
      container.scrollTop = currentScroll + 1;
      setTimeout(() => {
        container.scrollTop = currentScroll;
      }, 25);
    };

    const autoFixMomentum = (container) => {
      // Force webkit momentum restart
      container.style.WebkitOverflowScrolling = 'auto';
      setTimeout(() => {
        container.style.WebkitOverflowScrolling = 'touch';
      }, 100);
    };

    // Monitor on scroll and touch end
    container.addEventListener('scroll', detectScrollIssues, { passive: true });
    container.addEventListener('touchend', () => {
      checkTimeout = setTimeout(detectScrollIssues, 200);
    }, { passive: true });

    return () => {
      container.removeEventListener('scroll', detectScrollIssues);
      container.removeEventListener('touchend', detectScrollIssues);
      clearTimeout(checkTimeout);
    };
  }, [containerRef, pagePath]);
}