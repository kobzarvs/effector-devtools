# effector-devtools

## Demo

![demo](images/video.mp4)

## Getting started

```shell
yarn add effector-devtools
```

```typescript
import { createEvent, restore } from 'effector';
import { inspect } from 'effector-devtools';

export const change = createEvent<string>();
export const $store = restore(change, '');

export const resetInput = createEvent();

$store.reset(resetInput);

// add instance #1 to redux dev tools 
const removeInstance1 = inspect({
  change,
  resetInput,
  $store,
}, 'Profile #1');

// add instance #2 to redux dev tools 
const removeInstance2 = inspect({
  events: {
    change,
    resetInput,
  },
  state: {
    input: $store,
  }
}, 'Profile #2');

// removeInstance1();
// removeInstance2();
```
