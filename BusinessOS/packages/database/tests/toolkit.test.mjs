import assert from "node:assert/strict";
import { URL } from "node:url";
import { test } from "@jest/globals";
import { adminUrl, fixtureUrl } from "../fixtures/target.mjs";
import {
  addMinorUnits, isRetryableTransactionError, parseMinorUnits, parseQuantity, runTransaction,
  TransactionRetryExhausted,
} from "../dist/toolkit/index.js";

function failure(code, meta) {
  return Object.assign(new Error("test transaction failure"), { code, meta });
}

test("DB-03 minor units stay exact throughout signed BIGINT range", () => {
  assert.equal(parseMinorUnits("9007199254740993"), 9007199254740993n);
  assert.equal(parseMinorUnits("9223372036854775807"), 9223372036854775807n);
  assert.equal(parseMinorUnits("-9223372036854775808"), -9223372036854775808n);
  assert.equal(addMinorUnits(9007199254740993n, -1n), 9007199254740992n);
  for (const value of ["1.0", "NaN", "1e3", "-0", "01", "+1", "1\n", 42, 42n, null]) {
    assert.throws(() => parseMinorUnits(value), TypeError);
  }
  for (const value of ["9223372036854775808", "-9223372036854775809"]) {
    assert.throws(() => parseMinorUnits(value), RangeError);
  }
  assert.throws(() => addMinorUnits(9223372036854775807n, 1n), RangeError);
  assert.throws(() => addMinorUnits(-9223372036854775808n, -1n), RangeError);
});

test("DB-03 quantities normalize without passing through a number", () => {
  assert.equal(parseQuantity("99999999999999.999999"), "99999999999999.999999");
  assert.equal(parseQuantity("1.020000"), "1.02");
  assert.equal(parseQuantity("-0.000001"), "-0.000001");
  assert.equal(parseQuantity("0.000000"), "0");
  for (const value of ["1.0000001", "100000000000000", "NaN", "Infinity", "-0.00", "1\n", "01", 1]) {
    assert.throws(() => parseQuantity(value), TypeError);
  }
});

test("DB-05 retries only confirmed serialization and deadlock errors", async () => {
  for (const error of [
    failure("P2034"), failure("40001"), failure("40P01"),
    failure("P2010", { code: "40001" }), failure("P2010", { code: "40P01" }),
    failure("P2010", { driverAdapterError: { cause: { originalCode: "40P01" } } }),
  ]) assert.equal(isRetryableTransactionError(error), true);
  for (const error of [
    failure("23503"), failure("23505"), failure("55P03"), failure("ECONNRESET"),
    failure("P2010", { code: "55P03" }),
    failure("P2010", { driverAdapterError: { cause: { originalCode: "55P03" } } }),
    failure("P2010", { message: "40001" }), { code: "40001" }, null,
  ]) {
    assert.equal(isRetryableTransactionError(error), false);
    let attempts = 0;
    await assert.rejects(runTransaction(async () => {
      attempts++;
      throw error;
    }, async () => {}, { deadlineMs: 1000 }), (actual) => actual === error);
    assert.equal(attempts, 1);
  }
});

test("DB-05 retries own fresh transactions with a bounded deadline and attempt count", async () => {
  const clients = [];
  const result = await runTransaction(async (command, options) => {
    assert.equal(options.isolationLevel, "Serializable");
    assert.ok(options.timeout > 0 && options.maxWait > 0);
    assert.ok(options.timeout + options.maxWait <= 1000);
    return command({});
  }, async (client) => {
    clients.push(client);
    if (clients.length === 1) throw failure("40001");
    return "committed";
  }, { deadlineMs: 1000 });
  assert.equal(result, "committed");
  assert.notEqual(clients[0], clients[1]);
  await assert.rejects(runTransaction(async () => {
    throw failure("P2034");
  }, async () => {}, { deadlineMs: 1000 }), (error) =>
    error instanceof TransactionRetryExhausted && error.attempts === 3);
  await assert.rejects(runTransaction(async () => {
    assert.fail("expired budget must not start a transaction");
  }, async () => {}, { deadlineMs: 1 }), (error) =>
    error instanceof TransactionRetryExhausted && error.attempts === 0);
});

test("DB-05 abort prevents a transaction attempt and further retry", async () => {
  let attempts = 0;
  const controller = new globalThis.AbortController();
  await assert.rejects(runTransaction(async () => {
    attempts++;
    controller.abort();
    throw failure("40001");
  }, async () => {}, { deadlineMs: 1000, signal: controller.signal }), { name: "AbortError" });
  assert.equal(attempts, 1);
});

test("DB-01 guards admin and fixture endpoints before using a connection", () => {
  const base = new URL("postgresql://m0104_admin@127.0.0.1:15432/m0104_admin");
  base.password = "test-only";
  assert.equal(adminUrl(base).href, base.href);
  for (const mutation of [
    { hostname: "localhost" }, { port: "" }, { password: "" }, { pathname: "/postgres" },
    { search: "?options=fixture" }, { hash: "#suffix" }, { username: "postgres" },
  ]) assert.throws(() => adminUrl(Object.assign(new URL(base), mutation)));
  const fixture = new URL(base);
  fixture.username = "m0104_migrator_0123456789ab";
  fixture.pathname = "/m0104_test_abcdef987654";
  assert.equal(fixtureUrl(fixture, "migrator"), fixture.href);
  assert.throws(() => fixtureUrl(fixture, "runtime"));
  assert.throws(() => fixtureUrl(base, "migrator"));
});
