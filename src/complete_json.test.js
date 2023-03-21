import {completeJson, getJsonPath} from "./complete_json"

const rootElements = [`"speed"`, `"priority"`, `"distance_influence"`, `"areas"`];
const statementElements = [`"if"`, `"else_if"`, `"else"`, `"limit_to"`, `"multiply_by"`];

describe('complete_json', () => {
    test('root elements', () => {
        test_complete(`{    }`, 3, rootElements, [3, 4]);
        test_complete(`{ `, 1, rootElements, [1, 2]);
        test_complete(`{`, 1, rootElements, [1, 2]);
        test_complete(`{"speed", `, 1, rootElements, [1, 8]);
        test_complete(`{"speed", `, 9, rootElements.filter(s => s !== `"speed"`), [9, 10]);
        test_complete(`{"speed"  `, 9, rootElements, [9, 10]);
        test_complete(`{"speed": [], "distance_influence": 100}: `, 13, rootElements.filter(s => s !== `"speed"` && s !== '"distance_influence"'), [13, 14]);
        test_complete(`{"speed": [], "distance_influence": 100}: `, 14, rootElements.filter(s => s !== `"speed"`), [14, 34]);
        test_complete(`{"spe `, 1, rootElements, [1, 6]);
        test_complete(`{"spe `, 5, rootElements, [1, 6]);
        test_complete(`{"spe `, 6, rootElements, [1, 7]);
        // ugh... tricky, we do not really want to mess up the comma, especially when we are just in the process of
        // typing "speed" -> let's see later...
        test_complete(`{"spe , "priority": []}`, 5, rootElements, [1, 9]);
    });

    test('statements', () => {
        test_complete(`{"speed": [ { "x"`, 15, statementElements, [14, 17]);
        test_complete(`{"priority": [ {}, { "x"`, 21, statementElements, [21, 24]);
        test_complete(`{"speed": [ { "a": "b", "x"`, 25, statementElements, [24, 27]);
        test_complete(`{"priority": [ {"if": "abc", "limit_to": 30}, { `, 48, statementElements, [48, 49]);
        test_complete(`{"priority": [ {"if": "abc",         `, 30, [`"limit_to"`, `"multiply_by"`], [30, 31]);
        test_complete(`{"priority": [ {"if": "abc", "xyz123"`, 30, [`"limit_to"`, `"multiply_by"`], [29, 37]);
        test_complete(`{"priority":  [ {"limit_to": 100, "xyz123"`, 35, [`"if"`, `"else_if"`, `"else"`], [34, 42]);
        // conditions
        test_complete(`{"speed": [ {"if":    }      `, 20, [`__hint__type a condition`], [18, 23]);
        test_complete(`{"speed": [ {"if": "x"`, 20, [`__hint__type a condition`], [19, 22]);
        test_complete(`{"speed":  [ {"if": "abc",   "limit_to": 30}, {"else_if": "my_condition"`, 60, [`__hint__type a condition`], [58, 72]);
        test_complete(`{"speed": [{"else": `, 20, [`""`], [20, 22]);
        // operator values
        test_complete(`{"speed": [{"if": "abc", "limit_to":    `, 38, [`__hint__type an expression`], [36, 40]);
        test_complete(`{"priority": [ {"if": "abc",   "multiply_by": "x"`, 47, [`__hint__type an expression`], [46, 49]);
    });

    test(`distance_influence`, () => {
        test_complete(`{"distance_influence": "x`, 23, [`__hint__type a number`], [23, 25]);
        test_complete(`{"distance_influence": "x", "speed": []`, 23, [`__hint__type a number`], [23, 26]);
        test_complete(`{"distance_influence": 123, "speed": []`, 23, [`__hint__type a number`], [23, 26]);
    });

    test(`areas`, () => {
        test_complete(`{"areas": {  "x"`, 14, [`"type"`, `"features"`], [13, 16]);
        test_complete(`{"areas": {  "x", "type": "FeatureCollection"`, 14, [`"features"`], [13, 16]);
        test_complete(`{"areas": {  "features": [], "x"`, 30, [`"type"`], [29, 32]);
        test_complete(`{"areas": {  "type": x`, 21, [`"FeatureCollection"`], [20, 22]);
        test_complete(`{"areas": {  "type": "FeatureCollection", "features": [{"id": "x"`, 63, [`__hint__type an area id`], [62, 65]);
        test_complete(`{"areas": {  "type": "FeatureCollection", "features": [{"id":        `, 63, [`__hint__type an area id`], [61, 69]);
        test_complete(`{"areas": {  "type": "FeatureCollection", "features": [{ "x"`, 58, [`"type"`, `"id"`, `"geometry"`], [57, 60]);
        test_complete(`{"areas": {  "type": "FeatureCollection", "features": [{"type": "Feature", "id": "Berlin",   `, 90, [`"geometry"`], [90, 91]);
        test_complete(`{"areas": {  "type": "FeatureCollection", "features": [{"type": x, "id": "Berlin",   `, 64, [`"Feature"`], [63, 65]);
        test_complete(`{\n "areas": {"type": "FeatureCollection", "features": [\n  {\n   `, 65, [`"type"`, `"id"`, `"geometry"`], [65, 66]);
    });

    test(`areas geometry`, () => {
        test_complete(`{"areas": { "type": "FeatureCollection", "features": [ {"id": "berlin", "geometry": {   "x"`, 90, [`"type"`, `"coordinates"`], [88, 91]);
        test_complete(`{"areas": { "type": "FeatureCollection", "features": [ {"id": "berlin", "geometry": {      `, 90, [`"type"`, `"coordinates"`], [90, 91]);
        test_complete(`{"areas": { "type": "FeatureCollection", "features": [ {"id": "berlin", "geometry": {   "type": "x"`, 97, [`"Polygon"`], [96, 99]);
        test_complete(`{"areas": { "type": "FeatureCollection", "features": [ {"id": "berlin", "geometry": {   "type": "Polygon",  "x"`, 109, [`"coordinates"`], [108, 111]);
    });

});

function test_complete(content, pos, suggestions, range) {
        const result = completeJson(content, pos);
    try {
        expect(result.suggestions).toStrictEqual(suggestions);
        expect(result.range).toStrictEqual(range);
    } catch (e) {
        Error.captureStackTrace(e, test_complete);
        throw e;
    }
}

describe("get_json_path", () => {
    test('root elements', () => {
        test_path(`"x"`, 0, [`root`, `literal`], [0, 3]);
        test_path(`"x"`, 1, [`root`, `literal`], [0, 3]);
        test_path(`"x"`, 2, [`root`, `literal`], [0, 3]);
        test_path(`"x"`, 3, [`root`, `literal`], [0, 3]);
        test_path(`{  "x" `, 3, [`root`, `object`, `property`, `key`], [3, 6]);
        test_path(`{"speed": [], "x"`, 14, [`root`, `object`, `property`, `key`], [14, 17]);
        test_path(`{"speed": [], "x""distance_influence": 10}`, 15, [`root`, `object`, `property`, `key`], [14, 17]);
        test_path(`{\n"speed": [], "x"`, 17, [`root`, `object`, `property`, `key`], [15, 18]);
    });

    test('properties details', () => {
        // objects span the range from { to }
        test_path(`{ }`, 0, ['root', 'object'], [0, 3]);
        test_path(`{ }`, 1, ['root', 'object'], [0, 3]);
        test_path(`{ }`, 2, ['root', 'object'], [0, 3]);
        test_path(`{ }`, 3, ['root', 'object'], [0, 3]);
        test_path(`{ } `, 3, ['root', 'object'], [0, 3]);
        // everything inside an object is represented by 'properties' that can contain a key and value
        test_path(`{ "abc" }`, 1, ['root', 'object'], [0, 9]);
        test_path(`{ "abc" }`, 2, ['root', 'object', 'property', 'key'], [2, 7]);
        // this is a bit strange: the property starts where the 'key' starts, but goes to the end of the block
        // (but does not start at the block)
        test_path(`{ "abc"   }`, 8, ['root', 'object', 'property'], [2, 11]);
        test_path(`{   "abc"   }`, 1, ['root', 'object'], [0, 13]);
        // ... adding just the colon does not create a property
        test_path(`{   :   }`, 2, ['root', 'object'], [0, 9]);
        test_path(`{   :   }`, 6, ['root', 'object'], [0, 9]);
        // ... neither does a comma
        test_path(`{   ,   }`, 2, ['root', 'object'], [0, 9]);
        test_path(`{   ,   }`, 6, ['root', 'object'], [0, 9]);
        test_path(`{ "abc"   :   }`, 3, ['root', 'object', 'property', 'key'], [2, 7]);
        test_path(`{ "abc"   :   }`, 8, ['root', 'object', 'property'], [2, 15]);
        // everything right of the colon we consider to be the properties' 'value'
        test_path(`{ "abc"   :   }`, 12, ['root', 'object', 'property[abc]', 'value'], [11, 15]);
        test_path(`{ "abc" : "def"  ,   }`, 13, ['root', 'object', 'property[abc]', 'value'], [10, 15]);
        test_path(`{ "abc" : "def"  ,   }`, 16, ['root', 'object'], [0, 22]);
        test_path(`{ "abc" : "def"  ,   }`, 18, ['root', 'object'], [0, 22]);
        test_path(`{ "abc" : "def"  , "ghi"  }`, 22, ['root', 'object', 'property', 'key'], [19, 24]);
    });

    test('statements', () => {
        test_path(`{"speed": [ "x"`, 12, [`root`, `object`, `property[speed]`, `array[0]`, `literal`], [12, 15]);
        test_path(`{"speed": [ { "x"`, 15, [`root`, `object`, `property[speed]`, `array[0]`, `object`, `property`, `key`], [14, 17]);
        test_path(`{"priority": [ {}, { "x"`, 22, [`root`, `object`, `property[priority]`, `array[1]`, `object`, `property`, `key`], [21, 24]);
        test_path(`{"speed": [ { "a": "b", "x"`, 25, [`root`, `object`, `property[speed]`, `array[0]`, `object`, `property`, `key`], [24, 27]);
        test_path(`{"priority": [ {"if": "abc",  "limit_to": 30}, "x"`, 48, [`root`, `object`, `property[priority]`, `array[1]`, `literal`], [47, 50]);
        test_path(`{"priority":[ {"if": "abc", "xyz"`, 30, [`root`, `object`, `property[priority]`, `array[0]`, `object`, `property`, `key`], [28, 33]);
        // conditions
        test_path(`{"speed": [ {"if": "x"`, 20, [`root`, `object`, `property[speed]`, `array[0]`, `object`, `property[if]`, `value`], [19, 22]);
        test_path(`{"speed": [{"if": "abc", "limit_to": 30}, {"else_if": "my_condition"`, 65, [`root`, `object`, `property[speed]`, `array[1]`, `object`, `property[else_if]`, `value`], [54, 68]);
        // operator values
        test_path(`{"speed": [{"if": "abc", "limit_to": "x"`, 37, [`root`, `object`, `property[speed]`, `array[0]`, `object`, `property[limit_to]`, `value`], [37, 40]);
        test_path(`{"priority": [{ "if": "abc", "multiply_by": "x"`, 46, [`root`, `object`, `property[priority]`, `array[0]`, `object`, `property[multiply_by]`, `value`], [44, 47]);
    });

    test(`distance_influence`, () => {
        test_path(`{"distance_influence": "x"`, 24, [`root`, `object`, `property[distance_influence]`, `value`], [23, 26]);
    });

    test(`areas`, () => {
        test_path(`{"areas":  "x"`, 12, [`root`, `object`, `property[areas]`, `value`], [11, 14]);
        test_path(`{"areas": { "type": "FeatureCollection", "features": [{"id": "berlin",    "x"`, 75, [`root`, `object`, `property[areas]`, `object`, `property[features]`, `array[0]`, `object`, `property`, `key`], [74, 77]);
        test_path(`{"areas":  {"features": [{"id": "berlin", "type": "Feature"    "x"`, 64, [`root`, `object`, `property[areas]`, `object`, `property[features]`, `array[0]`, `object`, `property`, `key`], [63, 66]);
        test_path(`{"areas":{ "features": [{   "type": "Feature"    "geometry": []},  "x"`, 67, [`root`, `object`, `property[areas]`, `object`, `property[features]`, `array[1]`, `literal`], [67, 70]);
        test_path(`{\n "areas": {\n "features": [{"id": "berlin",  `, 37, [`root`, `object`, `property[areas]`, `object`, `property[features]`, `array[0]`, `object`, `property[id]`, `value`], [35, 43]);
    });
});

function test_path(content, pos, expectedSignature, expectedTokenRange) {
        const jsonPath = getJsonPath(content, pos);
    try {
        expect(jsonPath.signature).toStrictEqual(expectedSignature);
        expect(jsonPath.tokenRange).toStrictEqual(expectedTokenRange);
    } catch (e) {
        Error.captureStackTrace(e, test_path);
        throw e;
    }
}