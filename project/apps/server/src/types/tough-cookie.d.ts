declare module 'tough-cookie' {
  export class CookieJar {
    constructor(store?: any, options?: any);
    setCookie(cookie: Cookie | string, currentUrl: string, options?: any, cb?: (err: Error | null, cookie: Cookie) => void): void;
    getCookies(currentUrl: string, options?: any, cb?: (err: Error | null, cookies: Cookie[]) => void): void;
  }

  export class Cookie {
    constructor(properties?: any);
    static parse(cookieString: string, options?: any): Cookie;
    static fromJSON(str: string): Cookie;
    toString(): string;
    toJSON(): any;
  }
} 