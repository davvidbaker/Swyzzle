# [Swyzzle](https://davvidbaker.github.io/Swyzzle)

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/davvidbaker/Swyzzle.git
# Go into the repository
cd Swyzzle/src
# Install dependencies
npm install
# Run the app
npm start
```

This app was made with Electron. To learn more about Electron and its API in the [documentation](http://electron.atom.io/docs/latest).

## Packaging
- Run `npm run buildMac` _assuming you are on a Mac_. The full command is in the package.json. For more information about packaging see the [electron-packager documentation](https://github.com/electron-userland/electron-packager)
- Go in and change capitalize swizzle in the package contents. There's probably a much better way to do this, but since I couldn't name the module with a capital first letter, this is what I've done.


# TODO
- [ ] Create advanced button and section in preferences that allows you to write your own shaders (that can use a predetermined list of uniforms and attributes, like in ShaderToy)
- [ ] Allow user tso save and manage aforementioned custom shaders
- [ ] Tray icon and remove dock icon
- [x] In settings, ability to define keys/clicks/other triggers to escape idle mode
- [x] Separate active mode
- [ ] Ability to open Swyzzle on login

#### License [MIT](LICENSE.md)
