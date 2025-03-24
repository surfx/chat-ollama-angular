export class Util {

    // faz o merge de duas entidades do mesmo tipo
    // preserva os valores da 1ª entidade se não 
    // tiver informações na 2ª entidade
    // obs: isso pode ser um problema a depender do caso
    static mergeConfiguracoesRecursivo<T extends Record<string, any>>(target: T, source: Partial<T>): T {
        if (!source) {
            return target;
        }
    
        if (!target) {
            return source as T;
        }
    
        const mergedTarget: T = { ...target };
    
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                const sourceValue = source[key];
                const targetValue = target[key];
    
                if (sourceValue !== undefined) {
                    if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue) &&
                        typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
                        // Chamada recursiva DIRETA, sem 'this.'
                        mergedTarget[key] = this.mergeConfiguracoesRecursivo(targetValue, sourceValue);
                    } else {
                        mergedTarget[key] = (sourceValue ?? targetValue) as T[Extract<keyof T, string>];
                    }
                }
            }
        }
    
        return mergedTarget;
    }

}