# usage

```js
import {create} from 'custom-model-editor/src/index';

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
# update build whenever a file changes
npm run watch
# -> open demo/index.html or start live server etc.

# ... or keep running the tests while developing
npm run test-watch

# before you commit build the distribution as well (at least as long as we keep the distribution in VCS)
npm run build
```