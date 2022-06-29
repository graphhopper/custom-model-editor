import {parse} from './parse_condition.js';
import {conditionTokenAtPos} from "./tokenize.js";

/**
 * Returns auto-complete suggestions for a given string/condition, categories, areas, and a character position.
 * The returned object contains two fields:
 *  - suggestions: a list of suggestions/strings
 *  - range: the character range that is supposed to be replaced by the suggestion
 */
function complete(condition, pos, categories, areas) {
    const lastNonWhitespace = getLastNonWhitespacePos(condition);
    if (pos > lastNonWhitespace) {
        // pad the condition with whitespace until pos, remove everything after pos
        let parseCondition = condition;
        while (parseCondition.length < pos)
            parseCondition += ' ';
        parseCondition = parseCondition.slice(0, pos);
        // we use a little trick: we run parse() on a manipulated condition where we inserted a dummy character to
        // see which completions are offered to us (assuming we typed in something)
        parseCondition += '…';
        const parseResult = parse(parseCondition, categories, areas);
        const tokenPos = conditionTokenAtPos(parseCondition, pos);

        // in case the condition has an error at a position that is parsed before our position we return no suggestions
        if (parseResult.range[0] !== tokenPos.range[0])
            return empty();

        // we only keep the suggestions that match the already existing characters if there are any
        const suggestions = parseResult.completions.filter(c => {
            // we need to remove our dummy character for the filtering
            const partialToken = tokenPos.token.substring(0, tokenPos.token.length - 1);
            return startsWith(c, partialToken);
        });
        return {
            suggestions: suggestions,
            range: suggestions.length === 0 ? null : [tokenPos.range[0], pos]
        }
    } else {
        let tokenPos = conditionTokenAtPos(condition, pos);
        // we replace the token at pos with a dummy character
        const parseCondition = condition.substring(0, tokenPos.range[0]) + '…' + condition.substring(tokenPos.range[1]);
        // pos might be a whitespace position but right at the end of the *previous* token. we have to deal with some
        // special cases (and this is actually similar to the situation where we are at the end of the condition).
        // this is quite messy, but relying on the tests for now...
        const modifiedTokenPos = conditionTokenAtPos(parseCondition, tokenPos.range[0]);
        const parseResult = parse(parseCondition, categories, areas);
        if (parseResult.range[0] !== modifiedTokenPos.range[0])
            return empty();
        const suggestions = parseResult.completions.filter(c => {
            let partialToken = tokenPos.token === null
                ? modifiedTokenPos.token.substring(0, modifiedTokenPos.token.length - 1)
                : tokenPos.token.substring(0, pos - tokenPos.range[0]);
            return startsWith(c, partialToken);
        });
        return {
            suggestions: suggestions,
            range: suggestions.length === 0
                ? null
                : [modifiedTokenPos.range[0], tokenPos.token === null ? pos : tokenPos.range[1]]
        }
    }
}

function empty() {
    return {
        suggestions: [],
        range: null
    }
}

function getLastNonWhitespacePos(str) {
    for (let i = str.length - 1; i >= 0; --i) {
        if (str.slice(i, i + 1).trim() !== '') {
            return i;
        }
    }
    return -1;
}

function startsWith(str, substr) {
    // str.startsWith(substr) is not supported by IE11...
    return str.substring(0, substr.length) === substr;
}

export {complete};