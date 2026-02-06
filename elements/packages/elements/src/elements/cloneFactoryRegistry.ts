import type { EFTimegroup } from "./EFTimegroup.js";

export type CloneFactoryResult = {
  timegroup: EFTimegroup;
  cleanup: () => void;
};

export type CloneFactory = (container: HTMLElement) => CloneFactoryResult;

const registry = new WeakMap<EFTimegroup, CloneFactory>();

export function registerCloneFactory(
  element: EFTimegroup,
  factory: CloneFactory,
): void {
  registry.set(element, factory);
}

export function unregisterCloneFactory(element: EFTimegroup): void {
  registry.delete(element);
}

export function getCloneFactory(
  element: EFTimegroup,
): CloneFactory | undefined {
  return registry.get(element);
}
