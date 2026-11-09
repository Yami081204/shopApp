import AppError from '../utils/AppError.js';

const createStrategyRegistry = ({
  keyName,
  unknownMessage = 'Unsupported strategy',
  unknownStatus = 400,
  unknownCode = 'VALIDATION_ERROR'
} = {}) => {
  const strategies = new Map();
  const aliases = new Map();

  const resolveKey = (key) => {
    const normalized = String(key ?? '').trim().toUpperCase();
    return aliases.get(normalized) || normalized;
  };

  const unknownError = () => new AppError(unknownMessage, unknownStatus, unknownCode);

  const registry = {
    register(strategy, key = strategy?.[keyName]) {
      const id = String(key ?? '').trim().toUpperCase();
      if (!id) throw new Error(`Strategy is missing a ${keyName}`);
      strategies.set(id, strategy);
      return registry;
    },

    registerAlias(alias, key) {
      aliases.set(String(alias).trim().toUpperCase(), String(key).trim().toUpperCase());
      return registry;
    },

    has(key) {
      return strategies.has(resolveKey(key));
    },

    normalize(key, { fallback } = {}) {
      const resolved = resolveKey(key || fallback);
      if (!strategies.has(resolved)) throw unknownError();
      return resolved;
    },

    forKey(key, options) {
      return strategies.get(registry.normalize(key, options));
    },

    all() {
      return [...strategies.values()];
    }
  };

  return registry;
};

export { createStrategyRegistry };
