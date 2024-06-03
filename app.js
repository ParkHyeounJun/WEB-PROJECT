const express = require('express');
const mysql = require('mysql');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 라우터 설정
const router = express.Router();

// JSON 파싱 미들웨어
app.use(express.json());
app.use('/api', router);

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

// 채팅방 내역 검색 라우트
router.get('/chatting', (req, res) => {
  const { name } = req.query;

  const query = 'SELECT * FROM chatting WHERE name = ? ORDER BY timestamp';
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

// 사용자 채팅방 목록 조회 라우트
router.get('/user/chatrooms', (req, res) => {
  const { id } = req.query;

  const query = 'SELECT DISTINCT name FROM chatting WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).send('채팅방 목록 조회 오류: ' + err.message);
    }
    res.status(200).json(results);
  });
});

// 정적 파일 제공
app.use(express.static(__dirname + '/public'));

// View 설정
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// 포트 설정
app.set('port', process.env.PORT || 3000);

// Socket.io 통신
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join:room', (room) => {
    socket.join(room);
    console.log(`Client joined room: ${room}`);
  });

  socket.on('leave:room', (room) => {
    socket.leave(room);
    console.log(`Client left room: ${room}`);
  });

    socket.on('send:message', (message) => {
      const query = 'INSERT INTO chatting (name, id, message) VALUES (?, ?, ?)';
      connection.query(query, [message.name, message.id, message.message], (err, result) => {
        if (err) {
          console.error('메시지 저장 오류: ', err.message);
          return;
        }
        io.to(message.name).emit('send:message', message);
        console.log(`Message sent to room ${message.name}: ${message.message}`);
      });
    });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// 서버 시작
server.listen(app.get('port'), function () {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;
