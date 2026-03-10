import React from "react";

let isomorphicEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function setIsomorphicEffect(effect: typeof React.useLayoutEffect | typeof React.useEffect) {
  isomorphicEffect = effect;
}

const reservedReactProperties = new Set(["children", "localName", "ref", "style", "className"]);
const listenedEvents = new WeakMap<Element, Map<string, EventListenerObject>>();

type Constructor<T> = { new (): T };

/**
 * Branded string that carries the DOM event type at the type level.
 * At runtime it's just a string (the DOM event name).
 */
export type EventName<T extends Event = Event> = string & { __eventType?: T };

type EventNames = Record<string, EventName>;

type EventListeners<E extends EventNames> = {
  [K in keyof E]?: (e: E[K] extends EventName<infer T> ? T : Event) => void;
};

type ElementProps<I> = Partial<Omit<I, keyof HTMLElement>>;
type ComponentProps<I, E extends EventNames = {}> = Omit<
  React.HTMLAttributes<I>,
  keyof E | keyof ElementProps<I>
> &
  EventListeners<E> &
  ElementProps<I>;

export type ReactWebComponent<
  I extends HTMLElement,
  E extends EventNames = {},
> = React.ForwardRefExoticComponent<ComponentProps<I, E> & React.RefAttributes<I>>;

export interface Options<I extends HTMLElement, E extends EventNames = {}> {
  react: typeof React;
  tagName: string;
  elementClass: Constructor<I>;
  events?: E;
  displayName?: string;
}

function addOrUpdateEventListener(node: Element, event: string, listener?: (e?: Event) => void) {
  let events = listenedEvents.get(node);
  if (!events) {
    events = new Map();
    listenedEvents.set(node, events);
  }
  let handler = events.get(event);

  if (listener) {
    if (!handler) {
      handler = { handleEvent: listener };
      events.set(event, handler);
      node.addEventListener(event, handler);
    } else {
      handler.handleEvent = listener;
    }
  } else if (handler) {
    events.delete(event);
    node.removeEventListener(event, handler);
  }
}

function setProperty<E extends Element>(
  node: E,
  name: string,
  value: unknown,
  old: unknown,
  events?: EventNames,
) {
  const event = events?.[name];
  if (event) {
    if (value !== old) addOrUpdateEventListener(node, event, value as (e?: Event) => void);
    return;
  }
  node[name as keyof E] = value as E[keyof E];
  if ((value === undefined || value === null) && name in HTMLElement.prototype) {
    node.removeAttribute(name);
  }
}

export function createComponent<I extends HTMLElement, E extends EventNames = {}>({
  react: React,
  tagName,
  elementClass,
  events,
  displayName,
}: Options<I, E>): ReactWebComponent<I, E> {
  const eventProps = new Set(Object.keys(events ?? {}));

  const ReactComponent = React.forwardRef<I, ComponentProps<I, E>>((props, ref) => {
    const elementRef = React.useRef<I | null>(null);
    const prevPropsRef = React.useRef(new Map<string, unknown>());

    const reactProps: Record<string, unknown> = {
      suppressHydrationWarning: true,
    };
    const elementProps: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(props)) {
      if (reservedReactProperties.has(k)) {
        reactProps[k === "className" ? "class" : k] = v;
        continue;
      }
      if (eventProps.has(k) || k in elementClass.prototype) {
        elementProps[k] = v;
        continue;
      }
      reactProps[k] = v;
    }

    isomorphicEffect(() => {
      if (!elementRef.current) return;
      const newProps = new Map<string, unknown>();
      for (const key in elementProps) {
        setProperty(
          elementRef.current,
          key,
          props[key as keyof typeof props],
          prevPropsRef.current.get(key),
          events,
        );
        prevPropsRef.current.delete(key);
        newProps.set(key, props[key as keyof typeof props]);
      }
      for (const [key, value] of prevPropsRef.current) {
        setProperty(elementRef.current, key, undefined, value, events);
      }
      prevPropsRef.current = newProps;

      // Remove defer-hydration if present
      elementRef.current.removeAttribute("defer-hydration");
    }, [props]);

    return React.createElement(tagName, {
      ...reactProps,
      ref: (node: I) => {
        elementRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
    });
  });

  ReactComponent.displayName = displayName ?? elementClass.name;
  return ReactComponent as ReactWebComponent<I, E>;
}
