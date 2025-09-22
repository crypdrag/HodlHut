// Jest setup file for global mocks and polyfills

// Mock global objects for JSDOM environment
global.Response = class MockResponse {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new Map();
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }
};

global.Request = class MockRequest {
  constructor(url, init) {
    this.url = url;
    this.method = init?.method || 'GET';
    this.headers = new Map(Object.entries(init?.headers || {}));
  }
};

global.Headers = class MockHeaders extends Map {
  get(name) {
    return super.get(name.toLowerCase());
  }

  set(name, value) {
    return super.set(name.toLowerCase(), value);
  }
};

global.fetch = jest.fn(() =>
  Promise.resolve(new global.Response('{}', { status: 200 }))
);

// Mock URL.createObjectURL for file handling
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock TextEncoder/TextDecoder for MSW
global.TextEncoder = class MockTextEncoder {
  encode(string) {
    const buffer = new ArrayBuffer(string.length);
    const uint8Array = new Uint8Array(buffer);
    for (let i = 0; i < string.length; i++) {
      uint8Array[i] = string.charCodeAt(i);
    }
    return uint8Array;
  }
};

global.TextDecoder = class MockTextDecoder {
  decode(uint8Array) {
    return String.fromCharCode(...uint8Array);
  }
};

// Mock Crypto for Web APIs
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-123456789012')
  }
});

// Mock TransformStream for MSW
global.TransformStream = class MockTransformStream {
  constructor(transformer = {}) {
    this.readable = new ReadableStream();
    this.writable = new WritableStream();
    this.transformer = transformer;
  }
};

// Mock ReadableStream for TransformStream
if (!global.ReadableStream) {
  global.ReadableStream = class MockReadableStream {
    constructor(source = {}) {
      this.source = source;
    }

    getReader() {
      return {
        read: () => Promise.resolve({ done: true, value: undefined }),
        releaseLock: () => {}
      };
    }
  };
}

// Mock WritableStream for TransformStream
if (!global.WritableStream) {
  global.WritableStream = class MockWritableStream {
    constructor(sink = {}) {
      this.sink = sink;
    }

    getWriter() {
      return {
        write: () => Promise.resolve(),
        close: () => Promise.resolve(),
        releaseLock: () => {}
      };
    }
  };
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});