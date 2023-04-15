/** Symbols used for the tokenization */
const conditionSingleCharSymbols = ['(', ')', '<', '>', '!'];
const conditionDoubleCharSymbols = ['||', '&&', '==', '!=', '<=', '>='];
const operatorValueSingleCharSymbols = ['*', '/', '+', '-'];
const operatorValueDoubleCharSymbols = [];

function conditionTokenAtPos(condition, pos) {
    return tokenAtPos(condition, pos, conditionSingleCharSymbols, conditionDoubleCharSymbols);
}

function operatorValueTokenAtPos(operatorValue, pos) {
    return tokenAtPos(operatorValue, pos, operatorValueSingleCharSymbols, operatorValueDoubleCharSymbols);
}
/**
 * Finds the token at the given position. Returns an object containing:
 * - token: the token as string or null if there is only whitespace at the given position
 * - range: the position/range of the token (or the whitespace) in the condition as array [startInclusive, endExclusive]
 */
function tokenAtPos(condition, pos, singleCharSymbols, doubleCharSymbols) {
    if (pos < 0 || pos >= condition.length)
        throw `pos ${pos} out of range: [0, ${condition.length}[`;
    const tokens = tokenize(condition, singleCharSymbols, doubleCharSymbols);
    for (let i = 0; i < tokens.ranges.length; ++i) {
        const range = tokens.ranges[i];
        if (range[0] <= pos && pos < range[1]) {
            return {
                token: tokens.tokens[i],
                range: range
            }
        } else if (range[0] > pos) {
            return {
                token: null,
                range: i === 0
                    ? [0, range[0]]
                    : [tokens.ranges[i - 1][1], range[0]]
            }
        }
    }
    return {
        token: null,
        range: tokens.ranges.length === 0
            ? [0, condition.length]
            : [tokens.ranges[tokens.ranges.length - 1][1], condition.length]
    };
}

function tokenizeCondition(condition) {
    return tokenize(condition, conditionSingleCharSymbols, conditionDoubleCharSymbols);
}

function tokenizeOperatorValue(operatorValue) {
    return tokenize(operatorValue, operatorValueSingleCharSymbols, operatorValueDoubleCharSymbols);
}

/**
 * Tokenizes the given string/expression and returns the tokens along with their positions
 * given as arrays [start, end].
 * 
 * The expression is split on all whitespace symbols (which are discarded) and the given single- or double- char symbols
 * (which are kept as tokens).
 */
function tokenize(expression, singleCharSymbols, doubleCharSymbols) {
    let ranges = [];
    let tokens = [];

    // does the actual tokenization work. pos is the current position in the given expression
    // and buffer is the number of characters we found since we terminated the last tokens
    const tokenizeHelper = function (pos, buffer) {
        // break condition: when we get to the end of the expression we push the remaining buffer
        // and return everything we found
        if (pos >= expression.length) {
            push(pos - buffer, pos);
            return {
                ranges: ranges,
                tokens: tokens
            }
        }
        // we recursively extract one symbol or character at a time and repeat the same function for 
        // the remaining expression. we keep track of how many characters we found since the last symbol
        // or whitespace ('buffer')
        if (isDoubleCharSymbol(expression, pos, doubleCharSymbols)) {
            push(pos - buffer, pos);
            push(pos, pos + 2);
            return tokenizeHelper(pos + 2, 0);
        } else if (isSingleCharSymbol(expression, pos, singleCharSymbols)) {
            push(pos - buffer, pos);
            push(pos, pos + 1);
            return tokenizeHelper(pos + 1, 0);
        } else if (isNonWhitespace(expression, pos)) {
            buffer++;
            return tokenizeHelper(pos + 1, buffer);
        } else {
            push(pos - buffer, pos);
            return tokenizeHelper(pos + 1, 0);
        }
    }

    // stores the tokens and ranges we found for the given interval
    const push = function (start, end) {
        if (end > start) {
            tokens.push(expression.slice(start, end));
            ranges.push([start, end]);
        }
    }

    return tokenizeHelper(0, 0);
}

function tokenRange2characterRange(expression, tokenRanges, startToken, endToken) {
    const start = startToken === tokenRanges.length
        ? expression.length
        : tokenRanges[startToken][0];
    const end = endToken === tokenRanges.length
        ? expression.length
        : tokenRanges[endToken - 1][tokenRanges[endToken - 1].length - 1];
    return [start, end];
}

function isNonWhitespace(str, pos) {
    return str.slice(pos, pos + 1).trim() !== '';
}

function isSingleCharSymbol(str, pos, singleCharSymbols) {
    return singleCharSymbols.indexOf(str[pos]) >= 0;
}

function isDoubleCharSymbol(str, pos, doubleCharSymbols) {
    return doubleCharSymbols.indexOf(str.slice(pos, pos + 2)) >= 0;
}

export { tokenizeCondition, conditionTokenAtPos, tokenizeOperatorValue, operatorValueTokenAtPos, tokenRange2characterRange };