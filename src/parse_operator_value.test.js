import {parseTokens} from './parse_operator_value';

const numericCategories = ['x', 'pq', 'xyz'];
const allowedOperators = ['+', '-', '*'];
const allowedValues = ['__hint__type a number'].concat(numericCategories);

describe("parse", () => {

    test("no categories", () => {
        expect(parseTokens('x + 10', []).error).toBe(`unexpected token 'x'`);
    });

    test("parse tokens, valid", () => {
        test_parseTokens_valid(['1']);
        test_parseTokens_valid(['200']);
        test_parseTokens_valid(['pq']);
        test_parseTokens_valid(['x', '+', '100']);
        test_parseTokens_valid(['x', '-', '100']);
        test_parseTokens_valid(['x', '*', '100']);
        test_parseTokens_valid(['100', '+', 'x']);
        test_parseTokens_valid(['100', '-', 'x']);
        test_parseTokens_valid(['100', '*', 'x']);
        test_parseTokens_valid(['pq', '+', '100'])
        test_parseTokens_valid(['100', '+', 'pq'])
        test_parseTokens_valid(['xyz', '+', '100'])
        test_parseTokens_valid(['100', '+', 'xyz'])
    });

    test("parse tokens, invalid", () => {
        test_parseTokens([], 'empty expression', [0, 0], []);
        test_parseTokens(['x', 'x'], `unexpected token 'x'`, [1, 2], allowedOperators);
        test_parseTokens(['100', '200'], `unexpected token '200'`, [1, 2], allowedOperators);
        test_parseTokens(['*', '200'], `unexpected token '*'`, [0, 1], allowedValues);
        test_parseTokens(['-', '200'], `unexpected token '-'`, [0, 1], allowedValues);
        test_parseTokens(['+', '200'], `unexpected token '+'`, [0, 1], allowedValues);
        test_parseTokens(['200', '+'], `unexpected token '+'`, [1, 2], []);
        test_parseTokens(['200', '/'], `unexpected token '/'`, [1, 2], allowedOperators);
        test_parseTokens(['200', '*', 'y'], `unexpected token 'y'`, [2, 3], allowedValues);
        test_parseTokens(['200', '*', 'pq', '+'], `unexpected token '+'`, [3, 4], []);
        test_parseTokens(['200', '*', 'pq', '+', 'xyz'], 'too many encoded values, max: 1', [0, 5], []);
    });

    function test_parseTokens_valid(tokens) {
        const res = parseTokens(tokens, numericCategories);
        check(test_parseTokens_valid, res, null, [], []);
    }

    function test_parseTokens(tokens, error, range, completions) {
        const res = parseTokens(tokens, numericCategories);
        check(test_parseTokens, res, error, range, completions);
    }

    function check(fun, res, error, range, completions) {
        try {
            expect(res.error).toBe(error);
            expect(res.range).toStrictEqual(range);
            expect(res.completions).toStrictEqual(completions);
        } catch (e) {
            // this is a little trick to show a more useful stack-trace: https://kentcdodds.com/blog/improve-test-error-messages-of-your-abstractions
            Error.captureStackTrace(e, fun);
            throw e;
        }
    }
})