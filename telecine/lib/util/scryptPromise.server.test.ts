import { describe, test, expect } from "vitest";
import {
  generatePassword,
  verifyPassword,
  generateApiToken,
  verifyApiToken,
} from "./scryptPromise.server";

describe("scrypt password primitives", () => {
  test("generatePassword returns a 64-byte key and 16-byte salt", async () => {
    const [key, salt] = await generatePassword("test-password");
    expect(key).toBeInstanceOf(Buffer);
    expect(salt).toBeInstanceOf(Buffer);
    expect(key.length).toBe(64);
    expect(salt.length).toBe(16);
  });

  test("generatePassword produces different salts each time", async () => {
    const [, salt1] = await generatePassword("same-password");
    const [, salt2] = await generatePassword("same-password");
    expect(salt1.equals(salt2)).toBe(false);
  });

  test("generatePassword produces different keys for the same password (due to random salt)", async () => {
    const [key1] = await generatePassword("same-password");
    const [key2] = await generatePassword("same-password");
    expect(key1.equals(key2)).toBe(false);
  });

  test("verifyPassword returns true for correct password", async () => {
    const password = "correct-horse-battery-staple";
    const [key, salt] = await generatePassword(password);
    const result = await verifyPassword(password, key, salt);
    expect(result).toBe(true);
  });

  test("verifyPassword returns false for wrong password", async () => {
    const [key, salt] = await generatePassword("real-password");
    const result = await verifyPassword("wrong-password", key, salt);
    expect(result).toBe(false);
  });

  test("verifyPassword returns false for tampered digest", async () => {
    const [key, salt] = await generatePassword("test-password");
    const tampered = Buffer.from(key);
    tampered[0] = (tampered[0]! + 1) % 256;
    const result = await verifyPassword("test-password", tampered, salt);
    expect(result).toBe(false);
  });

  test("verifyPassword returns false for tampered salt", async () => {
    const [key, salt] = await generatePassword("test-password");
    const tampered = Buffer.from(salt);
    tampered[0] = (tampered[0]! + 1) % 256;
    const result = await verifyPassword("test-password", key, tampered);
    expect(result).toBe(false);
  });
});

describe("scrypt API token primitives", () => {
  test("generateApiToken returns a 64-byte key and 16-byte salt", async () => {
    const [key, salt] = await generateApiToken("ef_abc123");
    expect(key).toBeInstanceOf(Buffer);
    expect(salt).toBeInstanceOf(Buffer);
    expect(key.length).toBe(64);
    expect(salt.length).toBe(16);
  });

  test("verifyApiToken returns true for correct token", async () => {
    const token = "ef_d6659715d9b74e9a8513597e5c6c5656";
    const [key, salt] = await generateApiToken(token);
    const result = await verifyApiToken(token, key, salt);
    expect(result).toBe(true);
  });

  test("verifyApiToken returns false for wrong token", async () => {
    const [key, salt] = await generateApiToken("ef_real_token");
    const result = await verifyApiToken("ef_fake_token", key, salt);
    expect(result).toBe(false);
  });

  test("verifyApiToken returns false for tampered digest", async () => {
    const token = "ef_abc123";
    const [key, salt] = await generateApiToken(token);
    const tampered = Buffer.from(key);
    tampered[0] = (tampered[0]! + 1) % 256;
    const result = await verifyApiToken(token, tampered, salt);
    expect(result).toBe(false);
  });
});
