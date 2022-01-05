import isPlainObject from 'lodash/isPlainObject';
import forEach from 'lodash/forEach';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: {
      connect: (config: any) => any;
      disconnect: () => any;
      send: (event: string, state: any) => any;
      init: (initial: any) => any;
    };
  }
}

export type TraversableKey = string | number;

export type Traversable = {
  [key in TraversableKey]: any;
};

export type Visitor = (value: any, key: TraversableKey, path: Array<TraversableKey>) => boolean | void;

/**
 * Traverse the tree recursively
 *
 * @param root - is root node of the plain object or array
 * @param callback - is visitor callback which given value, key and path parameters
 * @param path - is a private parameter for internal usage
 */
export function traverse(
  root: Traversable,
  callback: Visitor,
  path: Array<TraversableKey> = [],
): void {
  if (typeof callback !== 'function') return;

  if (callback(root, path.slice(-1)[0], path)) {
    return;
  }

  if (!isPlainObject(root) && !Array.isArray(root)) return;

  forEach(root, (child, key) => {
    traverse(child, callback, [...path, key]);
  });
}
