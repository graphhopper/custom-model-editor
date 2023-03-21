import {validateJson} from './validate_json';

describe('validate_json', () => {
    test('root must be an object', () => {
        test_validate(``, [
            `root: must be an object, range: [0, 0]`
        ]);
        test_validate(` `, [
            `root: must be an object, range: [0, 1]`
        ]);
        test_validate(`null`, [
            `root: must be an object. given type: null, range: [0, 4]`
        ]);
        test_validate(`[]`, [
            `root: must be an object. given type: array, range: [0, 2]`
        ]);
        test_validate(`"abc"`, [
            `root: must be an object. given type: string, range: [0, 5]`
        ]);
        test_validate(`123`, [
            `root: must be an object. given type: number, range: [0, 3]`
        ]);
        test_validate(`"speed": []"`, [
            `root: must be an object. given type: string, range: [0, 7]`
        ]);
        test_validate(`{}`, []);
    });

    test('root keys are not empty', () => {
        test_validate(`{ "": []}`, [
            `root: keys must be non-empty and must not only consist of whitespace. given: '', range: [2, 4]`
        ]);
        test_validate(`{""  :`, [
            `root: keys must be non-empty and must not only consist of whitespace. given: '', range: [1, 3]`
        ]);
        test_validate(`{"    " :}`, [
            `root: keys must be non-empty and must not only consist of whitespace. given: '    ', range: [1, 7]`
        ]);
        test_validate(`{"\n" :}`, [
            `root: keys must be non-empty and must not only consist of whitespace. given: '', range: [1, 2]`
        ]);
        test_validate(`{"" \t: \n }`, [
            `root: keys must be non-empty and must not only consist of whitespace. given: '', range: [1, 3]`
        ]);
    });

    test('root keys are valid', () => {
        test_validate(`{"abc": "def"}`, [
            `root: possible keys: ['speed', 'priority', 'distance_influence', 'areas']. given: 'abc', range: [1, 6]`
        ]);
        test_validate(`{"spee": []}`, [
            `root: possible keys: ['speed', 'priority', 'distance_influence', 'areas']. given: 'spee', range: [1, 7]`
        ]);
    });

    test('root keys are unique', () => {
        test_validate(`{"speed": [], "priority": [], "speed": []}`, [
            `root: keys must be unique. duplicate: 'speed', range: [30, 37]`
        ]);
    });

    test('root element values are not null', () => {
        test_validate(`{"speed": null,\n"distance_influence":   null\n, "priority": null}`, [
            `speed: must not be null, range: [10, 14]`,
            `distance_influence: must not be null, range: [40, 44]`,
            `priority: must not be null, range: [59, 63]`
        ]);
    });

    test('speed and priority are arrays', () => {
        test_validate(`{"speed"}`, [
            `speed: missing value, range: [1, 8]`
        ]);
        test_validate(`{"speed": }`, [
            `speed: missing value, range: [1, 8]`
        ]);
        test_validate(`{"speed": [], "priority": []}`, []);
        test_validate(`{"speed": "no_array"}`, [
            `speed: must be an array. given type: string, range: [10, 20]`
        ]);
        test_validate(`{"speed": {"abc": "def"}}`, [
            `speed: must be an array. given type: object, range: [10, 24]`
        ]);
        test_validate(`{"priority": {}}`, [
            `priority: must be an array. given type: object, range: [13, 15]`
        ]);
    });

    test('distance_influence is a number', () => {
        test_validate(`{"distance_influence":  null}`, [
            `distance_influence: must not be null, range: [24, 28]`
        ])
        test_validate(`{"distance_influence": []}`, [
            `distance_influence: must be a number. given type: array, range: [23, 25]`
        ]);
        test_validate(`{"distance_influence": "abc"}`, [
            `distance_influence: must be a number. given type: string, range: [23, 28]`
        ]);
        // this is not a valid number but the parser recognizes 3.4 correctly and adds a syntax
        // error for the invalid value abc
        test_validate(`{"distance_influence": 3.4abc}`, []);
        test_validate(`{"distance_influence": 86}`, []);
    });

    test('speed/priority statements keys are valid', () => {
        test_validate(`{"speed": ["abc"]}`, [
            `speed[0]: must be an object. given type: string, range: [11, 16]`
        ]);
        test_validate(`{"speed": \n[{"abc": "def"}]}`, [
            `speed[0]: possible keys: ['if', 'else_if', 'else', 'multiply_by', 'limit_to']. given: 'abc', range: [13, 18]`
        ]);
        test_validate(`{"speed": [{"multiply_by": "0.9", "ele": "bla"}]}`, [
            `speed[0]: possible keys: ['if', 'else_if', 'else', 'multiply_by', 'limit_to']. given: 'ele', range: [34, 39]`
        ]);
        test_validate(`{"priority": [{"if": "condition", "else": null, "multiply_by": "0.3"}]}`, [
            `priority[0]: too many keys. maximum: 2. given: else,if,multiply_by, range: [14, 69]`
        ]);
        test_validate(`{"priority": [{"if": "condition", "limit_to": "100"}, {"if": "condition", "else": "", "multiply_by": "0.3"}]}`, [
            `priority[1]: too many keys. maximum: 2. given: else,if,multiply_by, range: [54, 107]`
        ]);
        test_validate(`{"priority": [{"limit_to": "100", "multiply_by": "0.3"}]}`, [
            `priority[0]: every statement must have a clause ['if', 'else_if', 'else']. given: limit_to,multiply_by, range: [14, 55]`
        ]);
        test_validate(`{"priority": [{"if": "condition1", "else_if": "condition2"}]}`, [
            `priority[0]: every statement must have an operator ['multiply_by', 'limit_to']. given: if,else_if, range: [14, 59]`
        ]);
        test_validate(`{"priority": [{"if": "condition1", "limit_to": "100"}, {"if": "condition2"}]}`, [
            `priority[1]: every statement must have an operator ['multiply_by', 'limit_to']. given: if, range: [55, 75]`
        ]);
        test_validate(`{"speed": [ "if": "condition", "limit_to": "100" ]}`, [
            `speed[0]: must be an object. given type: string, range: [12, 16]`,
            `speed[1]: must be an object. given type: string, range: [31, 41]`,
        ]);
    });

    test('speed/priority statements conditions must be strings or booleans (or null or empty string for else)', () => {
        test_validate(`{"speed": [{"if": , "limit_to": "30"}]}`, [
            `speed[0][if]: missing value, range: [12, 16]`
        ]);
        test_validate(`{"speed": [{"if": "condition", "limit_to": }]}`, [
            `speed[0][limit_to]: missing value, range: [31, 41]`
        ]);
        test_validate(`{"speed": [{"if": "condition", "limit_to": "30"}, {"else": "condition", "multiply_by": "0.4"}]}`, [
            `speed[1][else]: must be an empty string. given: 'condition', range: [59, 70]`
        ]);
        test_validate(`{"speed": [{"if": "condition", "limit_to": "30"}, {"else": "   ", "multiply_by": "0.4"}]}`, [
            `speed[1][else]: must be an empty string. given: '   ', range: [59, 64]`
        ]);
        test_validate(`{"speed": [{"if": "condition", "limit_to": "30"}, {"else": null, "multiply_by": "0.4"}]}`, [
            `speed[1][else]: must be an empty string. given: 'null', range: [59, 63]`
        ]);
        test_validate(`{"speed": [{"if": "condition", "limit_to": "30"}, {"else": "", "multiply_by": "0.4"}]}`, [
        ]);
        test_validate(`{"priority": [{"if" : [], "multiply_by": "0.4"}]}`, [
            `priority[0][if]: must be a string. given type: array, range: [22, 24]`
        ])
        test_validate(`{"priority": [{"if" : {}, "multiply_by": "0.4"}]}`, [
            `priority[0][if]: must be a string. given type: object, range: [22, 24]`
        ])
        test_validate(`{"priority": [{"if" : 35, "multiply_by": "0.4.}]}`, [
            `priority[0][if]: must be a string. given type: number, range: [22, 24]`
        ])
        test_validate(`{"speed": [{"if": "condition", "multiply_by": "0.2"}, {"else_if": 3.4, "limit_to": "12"}]}`, [
            `speed[1][else_if]: must be a string. given type: number, range: [66, 69]`
        ]);
        test_validate(`{"speed": [{"limit_to": "100", "if": true}`, [
            `speed[0][if]: must be a string. given type: boolean, range: [37, 41]`
        ]);
        test_validate(`{"speed": [ "if":`, [
            `speed[0]: must be an object. given type: string, range: [12, 16]`
        ]);
        test_validate(`{"speed": [ "if": "if": `, [
            `speed[0]: must be an object. given type: string, range: [12, 16]`
        ]);
        test_validate(`{"speed": [{"if": tru, "multiply_by": "0.15"}]`, [
            `speed[0][if]: missing value, range: [12, 16]`
        ]);
        test_validate(`{"speed": [ {"if":  "abc", "limit_to": "100"    }]`, [
        ]);
    });

    test('get condition ranges', () => {
        const res = validateJson(`{"speed": [{"if": "cond1", "limit_to": "50"}, {"else_if": "cond2", "multiply_by": "0.3"}],
         "priority": [{"if": "cond3", "multiply_by": "0.3"}]}`);
        expect(res.errors).toStrictEqual([]);
        expect(res.conditionRanges).toStrictEqual([[18, 25], [58, 65], [120, 127]]);
    });

    test('speed/priority operator values must be strings', () => {
        test_validate(`{"speed": [{"if": "condition", "multiply_by": []}]}`, [
            `speed[0][multiply_by]: must be a string. given type: array, range: [46, 48]`
        ]);
        test_validate(`{"priority": [{"if": "condition", "multiply_by": {}}]}`, [
            `priority[0][multiply_by]: must be a string. given type: object, range: [49, 51]`
        ]);
        test_validate(`{"priority": [{"if": "condition", "multiply_by": 100}]}`, [
            `priority[0][multiply_by]: must be a string. given type: number, range: [49, 52]`
        ]);
        test_validate(`{"speed": [{"if": "condition", "limit_to": "abc"}]}`, []);
        test_validate(`{"speed": [{"if": "condition", "limit_to": "100"}]}`, []);
    });

    test('get operator value ranges', () => {
        const res = validateJson((`{"speed": [{"if": "cond1", "limit_to": "speed * 0.9"}, {"else_if": "cond2", "multiply_by": "0.3"}],
          "priority": [{"if": "cond3", "multiply_by": "curvature + 75"}]}`));
        expect(res.errors).toStrictEqual([]);
        expect(res.operatorValueRanges).toStrictEqual([[39, 52],[91, 96],[154, 170]]);
    })

    test('statements must follow certain order', () => {
        test_validate(`{"speed": [{"else": "", "limit_to": "60"}, {"if": "condition", "multiply_by": "0.9"}]}`, [
            `speed[0]: 'else' clause must be preceded by 'if' or 'else_if', range: [11, 41]`
        ]);
        test_validate(`{"priority": [{"else_if": "condition", "multiply_by": "0.3"}, {"else": "", "limit_to": "30"}]}`, [
            `priority[0]: 'else_if' clause must be preceded by 'if' or 'else_if', range: [14, 60]`
        ]);
        // multiple else_ifs are possible
        test_validate(`{"priority": [{"if": "abc", "limit_to": "60"}, {"else_if": "def", "multiply_by": "0.2"}, {"else_if": "condition", "limit_to": "100"}]}`, []);
    });

    test('areas is an object', () => {
        test_validate(`{"areas": []}`, [`areas: must be an object. given type: array, range: [10, 12]`]);
        test_validate(`{"areas": "not_an_object"}`, [`areas: must be an object. given type: string, range: [10, 25]`]);
    });

    test('areas: type and features', () => {
        test_validate(`{"areas": {}}`, [
            `areas: missing 'type'. given: [], range: [10, 12]`,
            `areas: missing 'features'. given: [], range: [10, 12]`
        ]);
        test_validate(`{"areas": {"typ": {}}}`, [`areas: possible keys: ['type', 'features']. given: 'typ', range: [11, 16]`]);
        test_validate(`{"areas": {"type": 123}}`, [`areas: missing 'features'. given: ['type'], range: [10, 23]`]);
        test_validate(`{"areas": {"type": 123, "features": {}`, [
            `areas[type]: must be "FeatureCollection". given type: number, range: [19, 22]`,
            `areas[features]: must be an array. given type: object, range: [36, 38]`
        ]);
        test_validate(`{"areas": {"type": "MyCollection", "features": []}}`, [
            `areas[type]: must be "FeatureCollection". given: "MyCollection", range: [19, 33]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection"}}`, [`areas: missing 'features'. given: ['type'], range: [10, 39]`]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": []}}`, []);
    })

    test('area keys', () => {
        test_validate(`{"areas": { "type": "FeatureCollection", "features": [{  "x": "y", "p": "q"}]}}`, [
            `areas[features][0]: possible keys: ['type', 'geometry', 'id', 'properties']. given: 'x', range: [57, 60]`,
            `areas[features][0]: possible keys: ['type', 'geometry', 'id', 'properties']. given: 'p', range: [67, 70]`
        ]);

        test_validate(`{"areas": { "type": "FeatureCollection", "features": [{  "type": "y", "id": "q" }]}}`, [
            `areas[features][0]: missing 'geometry'. given: ['type', 'id'], range: [54, 81]`
        ]);

        test_validate(`{"areas": { "type": "FeatureCollection", "features": [{ "geometry": {}, "id": "abc"}, { "type": "Feature", "geometry": {}}]}}`, [
            `areas[features][0]: missing 'type'. given: ['geometry', 'id'], range: [54, 84]`,
            `areas[features][1]: missing 'id'. given: ['type', 'geometry'], range: [86, 122]`,
        ]);
    });

    test('area values', () => {
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Future", "id": "abc", "geometry": }]}}`, [
            `areas[features][0][type]: must be "Feature". given: "Future", range: [63, 71]`,
            `areas[features][0][geometry]: missing value, range: [86, 96]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "id": "abc", "geometry": []}]}}`, [
            `areas[features][0][geometry]: must be an object. given type: array, range: [99, 101]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": {}, "properties": , "id": "abc"}]}}`, [
            `areas[features][0][geometry]: missing 'type'. given: [], range: [86, 88]`,
            `areas[features][0][geometry]: missing 'coordinates'. given: [], range: [86, 88]`,
            `areas[features][0][properties]: missing value, range: [90, 102]`
        ]);
        const validGeometry = `{"type": "Polygon", "coordinates": [[[1,1], [2,2], [3,3], [1,1]]]}`;
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "id": "area1", "geometry": ${validGeometry}, "properties": []}]}}`, [
            `areas[features][0][properties]: must be an object. given type: array, range: [183, 185]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": ${validGeometry}, "id": 123}]}}`, [
            `areas[features][0][id]: must be a string. given type: number, range: [160, 163]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": ${validGeometry}, "id": "xyz", properties: {"abc": "def"}}]}}`, [
        ]);
    });

    test('area geometry', () => {
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": {"type": "bla"}, "id": "abc" }]}}`, [
            `areas[features][0][geometry]: missing 'coordinates'. given: ['type'], range: [86, 101]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": {"teip": "bla"}, "id": "abc" }]}}`, [
            `areas[features][0][geometry]: possible keys: ['type', 'coordinates']. given: 'teip', range: [87, 93]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": {"coordinates": [[[1,1], [2,2], [3,3], [1,1]]]}, "id": "abc" }]}}`, [
            `areas[features][0][geometry]: missing 'type'. given: ['coordinates'], range: [86, 133]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": {"type": , "coordinates": [[[1,1], [2,2], [3,3], [1,1]]]}, "id": "abc" }]}}`, [
            `areas[features][0][geometry][type]: missing value, range: [87, 93]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": {"type": "bla", "coordinates": [[[1,1], [2,2], [3,3], [1,1]]]}, "id": "abc" }]}}`, [
            `areas[features][0][geometry][type]: must be "Polygon". given: 'bla', range: [95, 100]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": {"type": "Polygon", "coordinates": }, "id": "abc" }]}}`, [
            `areas[features][0][geometry][coordinates]: missing value, range: [106, 119]`
        ]);
        test_validate(`{"areas": {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": {"type": "Polygon", "coordinates": "abc"}, "id": "abc" }]}}`, [
            `areas[features][0][geometry][coordinates]: must be an array. given type: string, range: [121, 126]`
        ]);
    });

    test('area geometry coordinates list', () => {
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  []} }]}}`, [
            `areas[features][0][geometry][coordinates]: minimum length: 1, given: 0, range: [142, 144]`
        ]);
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  ["abc"]} }]}}`, [
            `areas[features][0][geometry][coordinates][0]: must be an array. given type: string, range: [143, 148]`
        ]);
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  [{}, "abc"]} }]}}`, [
            `areas[features][0][geometry][coordinates][0]: must be an array. given type: object, range: [143, 145]`,
            `areas[features][0][geometry][coordinates][1]: must be an array. given type: string, range: [147, 152]`
        ]);
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  [[]]} }]}}`, [
            `areas[features][0][geometry][coordinates][0]: minimum length: 4, given: 0, range: [143, 145]`
        ]);
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  [[], [], [], []]} }]}}`, [
            `areas[features][0][geometry][coordinates][0]: minimum length: 4, given: 0, range: [143, 145]`,
            `areas[features][0][geometry][coordinates][1]: minimum length: 4, given: 0, range: [147, 149]`,
            `areas[features][0][geometry][coordinates][2]: minimum length: 4, given: 0, range: [151, 153]`,
            `areas[features][0][geometry][coordinates][3]: minimum length: 4, given: 0, range: [155, 157]`
        ]);
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  [[[0, 0], [1, "p"], [2, 2], ["x", 0]]]} }]}}`, [
            `areas[features][0][geometry][coordinates][0][1][1]: must be a number, range: [156, 159]`,
            `areas[features][0][geometry][coordinates][0][3][0]: must be a number, range: [171, 174]`,
        ]);
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  [[[0, 0], [1, 1], [2, 2], [0, 0, "p"]]]} }]}}`, [
            `areas[features][0][geometry][coordinates][0][3]: maximum length: 2, given: 3, range: [168, 179]`
        ]);
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  [[[1, 2], [3, 4], [5, 6], [1.1, 2.2]]]} }]}}`, [
            `areas[features][0][geometry][coordinates][0]: the last point must be equal to the first, range: [168, 178]`
        ]);
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  [[[100, 200], [300, 40], [5, 6], [1.1, 2.2]]]} }]}}`, [
            `areas[features][0][geometry][coordinates][0][0][1]: latitude must be in [-90, +90], range: [150, 153]`,
            `areas[features][0][geometry][coordinates][0][1][0]: longitude must be in [-180, +180], range: [157, 160]`
        ]);
        test_validate(`{"areas":  {"type": "FeatureCollection", "features": [  { "type": "Feature", "id": "abc" , "geometry":  {"type":  "Polygon" , "coordinates":  [[[1, 2], [3, 4], [5, 6], [1, 2]]]} }]}}`, []);
    });

    test('area ids must be strings of certain kind', () => {
        const validGeometry = `{"type": "Polygon", "coordinates": [[[1,1], [2,2], [3,3], [1,1]]]}`;
        test_validate(`{"areas": { "type": "FeatureCollection", "features": [{"type": "Feature", "geometry": ${validGeometry}, "id": "   "}] }}`,
            [`areas[features][0][id]: area ids may only contain a-z, A-Z, digits and _. given: '   ', range: [160, 165]`]);
        test_validate(`{"areas": { "type": "FeatureCollection", "features": [{"type": "Feature", "geometry": ${validGeometry}, "id": " abc  "}] }}`,
            [`areas[features][0][id]: area ids may only contain a-z, A-Z, digits and _. given: ' abc  ', range: [160, 168]`]);
        test_validate(`{"areas": { "type": "FeatureCollection", "features": [{"type": "Feature", "geometry": ${validGeometry}, "id": "a bc"}] }}`,
            [`areas[features][0][id]: area ids may only contain a-z, A-Z, digits and _. given: 'a bc', range: [160, 166]`]);
        test_validate(`{"areas": { "type": "FeatureCollection", "features": [{"type": "Feature", "geometry": ${validGeometry}, "id": "_abc"}] }}`,
            [`areas[features][0][id]: area ids may only contain a-z, A-Z, digits and _. given: '_abc', range: [160, 166]`]);
        test_validate(`{"areas": { "type": "FeatureCollection", "features": [{"type": "Feature", "geometry": ${validGeometry}, "id": "9aBc"}] }}`,
            // something like 9abc is ok as we use it like `in_9aBc` in the statements
            []);
    });

    test(`area ids must be unique`, () => {
        const validGeometry = `{"type": "Polygon", "coordinates": [[[1,1], [2,2], [3,3], [1,1]]]}`;
        test_validate(`{"areas": { "type": "FeatureCollection", "features": [
          {"type": "Feature", "geometry": ${validGeometry}, "id": "area1"},
          {"type": "Feature", "geometry": ${validGeometry}, "id": "area2"},
          {"type": "Feature", "geometry": ${validGeometry}, "id": "area1"}
        ] }}`, [
            `areas[features][2][id]: area ids must be unique. duplicate: 'area1', range: [423, 430]`
        ]);
    });

    test(`area ids get returned correctly`, () => {
        const validGeometry = `{"type": "Polygon", "coordinates": [[[1,1], [2,2], [3,3], [1,1]]]}`;
        expectAreaNames(`{"areas": { "type": "FeatureCollection", "features": [
          {"type": "Feature", "geometry": ${validGeometry}, "id": "area1"},
          {"type": "Feature", "geometry": ${validGeometry}, "id": "area2"}
         ] ] }}`, ['area1', 'area2']);
        expectAreaNames(`{"areas": { "type": "FeatureCollection", "features": [
          {"type": "Feature", "geometry": ${validGeometry}, "id": "x2"},
          {"type": "Feature", "geometry": ${validGeometry}, "id": "p_qr"},
          {"type": "Feature", "geometry": ${validGeometry}, "id": "rst6"}
         ] }}`, ['x2', 'p_qr', 'rst6']);
    });

    function expectAreaNames(doc, areas) {
        try {
            const res = validateJson(doc);
            expect(res.areas).toStrictEqual(areas);
        } catch (e) {
            Error.captureStackTrace(e, expectAreaNames);
            throw e;
        }
    }

    test(`includes parser errors`, () => {
        // these errors depend on the underlying third party parser and not our primary
        // output. we keep around a few tests, but the most important part is that they are
        // actually added to our output.
        test_validate_parser_error(`{"speed"}`, [
           `syntax: ColonExpected, range: [8, 9]`
        ]);
        test_validate_parser_error(`{   :  []}`, [
            `syntax: PropertyNameExpected, range: [4, 5]`,
            `syntax: ValueExpected, range: [9, 10]`
        ]);
        test_validate_parser_error(`{}[]`, [
            `syntax: EndOfFileExpected, range: [2, 3]`,
        ]);
        test_validate_parser_error(`{"speed: []}`, [
            `syntax: UnexpectedEndOfString, range: [1, 12]`,
            `syntax: ColonExpected, range: [12, 13]`,
            `syntax: CloseBraceExpected, range: [12, 13]`,
        ]);
        test_validate_parser_error(`{"speed": []`, [
            `syntax: CloseBraceExpected, range: [12, 13]`
        ]);
        test_validate_parser_error(`"speed": []`, [
            `syntax: EndOfFileExpected, range: [7, 8]`
        ]);
        test_validate_parser_error(`- "abc"\n- "def"\n- "ghi"`, [
            `syntax: InvalidSymbol, range: [0, 1]`,
            `syntax: InvalidSymbol, range: [8, 9]`,
            `syntax: EndOfFileExpected, range: [10, 15]`,
        ]);
        test_validate_parser_error(`   :  `, [
            `syntax: ValueExpected, range: [3, 4]`
        ]);
        test_validate_parser_error(`{[]: "abc"}`, [
            `syntax: PropertyNameExpected, range: [1, 2]`,
            `syntax: ValueExpected, range: [10, 11]`
        ]);
        test_validate_parser_error(`{{}: "abc"}`, [
            `syntax: PropertyNameExpected, range: [1, 2]`,
            `syntax: ValueExpected, range: [2, 3]`,
            `syntax: EndOfFileExpected, range: [3, 4]`
        ]);
        test_validate_parser_error(`{null: []}`, [
            `syntax: PropertyNameExpected, range: [1, 5]`,
            `syntax: ValueExpected, range: [9, 10]`
        ])
    })
});

function test_validate(doc, errors) {
    const res = validateJson(doc);
    const errorStrings = res.errors.map(e => `${e.path}: ${e.message}, range: [${e.range.join(', ')}]`);
    // console.log(res.jsonErrors);
    try {
        expect(errorStrings).toStrictEqual(errors);
    } catch (e) {
        Error.captureStackTrace(e, test_validate);
        throw e;
    }
}

function test_validate_parser_error(doc, errors) {
    const res = validateJson(doc);
    const errorStrings = res.jsonErrors.map(e => `${e.path}: ${e.message}, range: [${e.range.join(', ')}]`);
    try {
        expect(errorStrings).toStrictEqual(errors);
    } catch (e) {
        Error.captureStackTrace(e, test_validate_parser_error);
        throw e;
    }
}
