import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useEffect, useRef } from 'react';
import type { EFTimegroup } from '@editframe/elements';

interface TimelineRootProps {
  /** Unique identifier for the root timegroup */
  id: string;
  /** 
   * React component that renders the timeline content (must include a Timegroup at root).
   * The component will receive { id: string } as a prop, which should be passed to the Timegroup.
   */
  component: React.ComponentType<{ id?: string }>;
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
 * This component enables proper clone rendering by providing a factory pattern
 * for creating fully functional timeline instances. When render clones are created
 * (for exports, thumbnails, etc.), the initializer re-renders the React component
 * tree to ensure all JavaScript state and React lifecycle methods work correctly.
 * 
 * @example
 * ```tsx
 * const MyTimelineContent = () => (
 *   <Timegroup mode="sequence">
 *     <MyScenes />
 *   </Timegroup>
 * );
 * 
 * // Wrap with Configuration if needed
 * <Configuration apiHost="...">
 *   <TimelineRoot id="root" component={MyTimelineContent} />
 * </Configuration>
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
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Find the root timegroup rendered by Component
    const timegroup = container.querySelector('ef-timegroup') as EFTimegroup;
    if (!timegroup) {
      console.warn('[TimelineRoot] No ef-timegroup found in component. Ensure your component renders a Timegroup.');
      return;
    }
    
    // Register factory initializer - MUST be synchronous
    // Uses flushSync to force React to render synchronously
    timegroup.initializer = (cloneEl: EFTimegroup) => {
      const cloneContainer = cloneEl.parentElement;
      if (!cloneContainer) {
        console.error('[TimelineRoot] No parent container for clone');
        return;
      }
      
      // Remove the cloned DOM - React will render a fresh component tree
      // The cloned DOM doesn't have React bindings, so we need to replace it
      cloneEl.remove();
      
      // Create React root for the clone container
      const root = ReactDOM.createRoot(cloneContainer);
      
      // Use flushSync to render synchronously (required by initializer contract)
      // This ensures the component tree is fully rendered before initializer returns
      flushSync(() => {
        root.render(<Component id={id} />);
      });
      
      // Find the new timegroup rendered by React and store the React root on it
      // This is needed for cleanup in createRenderClone
      const newTimegroup = cloneContainer.querySelector('ef-timegroup');
      if (newTimegroup) {
        (newTimegroup as any)._reactRoot = root;
      } else {
        // Store root on container so we can still clean up
        (cloneContainer as any)._reactRoot = root;
        console.error('[TimelineRoot] No ef-timegroup found after React render');
      }
    };
    
    // Cleanup: remove initializer when component unmounts
    return () => {
      timegroup.initializer = undefined;
    };
  }, [id, Component]);
  
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

