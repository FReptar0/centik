/**
 * Converts all BigInt values in an object to strings for JSON serialization.
 * Required because JSON.stringify() throws on BigInt values.
 * Use before NextResponse.json() or returning props to Client Components.
 */
export function serializeBigInts<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  ) as T
}
