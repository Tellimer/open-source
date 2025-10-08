/**
 * Tests for LLM providers
 */

import { assertEquals, assertExists, assertThrows } from "@std/assert";
import { OpenAIProvider } from "./openai.ts";
import { AnthropicProvider } from "./anthropic.ts";
import { GeminiProvider } from "./gemini.ts";
import { getProvider } from "./index.ts";
import { ClassificationError } from "../types.ts";

Deno.test("OpenAIProvider - has correct name", () => {
  const provider = new OpenAIProvider();
  assertEquals(provider.name, "openai");
});

Deno.test("OpenAIProvider - validateConfig throws without API key", () => {
  const provider = new OpenAIProvider();

  assertThrows(
    () => {
      provider.validateConfig({
        provider: "openai",
        apiKey: "",
      });
    },
    ClassificationError,
    "OpenAI API key is required",
  );
});

Deno.test("OpenAIProvider - validateConfig accepts valid config", () => {
  const provider = new OpenAIProvider();

  // Should not throw
  provider.validateConfig({
    provider: "openai",
    apiKey: "sk-test-key",
  });
});

Deno.test("AnthropicProvider - has correct name", () => {
  const provider = new AnthropicProvider();
  assertEquals(provider.name, "anthropic");
});

Deno.test("AnthropicProvider - validateConfig throws without API key", () => {
  const provider = new AnthropicProvider();

  assertThrows(
    () => {
      provider.validateConfig({
        provider: "anthropic",
        apiKey: "",
      });
    },
    ClassificationError,
    "Anthropic API key is required",
  );
});

Deno.test("AnthropicProvider - validateConfig accepts valid config", () => {
  const provider = new AnthropicProvider();

  // Should not throw
  provider.validateConfig({
    provider: "anthropic",
    apiKey: "sk-ant-test-key",
  });
});

Deno.test("GeminiProvider - has correct name", () => {
  const provider = new GeminiProvider();
  assertEquals(provider.name, "gemini");
});

Deno.test("GeminiProvider - validateConfig throws without API key", () => {
  const provider = new GeminiProvider();

  assertThrows(
    () => {
      provider.validateConfig({
        provider: "gemini",
        apiKey: "",
      });
    },
    ClassificationError,
    "Google Gemini API key is required",
  );
});

Deno.test("GeminiProvider - validateConfig accepts valid config", () => {
  const provider = new GeminiProvider();

  // Should not throw
  provider.validateConfig({
    provider: "gemini",
    apiKey: "AIza-test-key",
  });
});

Deno.test("getProvider - returns OpenAIProvider for 'openai'", () => {
  const provider = getProvider("openai");
  assertExists(provider);
  assertEquals(provider.name, "openai");
  assertEquals(provider instanceof OpenAIProvider, true);
});

Deno.test("getProvider - returns AnthropicProvider for 'anthropic'", () => {
  const provider = getProvider("anthropic");
  assertExists(provider);
  assertEquals(provider.name, "anthropic");
  assertEquals(provider instanceof AnthropicProvider, true);
});

Deno.test("getProvider - returns GeminiProvider for 'gemini'", () => {
  const provider = getProvider("gemini");
  assertExists(provider);
  assertEquals(provider.name, "gemini");
  assertEquals(provider instanceof GeminiProvider, true);
});

Deno.test("ClassificationError - includes provider and message", () => {
  const error = new ClassificationError(
    "Test error message",
    "openai",
  );

  assertEquals(error.name, "ClassificationError");
  assertEquals(error.message, "Test error message");
  assertEquals(error.provider, "openai");
  assertEquals(error.cause, undefined);
});

Deno.test("ClassificationError - includes cause when provided", () => {
  const cause = new Error("Original error");
  const error = new ClassificationError(
    "Test error message",
    "anthropic",
    cause,
  );

  assertEquals(error.cause, cause);
});
