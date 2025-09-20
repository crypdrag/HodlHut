// Jest setup file for DEX adapter and React component testing
import 'jest';
import '@testing-library/jest-dom';

// Mock Math.random for consistent test results
const mockMath = Object.create(global.Math);
mockMath.random = jest.fn(() => 0.5); // 50% - middle ground for availability tests
global.Math = mockMath;

// Mock console.error and console.log to prevent test output pollution
global.console.error = jest.fn();
global.console.log = jest.fn();

// Setup global test timeout
jest.setTimeout(10000);

// Mock Date.now for consistent timestamp testing
const mockDateNow = jest.fn(() => 1609459200000); // 2021-01-01T00:00:00.000Z
global.Date.now = mockDateNow;

// Mock window.ic for Plug wallet integration
const mockPlug = {
  isConnected: jest.fn(),
  createActor: jest.fn(),
  agent: null,
  principal: null,
  accountId: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  createAgent: jest.fn(),
  requestBalance: jest.fn(),
  requestTransfer: jest.fn()
};

Object.defineProperty(window, 'ic', {
  value: {
    plug: mockPlug
  },
  writable: true
});

// Mock IntersectionObserver for React components
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock ResizeObserver for React components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
  mockMath.random.mockReturnValue(0.5); // Reset to 50%
  mockDateNow.mockReturnValue(1609459200000);

  // Reset Plug wallet mocks
  mockPlug.isConnected.mockReturnValue(false);
  mockPlug.agent = null;
  mockPlug.principal = null;
  mockPlug.accountId = null;
});