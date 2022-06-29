import {tokenizeOperatorValue, tokenRange2characterRange} from "./tokenize";

const numericOperators = ['+', '-', '*'];

let _numericCategories;
let _tokens;
let _idx;

/**
 * Tokenizes and then parses the given operator value using the given list of numeric categories.
 * Returns the same kind of object as the parse method in parse_condition.js
 */
function parse(operatorValue, numericCategories) {
    const tokens = tokenizeOperatorValue(operatorValue);
    const result = parseTokens(tokens.tokens, numericCategories);
    result.tokens = tokens.tokens;
    if (result.error !== null) {
        result.range = tokenRange2characterRange(operatorValue, tokens.ranges, result.range[0], result.range[1]);
    }
    return result;
}

/**
 * Parses a given list of tokens according to the following grammar.
 *
 * operatorValue -> value | (value numericOperator value)*
 * value -> number | numericCategory, but the total number of values that are numericCategories must be zero or one!
 * numericOperator -> '+', '-', '*'
 *
 * The numericCategories parameter is a list of strings
 *
 * The return type is the same as for parseTokens in parse_condition.js
 */
function parseTokens(tokens, numericCategories) {
    _numericCategories = numericCategories;
    _tokens = tokens;
    _idx = 0;

    const result = parseOperatorValue();
    if (result.error !== null) return result;
    if (finished()) {
        if (tokens.reduce((n, t) => n + (numericCategories.indexOf(t) >= 0), 0) > 1)
            return error(`too many encoded values, max: 1`, [0, _tokens.length], []);
        else
            return valid();
    }
    return error(`unexpected token '${_tokens[_idx]}'`, [_idx, _idx + 1], numericOperators);
}

function parseOperatorValue() {
    // rule: operator value -> value
    const result = parseValue();
    if (result.error !== null) return result;
    if (finished()) return valid();

    // rule: operator value -> value (numericOperator value)*
    while (isNumericOperator()) {
        nextToken();
        if (finished())
            return error(`unexpected token '${_tokens[_idx -1]}'`, [_idx -1, _idx], []);
        const result = parseValue();
        if (result.error !== null) return result;
    }
    return valid();
}

function parseValue() {
    // rule: value -> number | numericCategory
    if (finished()) {
        return error(`empty expression`, [_idx, _idx], []);
    } else if (isValue()) {
        nextToken();
        return valid();
    } else {
        return error(`unexpected token '${_tokens[_idx]}'`, [_idx, _idx + 1], ['__hint__type a number'].concat(_numericCategories));
    }
}

function finished() {
    return _idx === _tokens.length;
}

function nextToken() {
    _idx++;
}

function isNumericOperator() {
    return tokensIsNumericOperator(_tokens[_idx]);
}

function tokensIsNumericOperator(token) {
    return numericOperators.indexOf(token) >= 0;
}

function isNumericCategory() {
    return _numericCategories.indexOf(_tokens[_idx]) >= 0;
}

function isValue() {
    return isNumericCategory() || isNumber(_tokens[_idx]);
}

function isNumber(value) {
    return !isNaN(Number(value))
}

function error(error, range, completions) {
    return {error, range, completions};
}

function valid() {
    return {error: null, range: [], completions: []};
}

export {parse, parseTokens}