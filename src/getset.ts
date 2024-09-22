export interface Change {
  path: string;
  type: 'add' | 'update' | 'delete';
  value?: any;
  functionName?: string;
  fileName?: string;
  id: string;
  from: 'react' | 'update' | 'set';
}

export interface GetSetBubble<T> {
  getState(): T;
  subscribe(callback: (changes: Change[]) => void): void;
}

export type BubbleReturnType<T> = {
  [K in keyof T]: T[K] extends GetSetBubble<infer U> ? U : T[K];
};

export type BubbleType<T> = {
  getState: () => BubbleReturnType<T>;
  subscribe: Function;
  reset: () => void;
};
export interface GetSet<
  T extends string | number | Object | null | undefined,
  S extends Object = {}
> {
  ___25304743758287906getset: boolean;
  get(): T;
  getState(): T;
  actions?: S | undefined;
  getSavedVersion: (versionName: string) => T;
  saveVersion: (versionName?: string) => void;
  reset: () => void;
  // deepClone: () => T;
  val(
    newStateFn?: T | ((currentState: T) => void) | undefined,
    versionName?: string
  ): T;
  // reset: () => void;
  // resetIfNoListeners: () => void;
  set(newStateFn: T | ((currentState: T) => T), saveCurrentStateAs?: string): T;
  update(
    updateFn: (currentState: T) => void,
    saveCurrentStateAs?: string
  ): void;
  react(
    fn: (state: T, changes?: Change[]) => void,
    dependencyArrayFn: (state: T) => any[]
  ): void;
  subscribe(callback: (changes: Change[], type: string) => void): () => void;
}

type Func<T extends any[], R> = (...args: T) => R;

export function debounce<T extends any[], R>(
  func: Func<T, R>,
  delay: number
): Func<T, void> {
  let timerId: ReturnType<typeof setTimeout>;

  return function (this: any, ...args: T) {
    const context = this;

    clearTimeout(timerId);

    timerId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

type TGetSetConfig = {
  // deepfreeze?: boolean;
};

export function getset<
  T extends number | string | boolean | object | null | undefined,
  S extends object = {}
>(
  initialState: T,
  actions?: (
    val: (newStateFn?: T | ((currentState: T) => void) | undefined) => T
  ) => S,
  {}: TGetSetConfig = {}
): GetSet<T, S> {
  let versions: Record<string, T> = {};
  let state1: T = initialState;
  let state2 =
    typeof initialState === 'object' ? createStateProxy(state1) : state1;
  const subscriptions = new Set<{ fn: Function; type: string }>();
  const reactions = new Set<Function>();

  let accumulatedChanges = new Map<string, Change>();
  let alreadyDestructuredPaths: string[] = [];
  let setInProgress = false;
  let subscriptionCallInProgress = false;
  let stopCallingSubscriptions = false;
  let reactionInProgress = false;
  let functionName = '';
  let fileName = '';
  function clearAccumulatedChanges() {
    accumulatedChanges.clear();
    alreadyDestructuredPaths = [];
  }

  function updateValue(obj: any, path: string, val: any): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }
    let pathAccumulated = '';
    const keys = path.split('.');
    let currentObj = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      pathAccumulated =
        pathAccumulated.length > 0 ? pathAccumulated + '.' + key : key;
      if (!alreadyDestructuredPaths.includes(pathAccumulated)) {
        if (
          currentObj.hasOwnProperty(key) &&
          typeof currentObj[key] === 'object'
        ) {
          if (Array.isArray(currentObj[key])) {
            currentObj[key] = [...currentObj[key]];
          } else {
            currentObj[key] = { ...currentObj[key] };
          }
          alreadyDestructuredPaths.push(pathAccumulated);
          currentObj = currentObj[key];
        } else {
          // If the key doesn't exist or is not an object, create an empty object
          currentObj[key] = {};
          currentObj = currentObj[key];
        }
      } else {
        currentObj = currentObj[key];
      }
    }
    currentObj[keys[keys.length - 1]] = val;
  }

  function createStateProxy(obj: any, path = ''): T {
    return new Proxy(obj, {
      get(target, key: string) {
        const fullPath = path ? `${path}.${key}` : key;
        //@ts-ignore
        let obj = fullPath.split('.').reduce((a, b) => a[b], state1);
        if (typeof obj === 'object' && obj !== null) {
          //@ts-ignore
          return createStateProxy(target[key], path ? `${path}.${key}` : key);
        } else {
          return obj;
        }
      },
      set(target, key: string, value) {
        const fullPath = path ? `${path}.${key}` : key;
        const oldValue = target[key];
        updateValue(state1, fullPath, value);
        const change: Change = {
          path: fullPath,
          from: reactionInProgress ? 'react' : 'update',
          type: oldValue === undefined ? 'add' : 'update',
          value,
          functionName,
          fileName,
          id: Math.random().toString(),
        };

        addChangeToList(change);
        return true;
      },
      deleteProperty(target, key: string) {
        const fullPath = path ? `${path}.${key}` : key;
        const oldValue = target[key];
        delete target[key];
        const change: Change = {
          path: fullPath,
          functionName,
          fileName,
          from: reactionInProgress ? 'react' : 'update',
          type: 'delete',
          value: oldValue,
          id: Math.random().toString(),
        };
        addChangeToList(change);
        return true;
      },
    });
  }

  function addChangeToList(change: Change) {
    accumulatedChanges.set(change.path, change);
  }

  let reactionCallInProgress = false;

  const callReactions = () => {
    reactionCallInProgress = true;
    const changes = [...accumulatedChanges.values()].reverse();
    for (const reaction of reactions) {
      try {
        !stopCallingSubscriptions && reaction(changes);
      } catch (e) {
        console.error(e);
      }
    }
    reactionCallInProgress = false;
  };
  const callSubs = debounce(() => {
    subscriptionCallInProgress = true;
    const changes = [...accumulatedChanges.values()].reverse();
    for (const subscription of subscriptions) {
      !stopCallingSubscriptions && subscription.fn(changes, subscription.type);
    }
    stopCallingSubscriptions = false;
    clearAccumulatedChanges();
    subscriptionCallInProgress = false;
  }, 0);

  function get() {
    return state1;
  }

  function set(
    newState: T | ((currentState: T) => T),
    saveCurrentStateAs: string = ''
  ): T {
    console.time();
    checkIfOtherCallInProgress();
    if (!reactionInProgress) {
      getCallerInfo();
    }
    monitorUpdates();
    setInProgress = true;
    const newValue =
      typeof newState === 'function' ? newState(state1) : newState;
    state1 = newValue;
    state2 = typeof state1 === 'object' ? createStateProxy(state1, '') : state1;
    addChangeToList({
      from: 'set',
      functionName,
      fileName,
      type: 'update',
      path: '',
      id: Math.random().toString(),
      value: newValue,
    });
    saveCurrentStateAs && (versions[saveCurrentStateAs] = state1);
    setInProgress = false;
    callReactions();
    callSubs();
    // updateState1(true);

    functionName = '';
    fileName = '';
    console.timeEnd();
    return state1;
  }
  function checkIfOtherCallInProgress() {
    if (reactionInProgress || reactionCallInProgress) {
      throw Error(
        'update/set calls are not allowed in reactions. instead directly change the state'
      );
    }
    if (setInProgress) {
      debugger;
      throw Error(
        'update/set calls are not allowed from within the call backs of update/set'
      );
    }
    if (subscriptionCallInProgress) {
      throw Error(
        'update/set calls  are not allowed from the subscriptions to prevent memory leaks. Use Reactions Instead'
      );
    }
  }

  function getCallerInfo(stackIndex = 3) {
    try {
      const error = new Error();
      const stackLines = error?.stack?.split?.('\n');
      const temp = stackLines?.[stackIndex]?.trim?.()?.split?.(' ');
      const a = temp?.[temp.length > 2 ? 2 : 1]?.split('?')?.[0]?.split?.('/');
      const b = temp?.length || 0 > 2 ? temp?.[1] : '';
      (functionName = (temp?.length || 0) < 3 ? 'unknown' : b || ''),
        (fileName = a?.[a?.length - 1] || '');
    } catch (error: any) {}
  }

  function update(
    newState: T | ((currentState: T) => void),
    saveCurrentStateAs?: string
  ): T {
    monitorUpdates();
    checkIfOtherCallInProgress();
    getCallerInfo();
    setInProgress = true;
    try {
      if (typeof newState === 'function' && typeof state1 === 'object') {
        const oldState = state1;
        state1 = shallowClone(state1);
        state2 = createStateProxy(state1);
        newState(state2);
        setInProgress = false;
        alreadyDestructuredPaths = [];
        if ([...accumulatedChanges].length === 0) {
          state1 = oldState;
        } else {
          if (saveCurrentStateAs) versions[saveCurrentStateAs] = state1;
          callReactions();
          callSubs();
        }
      } else {
        throw Error(
          'update function cant be used for primitive states. you can use either set or val but pass updated values instead of function to update state'
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      fileName = '';
      functionName = '';
      setInProgress = false;
    }

    return state1;
  }

  function subscribe(
    callback: (changes: Change[], type: string) => void,
    type = ''
  ) {
    let obj = { fn: callback, type };
    subscriptions.add(obj);
    return () => {
      subscriptions.delete(obj);
    };
  }

  let callCount = 0;
  let lastCalledTimestamp = Date.now();

  function monitorUpdates() {
    callCount++;
    let now = Date.now();
    if (now - lastCalledTimestamp < 1000) {
      // Check if 1 second has elapsed

      if (callCount > 100) {
        callCount = 0;
        lastCalledTimestamp = now;
        stopCallingSubscriptions = true;
        throw Error(
          "update / set functions are called more than 100 times in 1 second, check if this is because you are changing the state that's being the dependency of the reaction."
        );
      }
      // Reset the counter and timestamp for the next interval
    } else {
      callCount = 0;
      lastCalledTimestamp = now;
    }
  }
  function react(
    fn: (State: T, changes?: Change[]) => void,
    dependencyArrayFn: (state: T) => any[]
  ) {
    getCallerInfo(3);
    let a = functionName;
    let b = fileName;
    functionName = '';
    fileName = '';
    let oldRefs: any = dependencyArrayFn(get());
    reactions.add((changes: Change[]) => {
      functionName = a;
      fileName = b;
      reactionInProgress = true;

      const newRefs: any = dependencyArrayFn(get());
      try {
        if (checkIfDepsRefsChanged(oldRefs, newRefs)) {
          oldRefs = newRefs;
          fn(state2, changes);
        }
      } catch (e) {
        console.error('error occured in reaction', e);
      } finally {
        functionName = '';
        fileName = '';
        reactionInProgress = false;
      }
    });
  }

  function checkIfDepsRefsChanged(oldRef: any[], newRef: any[]) {
    if (oldRef.length !== newRef.length) {
      return true;
    }
    for (let i = 0; i < oldRef.length; i++) {
      if (oldRef[i] !== newRef[i]) {
        return true;
      }
    }
    return false;
  }

  function val(
    newStateFn?: T | ((currentState: T) => void) | undefined,
    versionName?: string
  ): T {
    if (arguments.length === 0) {
      return get();
    } else {
      if (typeof newStateFn === 'function') {
        return update(newStateFn, versionName);
      } else if (arguments.length > 0) {
        //@ts-ignore
        return set(newStateFn, versionName);
      }
    }
    return get();
  }

  return {
    ___25304743758287906getset: true,
    get,
    getState: get,
    react,
    // deepClone: () => (structuredClone || deepClone)(get()),
    reset: () => {
      set(initialState);
    },
    set,
    update,
    saveVersion(name?: string) {
      if (name) {
        versions[name] = state1;
      }
    },

    val,
    getSavedVersion(name: string) {
      return versions[name];
    },
    actions:
      actions && typeof actions === 'function' ? actions(val) : undefined,
    subscribe,
  };
}

export function i<T extends Object, S extends Object>(
  initialState: T
): GetSet<T, S> {
  return getset(initialState, undefined, { allowReset: false });
}

export const create = getset;
export const createState = getset;

function shallowClone<T>(obj: T): T {
  return Array.isArray(obj)
    ? ([...obj] as T)
    : typeof obj === 'object'
    ? { ...obj }
    : obj;
}

export function getAllProps(instance: any): any[] {
  const props: string[] = Object.keys(instance);
  let currentPrototype = Object.getPrototypeOf(instance);
  while (currentPrototype !== null && currentPrototype !== Object.prototype) {
    props.push(...Object.getOwnPropertyNames(currentPrototype));
    currentPrototype = Object.getPrototypeOf(currentPrototype);
  }
  const unique = [...(new Set(props)?.values?.() || [])].filter(
    (item) => item !== 'constructor'
  );
  return unique;
}

function getAllStates<T>(state: T): BubbleReturnType<T> {
  const props = getAllProps(state);
  const newState: any = {};
  props.forEach((prop: keyof T) => {
    newState[prop] = state[prop];
    //@ts-ignore
    if (
      typeof state[prop] !== 'function' &&
      //@ts-ignore
      state[prop].getState &&
      //@ts-ignore
      state[prop].___25304743758287906getset
    ) {
      //@ts-ignore
      newState[prop] = state[prop].getState();
    } else if (typeof state[prop] === 'function') {
      //@ts-ignore
      newState[prop] = state[prop].bind(state);
    }
  });
  return newState;
}
function subscribeToAll<T>(fn: Function, state: T): Function {
  const props = getAllProps(state);
  const unsubs: any = [];
  const unsubscribe = () => {
    unsubs.forEach((i: Function) => i());
  };
  props.forEach((prop: keyof T) => {
    //@ts-ignore
    if (
      state[prop] &&
      typeof state[prop] !== 'function' &&
      //@ts-ignore
      state[prop].getState
    ) {
      //@ts-ignore
      unsubs.push(state[prop].subscribe(fn, prop));
    }
  });
  return unsubscribe;
}
export function createBubble<T extends Record<string, any>>(
  state: T
): {
  getState: () => BubbleReturnType<T>;
  subscribe: (fn: Function) => Function;
  reset: () => void;
} {
  let s = getAllStates(state);
  const fnToSubscribe = () => {
    s = getAllStates(state);
  };
  const reset = () => {
    Object.keys(s).forEach((key) => {
      //@ts-ignore
      s[key].reset?.();
    });
  };
  // subscribeToAll(fnToSubscribe, state);
  return {
    getState() {
      return s;
    },
    reset,
    subscribe: (fn: Function) =>
      subscribeToAll((changes: Change[], type: string = '') => {
        fnToSubscribe();
        fn(
          changes.map((item) => ({
            ...item,
            path: type + '.' + item.path,
          }))
        );
      }, state),
  };
}
