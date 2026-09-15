/**
 * Helpers for the parameters of the server-side custom model, i.e. objects like {value: 2.3, min: 0, max: 4} as
 * returned by GraphHopper's /info endpoint (min and max are optional).
 */
export function getParameterType(parameter) {
    return typeof parameter.value === 'boolean' ? 'boolean' : 'numeric';
}

export function getParameterRange(parameter) {
    return [
        typeof parameter.min === 'number' ? parameter.min : 0,
        typeof parameter.max === 'number' ? parameter.max : Infinity
    ];
}

export function displayRange(min, max) {
    return max === Infinity ? `>= ${min}` : `within [${min}, ${max}]`;
}
