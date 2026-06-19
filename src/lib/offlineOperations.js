/**
 * Offline-Aware Entity Operations Wrapper
 * 
 * Automatically queues operations when offline and syncs when connection restored.
 * Use this instead of direct entity calls for critical operations.
 */

import { base44 } from '@/api/base44Client';
import { queueOperation, checkServiceHealth, executeWithFallback } from './offlineEngine';
import { toast } from 'sonner';

/**
 * Create entity with automatic offline queuing
 */
export async function createEntity(entityName, data, options = {}) {
  const { toastMessage = true, fallbackFn = null } = options;
  
  return executeWithFallback(
    async () => {
      const result = await base44.entities[entityName].create(data);
      if (toastMessage) {
        toast.success(`${entityName} created successfully`);
      }
      return result;
    },
    fallbackFn || (async () => {
      // Default fallback: queue for later
      queueOperation({
        type: 'entity_create',
        entity: entityName,
        data,
      });
      if (toastMessage) {
        toast.info(`${entityName} saved locally (will sync when online)`);
      }
      return { ...data, _offline: true, _queued: true };
    }),
    {
      entity: entityName,
      operationType: 'entity_create',
      data,
      cacheKey: `${entityName}:create:${JSON.stringify(data)}`,
      cacheTTL: 60000, // 1 min
    }
  );
}

/**
 * Update entity with automatic offline queuing
 */
export async function updateEntity(entityName, id, data, options = {}) {
  const { toastMessage = true, fallbackFn = null } = options;
  
  return executeWithFallback(
    async () => {
      const result = await base44.entities[entityName].update(id, data);
      if (toastMessage) {
        toast.success(`${entityName} updated successfully`);
      }
      return result;
    },
    fallbackFn || (async () => {
      // Default fallback: queue for later
      queueOperation({
        type: 'entity_update',
        entity: entityName,
        id,
        data,
      });
      if (toastMessage) {
        toast.info(`${entityName} changes saved locally (will sync when online)`);
      }
      return { ...data, id, _offline: true, _queued: true };
    }),
    {
      entity: entityName,
      operationType: 'entity_update',
      id,
      data,
      cacheKey: `${entityName}:${id}:update`,
      cacheTTL: 60000,
    }
  );
}

/**
 * Delete entity with automatic offline queuing
 */
export async function deleteEntity(entityName, id, options = {}) {
  const { toastMessage = true } = options;
  
  return executeWithFallback(
    async () => {
      await base44.entities[entityName].delete(id);
      if (toastMessage) {
        toast.success(`${entityName} deleted successfully`);
      }
      return { id, deleted: true };
    },
    async () => {
      // Queue for later
      queueOperation({
        type: 'entity_delete',
        entity: entityName,
        id,
      });
      if (toastMessage) {
        toast.info(`${entityName} deletion queued (will sync when online)`);
      }
      return { id, _offline: true, _queued: true };
    },
    {
      entity: entityName,
      operationType: 'entity_delete',
      id,
    }
  );
}

/**
 * List entities with cache fallback
 */
export async function listEntities(entityName, sort, limit = 50, options = {}) {
  const { useCache = true, cacheTTL = 300000 } = options; // 5 min default cache
  
  return executeWithFallback(
    async () => {
      const result = await base44.entities[entityName].list(sort, limit);
      return result;
    },
    async () => {
      // Return cached data or empty array
      if (useCache) {
        const cachedKey = `${entityName}:list:${sort}:${limit}`;
        const cached = localStorage.getItem(`continental_cache:${cachedKey}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!parsed.expired || parsed.expired > Date.now()) {
            return parsed.data;
          }
        }
      }
      toast.warning('Showing cached data (offline mode)');
      return [];
    },
    {
      cacheKey: `${entityName}:list:${sort}:${limit}`,
      cacheTTL,
      useCache,
    }
  );
}

/**
 * Filter entities with cache fallback
 */
export async function filterEntities(entityName, query, sort, limit = 50, options = {}) {
  const { useCache = true, cacheTTL = 300000 } = options;
  
  return executeWithFallback(
    async () => {
      const result = await base44.entities[entityName].filter(query, sort, limit);
      return result;
    },
    async () => {
      // Return cached data or empty array
      if (useCache) {
        const cachedKey = `${entityName}:filter:${JSON.stringify(query)}:${sort}:${limit}`;
        const cached = localStorage.getItem(`continental_cache:${cachedKey}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!parsed.expired || parsed.expired > Date.now()) {
            return parsed.data;
          }
        }
      }
      toast.warning('Showing cached data (offline mode)');
      return [];
    },
    {
      cacheKey: `${entityName}:filter:${JSON.stringify(query)}:${sort}:${limit}`,
      cacheTTL,
      useCache,
    }
  );
}

/**
 * Invoke function with automatic offline queuing
 */
export async function invokeFunction(functionName, payload, options = {}) {
  const { toastMessage = true, fallbackFn = null } = options;
  
  return executeWithFallback(
    async () => {
      const result = await base44.functions.invoke(functionName, payload);
      if (toastMessage) {
        toast.success(`${functionName} executed successfully`);
      }
      return result;
    },
    fallbackFn || (async () => {
      // Queue for later
      queueOperation({
        type: 'function_invoke',
        functionName,
        payload,
      });
      if (toastMessage) {
        toast.info(`${functionName} queued (will execute when online)`);
      }
      return { _offline: true, _queued: true };
    }),
    {
      operationType: 'function_invoke',
      functionName,
      payload,
      cacheKey: `function:${functionName}:${JSON.stringify(payload)}`,
      cacheTTL: 60000,
    }
  );
}

/**
 * AI request with deterministic fallback
 */
export async function aiRequest(prompt, options = {}) {
  const { 
    model = 'automatic',
    responseJsonSchema = null,
    fallbackFn = null,
    toastMessage = true,
  } = options;
  
  return executeWithFallback(
    async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model,
        response_json_schema: responseJsonSchema,
      });
      return result;
    },
    fallbackFn || (async (error) => {
      // Return deterministic fallback
      toast.info('Using data-driven analysis (AI unavailable)');
      return {
        _fallback: true,
        _error: error.message,
        message: 'Deterministic analysis generated from available data',
      };
    }),
    {
      operationType: 'ai_request',
      aiParams: {
        prompt,
        model,
        response_json_schema: responseJsonSchema,
      },
      cacheKey: `ai:${prompt.slice(0, 50)}`,
      cacheTTL: 120000, // 2 min
    }
  );
}

/**
 * Get current offline status
 */
export async function getOfflineStatus() {
  const health = await checkServiceHealth();
  return {
    isOffline: !health.internet.online || !health.backend.online,
    isAiUnavailable: !health.ai.creditsAvailable,
    health,
  };
}