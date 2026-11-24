const minimumMinor = -9223372036854775808n;
const maximumMinor = 9223372036854775807n;

declare const quantityBrand: unique symbol;
export type QuantityString = string & { readonly [quantityBrand]: true };

function checkedMinor(value: bigint): bigint {
  if (value < minimumMinor || value > maximumMinor) {
    throw new RangeError("Minor units exceed PostgreSQL BIGINT range.");
  }
  return value;
}

export function parseMinorUnits(input: unknown): bigint {
  if (typeof input !== "string" || !/^(0|-?[1-9][0-9]{0,18})(?![\s\S])/.test(input)) {
    throw new TypeError("Minor units require a canonical integer string.");
  }
  return checkedMinor(BigInt(input));
}

export function addMinorUnits(left: bigint, right: bigint): bigint {
  return checkedMinor(checkedMinor(left) + checkedMinor(right));
}

export function parseQuantity(input: unknown): QuantityString {
  if (
    typeof input !== "string"
    || !/^-?(?:0|[1-9][0-9]{0,13})(?:\.[0-9]{1,6})?(?![\s\S])/.test(input)
  ) {
    throw new TypeError("Quantity requires a decimal string within NUMERIC(20,6) precision.");
  }
  const result = input.includes(".") ? input.replace(/0+$/, "").replace(/\.$/, "") : input;
  if (result === "-0") throw new TypeError("Negative zero is not a canonical quantity.");
  return result as QuantityString;
}
