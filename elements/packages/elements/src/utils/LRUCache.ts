/**
 * A simple LRU (Least Recently Used) cache implementation
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Refresh position by removing and re-adding
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (first item in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Size-aware LRU cache that tracks memory usage in bytes
 * Evicts entries when total size exceeds the maximum
 */
export class SizeAwareLRUCache<K> {
  private cache = new Map<K, Promise<ArrayBuffer>>();
  private sizes = new Map<K, number>();
  private currentSize = 0;
  private readonly maxSizeBytes: number;

  constructor(maxSizeBytes: number) {
    this.maxSizeBytes = maxSizeBytes;
  }

  get(key: K): Promise<ArrayBuffer> | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Refresh position by removing and re-adding
      const size = this.sizes.get(key) || 0;
      this.cache.delete(key);
      this.cache.set(key, value);
      this.sizes.delete(key);
      this.sizes.set(key, size);
    }
    return value;
  }

  set(key: K, value: Promise<ArrayBuffer>): void {
    // If key already exists, remove it first
    if (this.cache.has(key)) {
      const oldSize = this.sizes.get(key) || 0;
      this.currentSize -= oldSize;
      this.cache.delete(key);
      this.sizes.delete(key);
    }

    // Track the size when the promise resolves
    const sizeTrackingPromise = value
      .then((buffer) => {
        const bufferSize = buffer.byteLength;
        this.sizes.set(key, bufferSize);
        this.currentSize += bufferSize;

        // Evict oldest entries if we exceed the size limit
        this.evictIfNecessary();

        return buffer;
      })
      .catch((error) => {
        // If the promise fails, clean up the entry
        this.cache.delete(key);
        this.sizes.delete(key);
        throw error;
      });

    // Suppress unhandled rejection on the derived promise. This promise sits in
    // the cache and may reject before any caller retrieves and awaits it.
    // Zone.js checks for handlers synchronously at rejection time — without this,
    // the re-thrown error triggers an unhandledrejection event. Callers who later
    // await the cached promise still see the rejection (this just adds a no-op branch).
    sizeTrackingPromise.catch(() => {});

    this.cache.set(key, sizeTrackingPromise);
  }

  private evictIfNecessary(): void {
    while (this.currentSize > this.maxSizeBytes && this.cache.size > 0) {
      // Remove oldest entry (first item in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const size = this.sizes.get(firstKey) || 0;
        this.currentSize -= size;
        this.cache.delete(firstKey);
        this.sizes.delete(firstKey);
      } else {
        break;
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    const size = this.sizes.get(key) || 0;
    this.currentSize -= size;
    this.sizes.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.sizes.clear();
    this.currentSize = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  get currentSizeBytes(): number {
    return this.currentSize;
  }

  get maxSize(): number {
    return this.maxSizeBytes;
  }
}

/**
 * Red-Black Tree node colors
 */
enum Color {
  RED = "RED",
  BLACK = "BLACK",
}

/**
 * Red-Black Tree node for ordered key storage
 */
class RBTreeNode<K> {
  constructor(
    public key: K,
    public color: Color = Color.RED,
    public left: RBTreeNode<K> | null = null,
    public right: RBTreeNode<K> | null = null,
    public parent: RBTreeNode<K> | null = null,
  ) {}
}

/**
 * Red-Black Tree implementation for O(log n) operations
 * Supports insert, delete, search, range queries, and nearest neighbor
 */
class RedBlackTree<K> {
  private root: RBTreeNode<K> | null = null;
  private readonly compareFn: (a: K, b: K) => number;

  constructor(compareFn: (a: K, b: K) => number) {
    this.compareFn = compareFn;
  }

  insert(key: K): void {
    const node = new RBTreeNode(key);

    if (!this.root) {
      this.root = node;
      node.color = Color.BLACK;
      return;
    }

    this.insertNode(node);
    this.fixInsert(node);
  }

  delete(key: K): boolean {
    const node = this.findNode(key);
    if (!node) return false;

    this.deleteNode(node);
    return true;
  }

  find(key: K): K | null {
    const node = this.findNode(key);
    return node ? node.key : null;
  }

  findNearestInRange(center: K, distance: K): K[] {
    // Calculate the range bounds
    const start = this.subtractDistance(center, distance);
    const end = this.addDistance(center, distance);

    // Use existing range search (O(log n + k))
    return this.findRange(start, end);
  }

  private subtractDistance(center: K, distance: K): K {
    if (typeof center === "number" && typeof distance === "number") {
      return (center - distance) as K;
    }

    // For strings, we can't easily subtract distance, so just return center
    // This means string searches will be exact matches only
    return center;
  }

  private addDistance(center: K, distance: K): K {
    if (typeof center === "number" && typeof distance === "number") {
      return (center + distance) as K;
    }

    // For strings, we can't easily add distance, so just return center
    // This means string searches will be exact matches only
    return center;
  }

  findRange(start: K, end: K): K[] {
    const result: K[] = [];
    this.inorderRange(this.root, start, end, result);
    return result;
  }

  getAllSorted(): K[] {
    const result: K[] = [];
    this.inorder(this.root, result);
    return result;
  }

  private findNode(key: K): RBTreeNode<K> | null {
    let current = this.root;

    while (current) {
      const cmp = this.compareFn(key, current.key);
      if (cmp === 0) return current;
      current = cmp < 0 ? current.left : current.right;
    }

    return null;
  }

  private insertNode(node: RBTreeNode<K>): void {
    let parent = null;
    let current = this.root;

    while (current) {
      parent = current;
      const cmp = this.compareFn(node.key, current.key);
      current = cmp < 0 ? current.left : current.right;
    }

    node.parent = parent;
    if (!parent) {
      this.root = node;
    } else {
      const cmp = this.compareFn(node.key, parent.key);
      if (cmp < 0) {
        parent.left = node;
      } else {
        parent.right = node;
      }
    }
  }

  private fixInsert(node: RBTreeNode<K>): void {
    while (node.parent && node.parent.color === Color.RED) {
      if (node.parent === node.parent.parent?.left) {
        const uncle = node.parent.parent.right;

        if (uncle?.color === Color.RED) {
          node.parent.color = Color.BLACK;
          uncle.color = Color.BLACK;
          node.parent.parent.color = Color.RED;
          node = node.parent.parent;
        } else {
          if (node === node.parent.right) {
            node = node.parent;
            this.rotateLeft(node);
          }

          if (node.parent) {
            node.parent.color = Color.BLACK;
            if (node.parent.parent) {
              node.parent.parent.color = Color.RED;
              this.rotateRight(node.parent.parent);
            }
          }
        }
      } else {
        const uncle = node.parent.parent?.left;

        if (uncle?.color === Color.RED) {
          node.parent.color = Color.BLACK;
          uncle.color = Color.BLACK;
          if (node.parent.parent) {
            node.parent.parent.color = Color.RED;
            node = node.parent.parent;
          }
        } else {
          if (node === node.parent.left) {
            node = node.parent;
            this.rotateRight(node);
          }

          if (node.parent) {
            node.parent.color = Color.BLACK;
            if (node.parent.parent) {
              node.parent.parent.color = Color.RED;
              this.rotateLeft(node.parent.parent);
            }
          }
        }
      }
    }

    if (this.root) {
      this.root.color = Color.BLACK;
    }
  }

  private deleteNode(node: RBTreeNode<K>): void {
    let y = node;
    let yOriginalColor = y.color;
    let x: RBTreeNode<K> | null;

    if (!node.left) {
      x = node.right;
      this.transplant(node, node.right);
    } else if (!node.right) {
      x = node.left;
      this.transplant(node, node.left);
    } else {
      y = this.minimum(node.right);
      yOriginalColor = y.color;
      x = y.right;

      if (y.parent === node) {
        if (x) x.parent = y;
      } else {
        this.transplant(y, y.right);
        y.right = node.right;
        if (y.right) y.right.parent = y;
      }

      this.transplant(node, y);
      y.left = node.left;
      if (y.left) y.left.parent = y;
      y.color = node.color;
    }

    if (yOriginalColor === Color.BLACK && x) {
      this.fixDelete(x);
    }
  }

  private fixDelete(node: RBTreeNode<K>): void {
    while (node !== this.root && node.color === Color.BLACK) {
      if (node === node.parent?.left) {
        let sibling = node.parent.right;

        if (sibling?.color === Color.RED) {
          sibling.color = Color.BLACK;
          node.parent.color = Color.RED;
          this.rotateLeft(node.parent);
          sibling = node.parent.right;
        }

        if (sibling?.left?.color !== Color.RED && sibling?.right?.color !== Color.RED) {
          if (sibling) {
            sibling.color = Color.RED;
          }
          node = node.parent;
        } else {
          if (sibling?.right?.color !== Color.RED) {
            if (sibling.left) sibling.left.color = Color.BLACK;
            sibling.color = Color.RED;
            this.rotateRight(sibling);
            sibling = node.parent.right;
          }

          if (sibling) {
            sibling.color = node.parent.color;
            node.parent.color = Color.BLACK;
            if (sibling.right) sibling.right.color = Color.BLACK;
            this.rotateLeft(node.parent);
          }
          if (!this.root) {
            throw new Error("Root is null");
          }
          node = this.root;
        }
      } else {
        let sibling = node.parent?.left;

        if (sibling?.color === Color.RED) {
          sibling.color = Color.BLACK;
          if (node.parent) node.parent.color = Color.RED;
          if (node.parent) this.rotateRight(node.parent);
          sibling = node.parent?.left;
        }

        if (sibling?.right?.color !== Color.RED && sibling?.left?.color !== Color.RED) {
          if (sibling) {
            sibling.color = Color.RED;
          }
          if (node.parent === null) {
            throw new Error("Node parent is null");
          }
          node = node.parent;
        } else {
          if (sibling?.left?.color !== Color.RED) {
            if (sibling.right) sibling.right.color = Color.BLACK;
            sibling.color = Color.RED;
            this.rotateLeft(sibling);
            sibling = node.parent?.left;
          }

          if (sibling) {
            sibling.color = node.parent?.color || Color.BLACK;
            if (node.parent) node.parent.color = Color.BLACK;
            if (sibling.left) sibling.left.color = Color.BLACK;
            if (node.parent) this.rotateRight(node.parent);
          }
          if (!this.root) {
            throw new Error("Root is null");
          }
          node = this.root;
        }
      }
    }

    node.color = Color.BLACK;
  }

  private rotateLeft(node: RBTreeNode<K>): void {
    const rightChild = node.right;
    if (!rightChild) {
      throw new Error("Right child is null");
    }
    node.right = rightChild.left;

    if (rightChild.left) {
      rightChild.left.parent = node;
    }

    rightChild.parent = node.parent;

    if (!node.parent) {
      this.root = rightChild;
    } else if (node === node.parent.left) {
      node.parent.left = rightChild;
    } else {
      node.parent.right = rightChild;
    }

    rightChild.left = node;
    node.parent = rightChild;
  }

  private rotateRight(node: RBTreeNode<K>): void {
    const leftChild = node.left;
    if (!leftChild) {
      throw new Error("Left child is null");
    }
    node.left = leftChild.right;

    if (leftChild.right) {
      leftChild.right.parent = node;
    }

    leftChild.parent = node.parent;

    if (!node.parent) {
      this.root = leftChild;
    } else if (node === node.parent.right) {
      node.parent.right = leftChild;
    } else {
      node.parent.left = leftChild;
    }

    leftChild.right = node;
    node.parent = leftChild;
  }

  private transplant(u: RBTreeNode<K>, v: RBTreeNode<K> | null): void {
    if (!u.parent) {
      this.root = v;
    } else if (u === u.parent.left) {
      u.parent.left = v;
    } else {
      u.parent.right = v;
    }

    if (v) {
      v.parent = u.parent;
    }
  }

  private minimum(node: RBTreeNode<K>): RBTreeNode<K> {
    while (node.left) {
      node = node.left;
    }
    return node;
  }

  private inorder(node: RBTreeNode<K> | null, result: K[]): void {
    if (node) {
      this.inorder(node.left, result);
      result.push(node.key);
      this.inorder(node.right, result);
    }
  }

  private inorderRange(node: RBTreeNode<K> | null, start: K, end: K, result: K[]): void {
    if (!node) return;

    const startCmp = this.compareFn(node.key, start);
    const endCmp = this.compareFn(node.key, end);

    if (startCmp > 0) {
      this.inorderRange(node.left, start, end, result);
    }

    if (startCmp >= 0 && endCmp <= 0) {
      result.push(node.key);
    }

    if (endCmp < 0) {
      this.inorderRange(node.right, start, end, result);
    }
  }
}

/**
 * LRU cache with binary search capabilities using Red-Black tree
 * All operations are O(log n) for ordered queries and O(1) for LRU operations
 */
export class OrderedLRUCache<K extends number | string, V> {
  private cache = new Map<K, V>();
  private tree: RedBlackTree<K>;
  private readonly maxSize: number;
  private readonly compareFn: (a: K, b: K) => number;

  constructor(maxSize: number, compareFn?: (a: K, b: K) => number) {
    this.maxSize = maxSize;
    this.compareFn = compareFn || ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    this.tree = new RedBlackTree(this.compareFn);
  }

  /**
   * Get value by exact key (O(1))
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Refresh position by removing and re-adding
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * Set key-value pair (O(log n) for tree operations, O(1) for cache)
   */
  set(key: K, value: V): void {
    const isUpdate = this.cache.has(key);

    if (isUpdate) {
      this.cache.delete(key);
    } else {
      if (this.cache.size >= this.maxSize) {
        // Remove oldest entry (first item in map)
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
          this.tree.delete(firstKey);
        }
      }
      // Add to tree index for new keys
      this.tree.insert(key);
    }

    this.cache.set(key, value);
  }

  /**
   * Find exact key using tree search (O(log n))
   */
  findExact(key: K): V | undefined {
    const foundKey = this.tree.find(key);
    if (foundKey !== null) {
      return this.get(key);
    }
    return undefined;
  }

  /**
   * Find keys within distance of center point (O(log n + k) where k is result count)
   * Returns empty array if no keys found in range
   */
  findNearestInRange(center: K, distance: K): Array<{ key: K; value: V }> {
    const nearestKeys = this.tree.findNearestInRange(center, distance);
    const result: Array<{ key: K; value: V }> = [];

    for (const key of nearestKeys) {
      const value = this.get(key);
      if (value !== undefined) {
        result.push({ key, value });
      }
    }

    return result;
  }

  /**
   * Find all key-value pairs in range [start, end] (O(log n + k) where k is result count)
   */
  findRange(start: K, end: K): Array<{ key: K; value: V }> {
    const keys = this.tree.findRange(start, end);
    const result: Array<{ key: K; value: V }> = [];

    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        result.push({ key, value });
      }
    }

    return result;
  }

  /**
   * Get all keys in sorted order (O(n))
   */
  getSortedKeys(): ReadonlyArray<K> {
    return this.tree.getAllSorted();
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.tree.delete(key);
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.tree = new RedBlackTree(this.compareFn);
  }

  get size(): number {
    return this.cache.size;
  }
}
