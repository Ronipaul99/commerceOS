const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
export function formatINR(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0)
    throw new RangeError("Amounts must be nonnegative integer paise");
  return formatter.format(paise / 100);
}
