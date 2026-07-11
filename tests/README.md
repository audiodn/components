# Testing Documentation

This project uses Vitest for testing with comprehensive coverage of utilities, components, and integration scenarios.

## Test Structure

```
tests/
├── setup.ts                    # Test environment setup
├── lib/                        # Library function tests
│   ├── util.test.ts           # Utility function tests
│   ├── storage.test.ts        # Storage functionality tests
│   ├── audio.test.ts          # Audio instance tests
│   └── constants.test.ts      # Icon constants tests
├── components/                 # Component tests
│   ├── play-button.test.ts    # Play button component tests
│   └── volume-control.test.ts # Volume control component tests
├── integration/               # Integration tests
│   └── player-integration.test.ts # Player integration tests
└── README.md                  # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Run Tests Once
```bash
npm run test:run
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Test Categories

### 1. Utility Tests (`tests/lib/`)
- **util.test.ts**: Tests for formatting functions (duration, bytes)
- **storage.test.ts**: Tests for storage abstraction layer
- **audio.test.ts**: Tests for audio instance creation and event handling
- **constants.test.ts**: Tests for SVG icon definitions

### 2. Component Tests (`tests/components/`)
- **play-button.test.ts**: Tests for play/pause button functionality
- **volume-control.test.ts**: Tests for volume slider functionality

### 3. Integration Tests (`tests/integration/`)
- **player-integration.test.ts**: Tests for component interactions and event handling

## Test Coverage

The test suite covers:

- ✅ **Utility Functions**: Duration formatting, byte formatting, storage operations
- ✅ **Audio Management**: Audio instance creation, event handling
- ✅ **Component Behavior**: State management, event dispatching, styling
- ✅ **Integration**: Component communication, global events
- ✅ **Error Handling**: Graceful error handling and edge cases
- ✅ **Accessibility**: ARIA attributes, keyboard navigation
- ✅ **Performance**: Memory leak prevention, efficient updates

## Testing Patterns

### Component Testing
```typescript
import { fixture, html } from '@open-wc/testing'
import { MyComponent } from '../src/components/my-component'

describe('MyComponent', () => {
  let element: MyComponent

  beforeEach(async () => {
    element = await fixture(html`<my-component></my-component>`)
  })

  it('should render correctly', () => {
    expect(element).to.exist
  })
})
```

### Mocking Dependencies
```typescript
vi.mock('../src/lib/storage', () => ({
  createStorage: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }))
}))
```

### Event Testing
```typescript
it('should dispatch custom event', () => {
  const eventSpy = vi.fn()
  element.addEventListener('custom-event', eventSpy)
  
  element.dispatchEvent(new CustomEvent('custom-event'))
  
  expect(eventSpy).toHaveBeenCalled()
})
```

## Test Environment

The test environment is configured with:
- **jsdom**: DOM simulation for browser-like environment
- **@open-wc/testing**: Lit component testing utilities
- **@testing-library/dom**: DOM testing utilities
- **@testing-library/jest-dom**: Additional matchers

## Continuous Integration

Tests are automatically run on:
- Pull requests
- Main branch pushes
- Release builds

## Adding New Tests

1. Create test file in appropriate directory
2. Follow existing naming convention (`*.test.ts`)
3. Import necessary testing utilities
4. Write descriptive test cases
5. Ensure good coverage of edge cases
6. Update this documentation if needed

## Debugging Tests

### Run Single Test File
```bash
npm test tests/lib/util.test.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Debug with Console Logs
```bash
npm test -- --reporter=verbose
``` 