export declare const ALLOWED_TOPICS: readonly [
  "General inquiry",
  "Bug report",
  "Feature request",
]

export type Topic = (typeof ALLOWED_TOPICS)[number]

export declare const LIMITS: {
  readonly name: { readonly min: 2; readonly max: 100 }
  readonly email: { readonly max: 254 }
  readonly message: { readonly min: 10; readonly max: 5000 }
}

export declare function isValidEmail(email: string): boolean
