# usage

```shell
npm install @graphhopper/custom-model-editor
```

```js
import {create} from '@graphhopper/custom-model-editor';
// the editor needs codemirror's css (codemirror is installed as a dependency)
import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/lint/lint.css';

// the categories are the encoded values, see demo/index.html for the format
const editor = create(categories, element => document.body.appendChild(element));

// optional: the parameters of the current profile as returned by GraphHopper's /info endpoint, e.g.
// {vehicle_height: {value: 4, min: 0}, avoid_toll: {value: false}}. this enables validation and completion of the
// 'parameters' section. use {} for a profile without parameters.
editor.parameters = profile.parameters || {};
```

# development

```shell
# initially do
npm install
# update dist/index.js (used by the demo) whenever a file changes
npm run watch
# -> open demo/index.html or start live server etc.

# ... or keep running the tests while developing
npm run test-watch
```

# publishing

```shell
npm login
npm version patch   # or minor/major, creates a commit and tag
npm publish         # runs tests and the production build first, see prepublishOnly
git push --follow-tags
```