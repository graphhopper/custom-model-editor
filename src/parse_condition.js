import {tokenizeCondition, tokenRange2characterRange} from './tokenize.js';

const comparisonOperators = ['==', '!='];
const numericComparisonOperators = ['<', '<=', '>', '>=', '==', '!='];
const logicOperators = ['||', '&&'];

let _categories;
let _areas;
let _tokens;
let _idx;

/**
 * Tokenizes and then parses the given condition using the given categories and areas. Returns an object containing:
 * - error, completions: see parseTokens
 * - range: the character range in which the (first) error occurred as list [startInclusive, endExclusive].
 *          if there are no invalid tokens, but rather something is missing the range will be
 *          [condition.length, condition.length]
 * - tokens: the tokens that were found during the tokenization step
 */
function parse(condition, categories, areas) {
    const tokens = tokenizeCondition(condition);
    const result = parseTokens(tokens.tokens, categories, areas);
    result.tokens = tokens.tokens;
    if (result.error !== null) {
        result.range = tokenRange2characterRange(condition, tokens.ranges, result.range[0], result.range[1]);
    }
    return result;
}

/**
 * Parses a given list of tokens according to the following grammar.
 *
 * condition -> comparison (logicOperator comparison)*
 * comparison -> enumCategory comparator value | numericCategory numericComparator number |
 *               booleanCategory comparator boolean | 'in_' area comparator boolean |
 *               '(' condition ')' | '!' '(' condition ')' |
 *               atomicCondition | '!' atomicCondition |
 * atomicCondition -> booleanLiteral | booleanCategory | 'in_' area | '!' atomicCondition
 * logicOperator -> '&&' | '||'
 * comparator -> '==' | '!='
 * numericComparator -> '>' | '<' | '>=' | '<=' | '==' | '!='
 * value -> string
 * number -> number
 * booleanLiteral -> 'true' | 'false'
 *
 * Note that we do not care about operator precedence between && and || because our aim is not
 * actually evaluating the condition, but rather checking the validity.
 *
 * The categories parameter is an object that maps category names to objects that contain the category type
 * `enum`, `boolean` or `numeric` and a list of possible (string) values (for `enum` only).
 *
 * The areas parameter is a list of valid area names.
 *
 * This function returns an object containing:
 * - error: an error string (or null) in case the tokens do not represent a valid condition.
 *          the parsing stops when the first error is encountered.
 * - range: the tokens range in which the (first) error occurred as list [startInclusive, endExclusive].
 *          if there are no invalid tokens, but rather something is missing the range will be
 *          [tokens.length, tokens.length]
 * - completions: a list of suggested tokens that could be used to replace the faulty ones. in case there is no
 *                appropriate completion the completion might be prefixed with '__hint__'.
 *
 * An alternative to the implementation here could be using a parser library like pegjs, nearly or tree-sitter?
 *
 */
function parseTokens(tokens, categories, areas) {
    for (let [k, v] of Object.entries(categories)) {
        if (v.type === 'enum') {
            if (v.values.length < 1)
                return error(`no values given for enum category ${k}`);
        } else if (v.type !== 'boolean' && v.type !== 'numeric')
            return error(`unknown category type: ${v.type} for category ${k}`)
    }

    _categories = categories;
    _areas = areas;
    _tokens = tokens;
    _idx = 0;

    const result = parseCondition();
    if (result.error !== null) return result;
    if (finished()) return valid();
    return error(`unexpected token '${_tokens[_idx]}'`, [_idx, _idx + 1], logicOperators);
}

function parseCondition() {
    // rule: condition -> comparison
    const result = parseComparison();
    if (result.error !== null) return result;
    if (finished()) return valid();

    // rule: condition -> comparison (logicOperator comparison)*
    while (isLogicOperator()) {
        _idx++;
        if (finished())
            return error(`unexpected token '${_tokens[_idx - 1]}'`, [_idx - 1, _idx], []);
        const result = parseComparison();
        if (result.error !== null) return result;
    }
    return valid();
}

function parseComparison() {
    if (isEnumCategory()) {
        return parseEnumComparison();
    } else if (isNumericCategory()) {
        return parseNumericComparison();
    } else if (isBooleanLiteral()) {
        return parseBooleanLiteral();
    } else if (isBooleanCategory()) {
        return parseBooleanComparison();
    } else if (isArea()) {
        return parseArea();
    } else if (isNegation()) {
        return parseNegation();
    } else if (isOpening()) {
        return parseConditionInParentheses();
    } else if (finished()) {
        return error(`empty comparison`, [_idx, _idx], []);
    } else if (isInvalidAreaOperator()) {
        return parseInvalidAreaOperator();
    } else {
        return error(`unexpected token '${_tokens[_idx]}'`, [_idx, _idx + 1], Object.keys(_categories).concat(_areas.map(a => 'in_' + a)).concat(['true', 'false']));
    }
}

function parseEnumComparison() {
    // rule: comparison -> enumCategory comparator value
    return parseTripleComparison(
        comparisonOperators,
        (category, operator, value) => isCategoryValue(category, value),
        (category, operator, value) => typeof _categories[category] !== "undefined" ? _categories[category].values : []
    );
}

function parseNumericComparison() {
    // rule: comparison -> numericCategory numericComparator value
    return parseTripleComparison(
        numericComparisonOperators,
        (category, operator, value) => isNumber(value),
        (category, operator, value) => ['__hint__type a number']
    );
}

function parseBooleanLiteral() {
    // rule: comparison -> boolean
    _idx++;
    return valid();
}

function parseBooleanComparison() {
    // rule: comparison -> booleanCategory
    if (_idx + 1 === _tokens.length) {
        _idx++;
        return valid();
    } else if (comparisonOperators.indexOf(_tokens[_idx + 1]) < 0) {
        _idx++;
        return valid();
    }

    // rule: comparison -> booleanCategory comparator boolean
    return parseTripleComparison(
        comparisonOperators,
        (category, operator, value) => isBoolean(value),
        (category, operator, value) => ['true', 'false']
    );
}

function parseArea() {
    const token = _tokens[_idx];
    if (token.length < `in_`.length) {
        console.error(`expected something like 'in_xyz', but got: '${token}'`);
        return;
    }
    const area = token.substring(`in_`.length)
    if (_areas.indexOf(area) < 0) {
        return error(`unknown area: '${area}'`, [_idx, _idx + 1], _areas.map(a => 'in_' + a));
    }

    // rule: comparison -> 'in_' area
    if (_idx + 1 === _tokens.length) {
        _idx++;
        return valid();
    } else if (comparisonOperators.indexOf(_tokens[_idx + 1]) < 0) {
        _idx++;
        return valid();
    }
    // rule: comparison -> 'in_' area comparator boolean
    return parseTripleComparison(
        comparisonOperators,
        (category, operator, value) => isBoolean(value),
        (category, operator, value) => ['true', 'false']
    );
}

function parseInvalidAreaOperator() {
    const token = _tokens[_idx];
    if (token.substring(0, 3) === `in_`) {
        console.error(`${token} is a valid area operator and should have been detected earlier`);
        return;
    }
    return error(`area names must be prefixed with 'in_'`, [_idx, _idx + 1], _areas.map(a => 'in_' + a));
}

function parseTripleComparison(allowedComparators, isValid, getAllowedValues) {
    if (_idx + 1 >= _tokens.length)
        return error(`invalid comparison. missing operator.`, [_idx, _idx + 1], []);
    const category = _tokens[_idx];
    const comparator = _tokens[_idx + 1];
    if (allowedComparators.indexOf(comparator) < 0)
        return error(`invalid operator '${comparator}'`, [_idx + 1, _idx + 2], allowedComparators);
    if (_idx + 2 >= _tokens.length)
        return error(`invalid comparison. missing value.`, [_idx, _idx + 2], []);
    const value = _tokens[_idx + 2];
    if (!isValid(category, comparator, value)) {
        return error(`invalid ${category}: '${value}'`, [_idx + 2, _idx + 3], getAllowedValues(category, comparator, value));
    }
    _idx += 3;
    return valid();
}

function parseNegation() {
    const from = _idx;
    _idx++;
    if (finished())
        return error(`missing condition after negation operator '!'`, [from, _idx],  Object.entries(_categories).filter(([, v]) => v.type === 'boolean').map(([k]) => k).concat(_areas.map(a => 'in_' + a)));
    if (isNegation())
        return parseNegation();
    // rule: comparison -> '!' atomicCondition
    if (isBooleanCategory() || isBooleanLiteral() || isArea()) {
        _idx++;
        return valid();
    }

    // rule: comparison -> '!' '(' condition ')'
    if (isOpening())
        return parseConditionInParentheses();

    return error(`unexpected token after negation operator '${_tokens[_idx]}'`, [_idx, _idx + 1], Object.entries(_categories).filter(([, v]) => v.type === 'boolean').map(([k]) => k).concat(_areas.map(a => 'in_' + a)));
}

function parseConditionInParentheses() {
    // rule: comparison -> '(' condition ')'
    const from = _idx;
    _idx++;
    const result = parseCondition();
    if (result.error !== null) return result;
    if (!isClosing()) return error(`unmatched opening '('`, [from, _idx], []);
    _idx++;
    return valid();
}

function finished() {
    return _idx === _tokens.length;
}

function isLogicOperator() {
    return tokensIsLogicOperator(_tokens[_idx]);
}

function tokensIsLogicOperator(token) {
    return logicOperators.indexOf(token) >= 0;
}

function isEnumCategory() {
    return isCategory() && _categories[_tokens[_idx]].type === 'enum';
}

function isNumericCategory() {
    return isCategory() && _categories[_tokens[_idx]].type === 'numeric';
}

function isBooleanCategory() {
    return isCategory() && _categories[_tokens[_idx]].type === 'boolean';
}

function isBooleanLiteral() {
    return isBoolean(_tokens[_idx]);
}

function isArea() {
    const token = _tokens[_idx];
    return typeof token === 'string' && token.substr(0, 3) === 'in_';
}

function isInvalidAreaOperator() {
    const token = _tokens[_idx];
    // typing something like 'area12' might be a common error so we provide some support for it
    return typeof token === 'string' && _areas.indexOf(token) >= 0;
}

function isCategory() {
    return typeof _categories[_tokens[_idx]] !== "undefined";
}

function isCategoryValue(category, value) {
    return _categories[category].values.indexOf(value) >= 0;
}

function isNegation() {
    return _tokens[_idx] === '!';
}

function isOpening() {
    return _tokens[_idx] === '(';
}

function isClosing() {
    return _tokens[_idx] === ')';
}

function isNumber(value) {
    return !isNaN(Number(value))
}

function isBoolean(value) {
    return value === 'true' || value === 'false';
}

function error(error, range, completions) {
    return {error, range, completions};
}

function valid() {
    return {error: null, range: [], completions: []};
}

export {parse, parseTokens};