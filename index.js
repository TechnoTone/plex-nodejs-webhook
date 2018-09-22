var express = require('express');
var multer = require('multer');
var moment = require('moment');

var app = express();
var upload = multer({
  storage: multer.memoryStorage()
});

var low = require('lowdb');
var FileSync = require('lowdb/adapters/FileSync');
var adapter = new FileSync('db.json');
var db = low(adapter);

//prepare database if empty
var state = db.getState();
if (state && state.logs == undefined) {
  db.setState({
    logs: []
  }).write();
}

var logs = db.get('logs');

app.post('/plexwebhook', upload.single('thumb'), function (req, res) {
  var payload = JSON.parse(req.body.payload);
  payload.timestamp = new Date();

  var md = payload.Metadata;
  for (var prop in md) {
    if (Array.isArray(md[prop])) {
      delete md[prop];
    }
  }

  logs.push(payload).write();

  res.sendStatus(200);
});

app.get('/logs', function (req, res) {
  res.send(logs.value().map(forOutput));
});

var port = process.env.port | 10000;
app.listen(port);

function forOutput(log) {
  var md = log.Metadata;
  var ts = moment(log.timestamp);
  var timestamp = ts.fromNow() + " (" + ts.toLocaleString() + ")";

  if (md.type === 'movie')
    return {
      User: log.Account.title,
      Player: log.Player.title,
      Event: log.event,
      LibrarySection: md.librarySectionTitle,
      Title: md.title,
      Timestamp: timestamp
    };
  if (md.type === 'episode')
    return {
      User: log.Account.title,
      Player: log.Player.title,
      Event: log.event,
      LibrarySection: md.librarySectionTitle,
      Title: md.grandparentTitle + " (" + md.parentIndex + "x" + md.index + ") " + md.title,
      Timestamp: timestamp
    };
}

console.log("Listening on port " + port);