# [Swyzzle](https://brainsandspace.github.io/Swyzzle) [![Build Status](https://travis-ci.org/brainsandspace/Swyzzle.svg?branch=master)](https://travis-ci.org/brainsandspace/Swyzzle)

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/brainsandspace/Swyzzle.git
# Go into the repository
cd Swyzzle/src
# Install dependencies
npm install
# Run the app
npm start
```

This app was made with Electron. To learn more about Electron and its API in the [documentation](http://electron.atom.io/docs/latest).

## Packaging
Run `electron-packager . --overwrite` _assuming you are on a Mac_. For more information about packaging see the [electron-packager documentation](https://github.com/electron-userland/electron-packager)

# TODO
- [ ] Create advanced button and section in preferences that allows you to write your own shaders (that can use a predetermined list of uniforms and attributes, like in ShaderToy)
- [ ] Allow user to save and manage aforementioned custom shaders
- [ ] Tray icon and remove dock icon
- [ ] In settings, ability to define keys/clicks/other triggers to escape idle mode
- [x] Separate active mode
- [ ] Ability to open Swyzzle on login

#### License [MIT](LICENSE.md)

