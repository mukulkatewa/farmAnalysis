// Transactional test double: commits are serialized and writes roll back on failure.
export function memoryFirestore() {
  const docs = new Map();
  let chain = Promise.resolve();
  const copy = (v) => (v === undefined ? undefined : structuredClone(v));
  const snapshot = (ref) => ({
    exists: docs.has(ref.path),
    data: () => copy(docs.get(ref.path)),
  });
  const ref = (path) => ({
    path,
    collection: (name) => ({ doc: (id) => ref(`${path}/${name}/${id}`) }),
    get: async () => snapshot(ref(path)),
  });
  const apply = (path, data, merge) =>
    docs.set(path, merge ? { ...docs.get(path), ...copy(data) } : copy(data));
  return {
    docs,
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
    batch: () => {
      const writes = [];
      return {
        set: (ref, data) => writes.push([ref.path, data]),
        commit: async () => writes.forEach(([p, d]) => apply(p, d)),
      };
    },
    runTransaction: (fn) => {
      const result = chain.then(async () => {
        const writes = [];
        const value = await fn({
          get: async (ref) => snapshot(ref),
          set: (ref, data, options) =>
            writes.push([ref.path, data, options?.merge]),
          update: (ref, data) => writes.push([ref.path, data, true]),
        });
        writes.forEach(([p, d, m]) => apply(p, d, m));
        return value;
      });
      chain = result.catch(() => {});
      return result;
    },
  };
}
