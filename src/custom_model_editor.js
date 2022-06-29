import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/lint/lint";
import {validateJson} from "./validate_json";
import {completeCondition, completeOperatorValue} from "./complete.js";
import {parse as parseCondition} from "./parse_condition.js";
import {parse as parseOperatorValue} from "./parse_operator_value.js";
import {completeJson} from "./complete_json";


class CustomModelEditor {
    // The underlying code mirror object, use at your own risk. For bigger changes it is probably better to implement here
    cm;
    _categories = {};
    _numericCategories = [];
    _validListener;

    /**
     * Creates a custom model editor for the given categories and calls the given callback with the editor element
     * as argument.
     */
    constructor(categories, callback) {
        this.categories = categories;

        this.cm = CodeMirror(callback, {
            lineNumbers: false,
            matchBrackets: true,
            autoCloseBrackets: true,
            mode: {
                name: "javascript",
                json: true,
            },
            extraKeys: {
                'Ctrl-Space': this.showAutoCompleteSuggestions,
                'Alt-Enter': this.showAutoCompleteSuggestions
            },
            lint: {
                getAnnotations: this.getAnnotations
            },
            gutters: []
        });

        this.cm.on("cursorActivity", (e) => {
            // we update the auto complete window to allows filtering values while typing with an open popup)
            const open = this.cm.state.completionActive;
            this.cm.closeHint();
            if (open)
                this.showAutoCompleteSuggestions();
        });
    }

    set categories(categories) {
        this._categories = categories;
        if (Object.keys(categories).length === 0)
            console.warn('Empty list of categories provided to Custom Model Editor');
        this._numericCategories = [];
        Object.entries(this._categories).forEach(([k, v]) => {
            if (v.type === 'numeric') {
                this._numericCategories.push(k);
            }
        });
    }

    set value(value) {
        this.cm.setValue(value);
    }

    get value() {
        return this.cm.getValue();
    }

    get jsonObj() {
        try {
            return JSON.parse(this.cm.getValue());
        } catch (e) {
            throw 'invalid json: ' + this.cm.getValue() + 'error: ' + e;
        }
    }

    getUsedCategories = () => {
        const currentErrors = this.getCurrentErrors(this.cm.getValue(), this.cm);
        if (currentErrors.errors.length !== 0)
            console.warn('invalid custom model', currentErrors.errors);
        return currentErrors.usedCategories;
    }

    setExtraKey = (keyString, callback) => {
        (this.cm.getOption('extraKeys'))[keyString] = callback;
    }

    set validListener(validListener) {
        this._validListener = validListener;
    }

    getAnnotations = (text, options, editor) => {
        const errors = this.getCurrentErrors(text, editor).errors;
        if (this._validListener)
            this._validListener(errors.length === 0);
        return errors;
    }
    /**
     * Builds a list of errors for the current text such that they can be visualized in the editor.
     */
    getCurrentErrors = (text, editor) => {
        const validateResult = validateJson(text);
        const errors = validateResult.errors.map((err, i) => {
            return {
                message: err.path + ': ' + err.message,
                severity: 'error',
                from: editor.posFromIndex(err.range[0]),
                to: editor.posFromIndex(err.range[1])
            }
        });

        const areas = validateResult.areas;
        const usedCategories = new Set();
        const conditionRanges = validateResult.conditionRanges;
        conditionRanges.forEach((cr, i) => {
            const condition = text.substring(cr[0], cr[1]);
            // this is a bit redundant, because we already make sure that the condition must be a string ("abc") in validateJson
            if (condition.length < 3 || condition[0] !== `"` || condition[condition.length - 1] !== `"`) {
                errors.push({
                    message: `must be a non-empty string with double quotes, e.g. "true". given: ${condition}`,
                    severity: 'error',
                    from: editor.posFromIndex(cr[0]),
                    to: editor.posFromIndex(cr[1]),
                });
                return;
            }
            const parseRes = parseCondition(condition.substring(1, condition.length - 1), this._categories, areas);
            if (parseRes.error !== null) {
                errors.push({
                    message: parseRes.error,
                    severity: 'error',
                    from: editor.posFromIndex(cr[0] + parseRes.range[0] + 1),
                    to: editor.posFromIndex(cr[0] + parseRes.range[1] + 1)
                });
            }
            Object.keys(this._categories).filter(c => parseRes.tokens.includes(c)).forEach(c => usedCategories.add(c));
        });

        const operatorValueRanges = validateResult.operatorValueRanges;
        operatorValueRanges.forEach((oer, i) => {
            const operatorValue = text.substring(oer[0], oer[1]);
            // this is a bit redundant, because we already make sure that the operator value must be a string ("abc") in validateJson
            if (operatorValue.length < 3 || operatorValue[0] !== `"` || operatorValue[operatorValue.length - 1] !== `"`) {
                errors.push({
                    message: `must be a non-empty string with double quotes, e.g. "100". given: ${operatorValue}`,
                    severity: 'error',
                    from: editor.posFromIndex(oer[0]),
                    to: editor.posFromIndex(oer[1]),
                });
                return;
            }
            const parseRes = parseOperatorValue(operatorValue.substring(1, operatorValue.length - 1), this._numericCategories);
            if (parseRes.error !== null) {
                errors.push({
                    message: parseRes.error,
                    severity: 'error',
                    from: editor.posFromIndex(oer[0] + parseRes.range[0] + 1),
                    to: editor.posFromIndex(oer[0] + parseRes.range[1] + 1)
                });
            }
            this._numericCategories.filter(c => parseRes.tokens.includes(c)).forEach(c => usedCategories.add(c));
        });

        // if there are no errors we consider the jsonErrors next (but most of them should be fixed at this point),
        // catching the errors manually before we get here can be better, because this way we can provide better error
        // messages and ranges and in some cases the user experience is better if we first show the more specific
        // 'schema' errors and only later syntax errors like unclosed brackets etc.
        if (errors.length === 0) {
            validateResult.jsonErrors.forEach(err => {
                errors.push({
                    message: err.path + ': ' + err.message,
                    severity: 'error',
                    from: editor.posFromIndex(err.range[0]),
                    to: editor.posFromIndex(err.range[1])
                });
            });
        }
        return {
            errors,
            usedCategories: Array.from(usedCategories)
        };
    }

    showAutoCompleteSuggestions = () => {
        const validateResult = validateJson(this.cm.getValue());
        const cursor = this.cm.indexFromPos(this.cm.getCursor());
        const completeRes = completeJson(this.cm.getValue(), cursor);
        if (completeRes.suggestions.length > 0) {
            if (completeRes.suggestions.length === 1 && completeRes.suggestions[0] === `__hint__type a condition`) {
                this._completeExpression(completeRes, cursor, (expression, pos) => completeCondition(expression, pos, this._categories, validateResult.areas));
            } else if (completeRes.suggestions.length === 1 && completeRes.suggestions[0] === `__hint__type an expression`) {
                this._completeExpression(completeRes, cursor, (expression, pos) => completeOperatorValue(expression, pos, this._numericCategories));
            } else {
                // limit the replacement range to the current line and do not include the new line character at the
                // end of the line. otherwise auto-complete messes up the following lines.
                const currLineStart = this.cm.indexFromPos({line: this.cm.getCursor().line, ch: 0});
                const currLineEnd = this.cm.indexFromPos({line: this.cm.getCursor().line + 1, ch: 0});
                const start = Math.max(currLineStart, completeRes.range[0]);
                let stop = Math.min(currLineEnd, completeRes.range[1]);
                if (stop > start && /\r\n|\r|\n/g.test(this.cm.getValue()[stop - 1]))
                    stop--;
                const range = [
                    this.cm.posFromIndex(start),
                    this.cm.posFromIndex(stop)
                ];
                this._suggest(range, completeRes.suggestions);
            }
        }
    }

    _completeExpression = (completeRes, cursor, completeExpression) => {
        let start = completeRes.range[0];
        let stop = completeRes.range[1];
        if (this.cm.getValue()[start] === `"`) start++;
        if (this.cm.getValue()[stop - 1] === `"`) stop--;
        const expression = this.cm.getValue().substring(start, stop);
        const completeExpressionRes = completeExpression(expression, cursor - start);
        if (completeExpressionRes.suggestions.length > 0) {
            const range = [
                this.cm.posFromIndex(completeExpressionRes.range[0] + start),
                this.cm.posFromIndex(completeExpressionRes.range[1] + start)
            ];
            this._suggest(range, completeExpressionRes.suggestions.sort());
        }
    }

    _suggest = (range, suggestions) => {
        const options = {
            hint: function () {
                const completion = {
                    from: range[0],
                    to: range[1],
                    list: suggestions.map(s => {
                        // hints are shown to the user, but no auto-completion is actually performed
                        if (startsWith(s, '__hint__')) {
                            return {
                                text: '',
                                displayText: s.substring('__hint__'.length)
                            }
                        } else {
                            return {
                                text: s
                            }
                        }
                    }),
                };
                CodeMirror.on(completion, "pick", function (selectedItem) {
                    // console.log(selectedItem);
                });
                return completion;
            },
            completeSingle: false
        };
        this.cm.showHint(options);
    }
}

function startsWith(str, substr) {
    return str.substr(0, substr.length) === substr;
}

export {CustomModelEditor}