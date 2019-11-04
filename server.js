//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan'),
    path    = require('path');

Object.assign=require('object-assign')

//app.engine('html', require('ejs').renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];

  // If using env vars from secret from service binding
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split("//");
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(":");
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

var board = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
var turn = 0;

app.get('/', (req, res) => {
  res.render('index', {board});
});

// Functions for checking winner
function checkWinning(char, a, b, c, d, e) {
  if (board[a] == char && board[b] == char && board[c] == char && board[d] == char && board[e] == char) {
    return true;
  } return false;
};

function checkAll(char) {
  if (checkWinning(char, 0, 1, 2, 3, 4) == true) {
    return 1;
  } else if (checkWinning(char, 0, 5, 10, 15, 20) == true) {
    return 1;
  } else if (checkWinning(char, 0, 6, 12, 18, 24) == true) {
    return 1;
  } else if (checkWinning(char, 1, 6, 11, 16, 21) == true) {
    return 1;
  } else if (checkWinning(char, 2, 7, 12, 17, 22) == true) {
    return 1;
  } else if (checkWinning(char, 3, 8, 13, 18, 23) == true) {
    return 1;
  } else if (checkWinning(char, 4, 9, 14, 19, 24) == true) {
    return 1;
  } else if (checkWinning(char, 4, 8, 12, 16, 20) == true) {
    return 1;
  } else if (checkWinning(char, 5, 6, 7, 8, 9) == true) {
    return 1;
  } else if (checkWinning(char, 10, 11, 12, 13, 14) == true) {
    return 1;
  } else if (checkWinning(char, 15, 16, 17, 18, 19) == true) {
    return 1;
  } else if (checkWinning(char, 20, 21, 22, 23, 24) == true) {
    return 1;
  } else {
    return 0;
  }
};

app.get('/clicks/:id', (req, res) => {
  //res.send('Hello world');
  var spot = req.params.id;
  if (board[spot] != '') {
    console.log('Board was not updated')
  } else {
    if (turn == 0) {
      board[spot] = 'x';
      turn = 1;
      if (checkAll('x') == true) {
        console.log('Player 1 has won!');
      };
    } else if (turn == 1) {
      board[spot] = 'o';
      turn = 0;
      if (checkAll('o') == true) {
        console.log('Player 2 has won!');
      };
    } res.redirect('/');
    console.log('Board was updated');
  }
});

app.get('/restart', (req, res) => {
  for (var i = 0; i < 25; i++) {
    board[i] = '';
  } turn = 0;
  res.redirect('/');
});

/*app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});*/

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
