import { Observable, of } from 'rxjs';

interface CacheItemService {
  value: any;
  timestamp: number;
  expirationTime: number;
}

/*
Ex de anotação @CachedService(5 * 60 * 1000)
O primeiro parâmetro deve ser a url (args[0])
Cache de sessionStorage para métodos http get, post, etc
*/
export function CachedService(expirationTimeMs: number = 5 * 60 * 1000) { // 5 minutos por padrão
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const url = args[0];
      const cacheKey = `${target.constructor.name}_${propertyKey}_${url}`;

      const cachedItem = sessionStorage.getItem(cacheKey);

      if (cachedItem) {
        const item: CacheItemService = JSON.parse(cachedItem);
        const now = Date.now();

        if (now - item.timestamp <= item.expirationTime) {
          return of(item.value);
        }
        sessionStorage.removeItem(cacheKey);
      }

      const result = originalMethod.apply(this, args);

      if (result instanceof Observable) {
        result.subscribe((value: any) => {
          const cacheItem: CacheItemService = {
            value: value,
            timestamp: Date.now(),
            expirationTime: expirationTimeMs
          };
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheItem));
        });
      } else {
        const cacheItem: CacheItemService = {
          value: result,
          timestamp: Date.now(),
          expirationTime: expirationTimeMs
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      }

      return result;
    };

    return descriptor;
  };
} 