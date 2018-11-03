const path = require('path');
const express = require('express');
const app = express();
const port = 4444;

// app.get('/', (req, res) => res.send('Hello World!'))
// app.use(express.static('dos'))
app.use(express.static('packages'));

app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'docs/index.html')),
);

app.get('/SwyzzleLogo2.png', (req, res) =>
  res.sendFile(path.join(__dirname, 'docs/SwyzzleLogo2.png')),
);
app.get('/page.mjs', (req, res) =>
  res.sendFile(path.join(__dirname, 'docs/page.mjs')),
);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
