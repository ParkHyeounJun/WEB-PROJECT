const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const http = require('http');

var socket = require('./routes/socket.js');

const app = express();
const server = http.createServer(app);

// JSON 파싱 미들웨어
app.use(express.json());

// MySQL 연결 설정
const connection = mysql.createConnection({
  host: 'localhost',
  user: '202201482user',
  password: '202201482pw',
  database: 'chatdb'
});

connection.connect(err => {
  if (err) {
    console.error('MySQL 연결 오류: ', err);
    return;
  }
  console.log('MySQL에 성공적으로 연결되었습니다.');
});

// 사용자 등록 라우트
router.post('/signup', (req, res) => {
  const { id, pw } = req.body;

  if (!id || !pw) {
    return res.status(400).send('모든 필드를 입력하세요.');
  }

  const query = 'INSERT INTO Login (id, pw) VALUES (?, ?)';
  connection.query(query, [id, pw], (err, result) => {
    if (err) {
      return res.status(500).send('사용자 등록 오류: ' + err.message);
    }
    res.status(201).send('사용자가 성공적으로 등록되었습니다.');
  });
});

// 사용자 로그인 라우트
router.post('/login', (req, res) => {
  const { id, pw } = req.body;

  const query = 'SELECT * FROM Login WHERE id = ? AND pw = ?';
  connection.query(query, [id, pw], (err, results) => {
    if (err) {
      return res.status(500).send('로그인 오류: ' + err.message);
    }
    if (results.length > 0) {
      res.status(200).send('로그인 성공');
    } else {
      res.status(401).send('잘못된 아이디 또는 비밀번호입니다.');
    }
  });
});

// 채팅방 생성 라우트
router.post('/chatroom', (req, res) => {
  const { name } = req.body;

  const query = 'INSERT INTO chatroom (name) VALUES (?)';
  connection.query(query, [name], (err, result) => {
    if (err) {
      return res.status(500).send('채팅방 생성 오류: ' + err.message);
    }
    res.status(201).send('채팅방이 성공적으로 생성되었습니다.');
  });
});

// 메시지 저장 라우트
router.post('/chatting', (req, res) => {
  const { name, id, message } = req.body;

  const query = 'INSERT INTO chatting (name, id, message) VALUES (?, ?, ?)';
  connection.query(query, [name, id, message], (err, result) => {
    if (err) {
      return res.status(500).send('메시지 저장 오류: ' + err.message);
    }
    res.status(201).send('메시지가 성공적으로 저장되었습니다.');
  });
});

// 채팅방 내역 검색 라우트
router.get('/chatting', (req, res) => {
  const { name } = req.query;

  const query = 'SELECT * FROM chatting WHERE name = ?';
  connection.query(query, [name], (err, results) => {
    if (err) {
      return res.status(500).send('채팅방 검색 오류: ' + err.message);
    }
    if (results.length > 0) {
      res.status(200).json(results);
    } else {
      res.status(404).send('채팅방을 찾을 수 없습니다.');
    }
  });
});

// 채팅방 검색 라우트
router.get('/chatroom', (req, res) => {
  const { name } = req.query;

  const query = 'SELECT * FROM chatroom WHERE name = ?';
  connection.query(query, [name], (err, results) => {
    if (err) {
      return res.status(500).send('채팅방 검색 오류: ' + err.message);
    }
    if (results.length > 0) {
      res.status(200).json(results[0]);
    } else {
      res.status(404).send('채팅방을 찾을 수 없습니다.');
    }
  });
});

app.use('/api', router);

app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.set('port', 3000);

if (process.env.NODE_ENV === 'development') {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}

// Socket.io 통신
const io = require('socket.io').listen(server);
io.sockets.on('connection', socket);

// 서버 시작
server.listen(app.get('port'), function () {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;
