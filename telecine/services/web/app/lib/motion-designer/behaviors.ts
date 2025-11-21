import type { MotionDesignerState } from "./types.js";

/**
 * A behavior that can validate and react to element move operations.
 */
export interface MoveBehavior {
  /**
   * Determines if a move operation is allowed.
   * 
   * @param elementId The ID of the element being moved
   * @param newParentId The ID of the new parent (null for root)
   * @param newIndex The new index within the parent's children (undefined to append)
   * @param state The current motion designer state
   * @returns true if the move is allowed, false otherwise
   */
  canMove(
    elementId: string,
    newParentId: string | null,
    newIndex: number | undefined,
    state: MotionDesignerState,
  ): boolean;

  /**
   * Called after a move operation has been successfully executed.
   * Can be used for side effects like logging, validation, or cleanup.
   * 
   * @param elementId The ID of the element that was moved
   * @param newParentId The ID of the new parent (null for root)
   * @param newIndex The new index within the parent's children
   * @param state The new motion designer state after the move
   */
  onMove?(
    elementId: string,
    newParentId: string | null,
    newIndex: number | undefined,
    state: MotionDesignerState,
  ): void | Promise<void>;
}

/**
 * Registry for move behaviors.
 * 
 * Behaviors are checked in registration order. If any behavior returns false
 * from canMove(), the move is rejected.
 */
export class BehaviorRegistry {
  private behaviors: Map<string, MoveBehavior> = new Map();

  /**
   * Registers a behavior with a name.
   * 
   * @param name Unique name for the behavior
   * @param behavior The behavior to register
   */
  register(name: string, behavior: MoveBehavior): void {
    if (this.behaviors.has(name)) {
      console.warn(`Behavior "${name}" is already registered. Overwriting.`);
    }
    this.behaviors.set(name, behavior);
  }

  /**
   * Unregisters a behavior by name.
   * 
   * @param name The name of the behavior to unregister
   */
  unregister(name: string): void {
    this.behaviors.delete(name);
  }

  /**
   * Checks if a move operation is allowed by all registered behaviors.
   * 
   * @param elementId The ID of the element being moved
   * @param newParentId The ID of the new parent (null for root)
   * @param newIndex The new index within the parent's children (undefined to append)
   * @param state The current motion designer state
   * @returns true if all behaviors allow the move, false otherwise
   */
  canMove(
    elementId: string,
    newParentId: string | null,
    newIndex: number | undefined,
    state: MotionDesignerState,
  ): boolean {
    for (const [name, behavior] of this.behaviors) {
      try {
        const allowed = behavior.canMove(elementId, newParentId, newIndex, state);
        if (!allowed) {
          return false;
        }
      } catch (error) {
        console.error(`Error in behavior "${name}".canMove():`, error);
        return false;
      }
    }
    return true;
  }

  /**
   * Executes onMove callbacks for all registered behaviors.
   * 
   * @param elementId The ID of the element that was moved
   * @param newParentId The ID of the new parent (null for root)
   * @param newIndex The new index within the parent's children
   * @param state The new motion designer state after the move
   */
  async onMove(
    elementId: string,
    newParentId: string | null,
    newIndex: number | undefined,
    state: MotionDesignerState,
  ): Promise<void> {
    for (const [name, behavior] of this.behaviors) {
      if (behavior.onMove) {
        try {
          await behavior.onMove(elementId, newParentId, newIndex, state);
        } catch (error) {
          console.error(`Error in behavior "${name}".onMove():`, error);
        }
      }
    }
  }

  /**
   * Gets the number of registered behaviors.
   */
  get size(): number {
    return this.behaviors.size;
  }

  /**
   * Clears all registered behaviors.
   */
  clear(): void {
    this.behaviors.clear();
  }
}

/**
 * Default behavior registry instance.
 */
export const behaviorRegistry = new BehaviorRegistry();



