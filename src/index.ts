import { TraversableKey, traverse } from './utils';
import { is, Subscription, Unit } from 'effector';
import set from 'lodash/set';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';

enum InspectorMode {
  NORMAL,
  TRAVEL
}

const instances = new Map();

/**
 * Redux dev tools layer
 */
export function inspect(initialState: any, name: string = 'default') {
  const config = {
    name,
    type: 'redux',
    features: {
      pause: true, // start/pause recording of dispatched actions
      lock: true, // lock/unlock dispatching actions and side effects
      persist: true, // persist states on page reloading
      export: true, // export history of actions in a file
      import: 'custom', // import history of actions from a file
      jump: true, // jump back and forth (time travelling)
      skip: true, // skip (cancel) actions
      reorder: true, // drag and drop actions in the history list
      dispatch: true, // dispatch custom actions or action creators
      test: true, // generate tests for the selected actions
    },
    trace: true,
    traceLimit: 100,
  };

  const devtools = typeof window !== 'undefined' ? window?.__REDUX_DEVTOOLS_EXTENSION__ : undefined;
  if (!devtools) return;

  function getState() {
    const snapshot = {};
    traverse(initialState, (value, key, path) => {
      const fullPath = path.join('.');

      if (is.store(value)) {
        set(snapshot, fullPath, value.getState());
        return true;
      } else if (is.effect(value)) {
        set(snapshot, [fullPath, 'pending'].join('.'), value.pending.getState());
        set(snapshot, [fullPath, 'inFlight'].join('.'), value.inFlight.getState());
        return true;
      }
      return !!is.unit(value);
    });
    return snapshot;
  }

  const watchers: Subscription[] = [];
  let state = getState();
  let mode = InspectorMode.NORMAL;

  let conn = instances.get(name) || devtools.connect(config);
  instances.set(name, conn);

  function addWatch(unit: Unit<any>, path: TraversableKey[], key?: TraversableKey) {
    // @ts-ignore
    unit = unit[key] || unit;
    const fullFath = [...path, key].filter(Boolean).join('.');
    watchers.push(
      // @ts-ignore
      unit.watch((payload: any) => {
        if (mode === InspectorMode.TRAVEL) return;

        if (is.store(unit) && isEqual(get(state, fullFath), payload)) {
          return;
        }
        if (is.store(unit)) {
        }
        state = getState();
        conn.send({ type: fullFath, payload }, state, config);
      }),
    );
  }

  function startWatch() {
    traverse(initialState, (unit, key, path) => {
      switch (true) {
        case is.event(unit):
          addWatch(unit, path);
          return true;
        case is.effect(unit):
          addWatch(unit, path);
          addWatch(unit, path, 'done');
          addWatch(unit, path, 'doneData');
          addWatch(unit, path, 'fail');
          addWatch(unit, path, 'failData');
          addWatch(unit, path, 'finally');
          addWatch(unit, path, 'pending');
          addWatch(unit, path, 'inFlight');
          return true;
        case is.store(unit):
          addWatch(unit, path);
          return true;
        default:
          return false;
      }
    });
  }

  function unwatchAll() {
    for (const unwatch of watchers) {
      unwatch();
    }
  }

  function sync(message: any) {
    if (['JUMP_TO_STATE', 'JUMP_TO_ACTION'].includes(message?.payload?.type)) {
      mode = InspectorMode.TRAVEL;
      const currentState = getState();
      const state = JSON.parse(message.state);

      traverse(state, (value, key, path) => {
        if (is.store(get(initialState, path)) && !isEqual(value, get(currentState, path))) {
          get(initialState, path).setState(value);
        }
      });
      mode = InspectorMode.NORMAL;
    }
  }

  const unsubscribe = conn.subscribe(sync);

  conn.init(state);
  startWatch();

  return () => {
    unsubscribe();
    unwatchAll();
  };
}
