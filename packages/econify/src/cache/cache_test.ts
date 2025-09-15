/**
 * Tests for cache module
 */

import { assertEquals } from "@std/assert";
import { SmartCache, withCache } from "./cache.ts";

Deno.test("SmartCache - basic get/set operations", () => {
  const cache = new SmartCache();

  // Test setting and getting values
  cache.set("key1", "value1");
  assertEquals(cache.get("key1"), "value1");

  // Test getting non-existent key
  assertEquals(cache.get("nonexistent"), null);

  // Test setting different types
  cache.set("number", 42);
  cache.set("object", { foo: "bar" });
  cache.set("array", [1, 2, 3]);

  assertEquals(cache.get("number"), 42);
  assertEquals(cache.get("object"), { foo: "bar" });
  assertEquals(cache.get("array"), [1, 2, 3]);
});

Deno.test("SmartCache - TTL expiration", async () => {
  const cache = new SmartCache({ ttl: 100 }); // 100ms TTL

  cache.set("expiring", "value");
  assertEquals(cache.get("expiring"), "value");

  // Wait for expiration
  await new Promise((resolve) => setTimeout(resolve, 150));

  assertEquals(cache.get("expiring"), null);
});

Deno.test("SmartCache - max size limit", () => {
  const cache = new SmartCache({ maxSize: 3 });

  // Fill cache to max size
  cache.set("key1", "value1");
  cache.set("key2", "value2");
  cache.set("key3", "value3");

  // All should be present
  assertEquals(cache.get("key1"), "value1");
  assertEquals(cache.get("key2"), "value2");
  assertEquals(cache.get("key3"), "value3");

  // Adding one more should evict the oldest
  cache.set("key4", "value4");

  assertEquals(cache.get("key1"), null); // Should be evicted
  assertEquals(cache.get("key2"), "value2");
  assertEquals(cache.get("key3"), "value3");
  assertEquals(cache.get("key4"), "value4");
});

Deno.test("SmartCache - clear operation", () => {
  const cache = new SmartCache();

  cache.set("key1", "value1");
  cache.set("key2", "value2");

  assertEquals(cache.get("key1"), "value1");
  assertEquals(cache.get("key2"), "value2");

  cache.clear();

  assertEquals(cache.get("key1"), null);
  assertEquals(cache.get("key2"), null);
});

Deno.test("SmartCache - custom options", () => {
  const cache = new SmartCache({
    ttl: 5000,
    maxSize: 500,
    storage: "memory",
  });

  cache.set("test", "value");
  assertEquals(cache.get("test"), "value");
});

Deno.test("withCache - basic memoization", () => {
  let callCount = 0;
  const expensiveFunction = (...args: unknown[]) => {
    callCount++;
    const [x, y] = args as [number, number];
    return x + y;
  };

  const memoized = withCache(expensiveFunction);

  // First call should execute function
  assertEquals(memoized(2, 3), 5);
  assertEquals(callCount, 1);

  // Second call with same args should use cache
  assertEquals(memoized(2, 3), 5);
  assertEquals(callCount, 1);

  // Different args should execute function again
  assertEquals(memoized(3, 4), 7);
  assertEquals(callCount, 2);
});

Deno.test("withCache - with custom key generator", () => {
  let callCount = 0;
  const fn = (...args: unknown[]) => {
    callCount++;
    const obj = args[0] as { x: number; y: number };
    return obj.x + obj.y;
  };

  const memoized = withCache(fn, {
    keyGenerator: (...args) => {
      const obj = args[0] as { x: number; y: number };
      return `${obj.x}-${obj.y}`;
    },
  });

  assertEquals(memoized({ x: 1, y: 2 }), 3);
  assertEquals(callCount, 1);

  // Same values but different object should use cache
  assertEquals(memoized({ x: 1, y: 2 }), 3);
  assertEquals(callCount, 1);
});

Deno.test("withCache - with TTL", async () => {
  let callCount = 0;
  const fn = (...args: unknown[]) => {
    callCount++;
    const x = args[0] as number;
    return x * 2;
  };

  const memoized = withCache(fn, { ttl: 100 });

  assertEquals(memoized(5), 10);
  assertEquals(callCount, 1);

  // Should use cache
  assertEquals(memoized(5), 10);
  assertEquals(callCount, 1);

  // Wait for expiration
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Should call function again
  assertEquals(memoized(5), 10);
  assertEquals(callCount, 2);
});
