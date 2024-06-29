import React from "react";

// local storage access

/**
 * NOTE only change from V1, is typescript! (and formatting)
 */
const isBrowser = typeof window !== "undefined";

const store = (name: string, value: any) => {
  if (isBrowser && typeof value !== "undefined") {
    console.debug("Storing...", { name, value });
  }
  window.localStorage.setItem(name, JSON.stringify(value));
};

const load = (name: string, defaultValue: any = undefined) => {
  if (isBrowser) {
    const value = window.localStorage.getItem(name);
    try {
      console.debug("Loaded...", { name, value });
      return typeof value === "string" ? JSON.parse(value) : defaultValue;
    } catch (err: any) {
      console.debug(
        `Caught error - retrieving local storage backed state - ${err.message}`
      );
      store(name, defaultValue);
    }
  }
  return defaultValue;
};

type ReturnType<Type> = [Type | undefined, (value: Function | any) => void];

/**
 * Wraps access to the state, and persists/retrieves data from local storage.
 * @param {*} storageKey - the name to store under.
 * @param {*} defaultValue - the default value.
 * @returns
 */
export const useLocalStorageBackedStateV4 = <Type = any>(
  storageKey: string,
  defaultValue: Type | undefined = undefined
): ReturnType<Type> => {
  // eslint-disable-next-line max-len
  if (typeof storageKey !== "string" || storageKey.trim().length === 0) {
    throw new Error(
      "storage key must be supplied to useLocalStorageBackedState!"
    );
  }
  const [state, setState] = React.useState(undefined);

  // load from storage
  React.useEffect(() => {
    const value = load(storageKey, defaultValue);
    // NOTE this next line's checks are prevent infinite loops!
    if (
      typeof value !== "undefined" &&
      JSON.stringify(value) !== JSON.stringify(state)
    ) {
      setState(value);
    }
  }, [storageKey, defaultValue, state]);

  // store to storage
  const setStateWrapper = React.useCallback(
    (value: Function | any) => {
      if (typeof value === "function") {
        setState((ps: any) => {
          const newval = value(ps);
          if (
            typeof newval !== "undefined" &&
            JSON.stringify(newval) !== JSON.stringify(state)
          ) {
            console.debug("#1 was diff, storing", {
              name: storageKey,
              newvalue: newval,
              oldstate: state,
            });
            store(storageKey, newval);
            return newval;
          } else {
            console.debug("#2 was NOT diff, not storing", {
              name: storageKey,
              newvalue: newval,
              oldstate: state,
            });
            return ps;
          }
        });
      } else {
        // NOTE this next line's checks are prevent infinite loops!
        // console.debug('useLocalStorageBackedState', { value, state })
        if (
          typeof value !== "undefined" &&
          JSON.stringify(value) !== JSON.stringify(state)
        ) {
          console.debug("#3 was diff, storing", {
            name: storageKey,
            newvalue: value,
            oldstate: state,
          });
          store(storageKey, value);
          setState(value);
        } else {
          console.debug("#4 was NOT diff, not storing", {
            name: storageKey,
            newvalue: value,
            oldstate: state,
          });
        }
      }
    },
    [storageKey, state]
  );

  return [state, setStateWrapper];
};