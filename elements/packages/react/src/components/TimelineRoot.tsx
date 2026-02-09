import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useEffect, useRef } from 'react';
import {
  registerCloneFactory,
  unregisterCloneFactory,
  type EFTimegroup,
} from '@editframe/elements';

interface TimelineRootProps {
  /** 
   * Unique identifier used for playback control targeting (Preview, Scrubber, TogglePlay).
   * Also passed as `id` prop to the component for clone rendering.
   */
  id: string;
  /** 
   * React component that renders the timeline content (must include a Timegroup at root).
   */
  component: React.ComponentType<Record<string, unknown>>;
  /** Optional CSS class name for the container */
  className?: string;
  /** Optional inline styles for the container */
  style?: React.CSSProperties;
  /** Optional children to render alongside the component (e.g., Configuration wrapper) */
  children?: React.ReactNode;
}

/**
 * TimelineRoot - Factory wrapper for React-based timelines.
 * 
 * This component enables proper clone rendering by registering a clone factory
 * for the managed ef-timegroup element. When render clones are needed
 * (for exports, thumbnails, etc.), the factory mounts a fresh React component
 * tree — producing a fully functional second instance with all hooks, state,
 * and effects running.
 * 
 * This is necessary because React DOM cannot be cloned via cloneNode() —
 * cloned elements are dead HTML without React's fiber tree behind them.
 * The factory pattern ensures each clone is a real React mount.
 * 
 * @example
 * ```tsx
 * const MyTimeline = () => (
 *   <Timegroup mode="sequence">
 *     <MyScenes />
 *   </Timegroup>
 * );
 * 
 * <TimelineRoot id="root" component={MyTimeline} />
 * ```
 */
export const TimelineRoot: React.FC<TimelineRootProps> = ({
  id,
  component: Component,
  className,
  style,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentRef = useRef(Component);
  componentRef.current = Component;
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Find the root timegroup rendered by Component
    const timegroup = container.querySelector('ef-timegroup') as EFTimegroup;
    if (!timegroup) {
      throw new Error(
        '[TimelineRoot] No ef-timegroup found in component. ' +
        'Ensure your component renders a Timegroup.'
      );
    }
    
    // Register a clone factory for this element.
    // When createRenderClone is called, it will use this factory
    // to mount a fresh React tree instead of cloning dead DOM.
    registerCloneFactory(timegroup, (cloneContainer: HTMLElement) => {
      const root = ReactDOM.createRoot(cloneContainer);
      const Comp = componentRef.current;
      flushSync(() => {
        root.render(<Comp id={id} />);
      });
      
      const newTimegroup = cloneContainer.querySelector('ef-timegroup') as EFTimegroup | null;
      if (!newTimegroup) {
        throw new Error(
          '[TimelineRoot] Clone factory did not produce an ef-timegroup. ' +
          'Ensure your component renders a Timegroup.'
        );
      }
      
      return {
        timegroup: newTimegroup,
        cleanup: () => {
          queueMicrotask(() => {
            root.unmount();
          });
        },
      };
    });
    
    return () => {
      unregisterCloneFactory(timegroup);
    };
  }, [id]);
  
  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ display: 'contents', ...style }}
    >
      {children}
      <Component id={id} />
    </div>
  );
};
