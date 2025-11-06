// types/lru-cache.d.ts
declare module 'lru-cache' {
  export interface Options<K, V> {
    max?: number;
    ttl?: number;
    maxSize?: number;
    sizeCalculation?: (value: V, key: K) => number;
    dispose?: (value: V, key: K, reason: string) => void;
    disposeAfter?: (value: V, key: K, reason: string) => void;
    noDisposeOnSet?: boolean;
    allowStale?: boolean;
    updateAgeOnGet?: boolean;
    updateAgeOnHas?: boolean;
    fetchMethod?: (key: K, staleValue: V | undefined, options: any) => Promise<V> | V;
    fetchContext?: any;
  }

  export class LRUCache<K, V> {
    constructor(options?: Options<K, V>);
    set(key: K, value: V, options?: { ttl?: number }): boolean;
    get(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    size: number;
    max: number;
    ttl: number;
    entries(): IterableIterator<[K, V]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    forEach(callback: (value: V, key: K, cache: LRUCache<K, V>) => void): void;
  }

  export default LRUCache;
}