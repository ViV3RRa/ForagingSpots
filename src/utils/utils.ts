// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function assertUnreachable(_x: never): never {
  throw new Error('Did not expect to get here')
}

export function assertUnreachableWithDefault<T>(
  x: never,
  defaultValue: T
): never | T {
  try {
    assertUnreachable(x)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e: unknown) {
    console.warn(`Unknown key: ${x}`)
    return defaultValue
  }
}