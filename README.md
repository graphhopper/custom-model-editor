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