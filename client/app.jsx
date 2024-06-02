'use strict';

var React = require('react');
var io = require('socket.io-client');
var socket = io.connect();

var Message = React.createClass({
    render() {
        const { user, text, timestamp, currentUser } = this.props;
        const messageClass = user === currentUser ? 'message-right' : 'message-left';

        return (
            <div className={`message ${messageClass}`}>
                <strong>{user} :</strong> <span>{text}</span>
                <span className="timestamp">{new Date(timestamp).toLocaleString()}</span>
            </div>
        );
    }
});

var MessageList = React.createClass({
    render() {
        const currentUser = this.props.currentUser;
        return (
            <div className='messages'>
                {this.props.messages.map((message, i) => (
                    <Message
                        key={i}
                        user={message.id}
                        text={message.message}
                        timestamp={message.timestamp}
                        currentUser={currentUser}
                    />
                ))}
            </div>
        );
    }
});

var MessageForm = React.createClass({
    getInitialState() {
        return { text: '' };
    },

    handleSubmit(e) {
        e.preventDefault();
        var message = {
            name: this.props.currentRoom,
            id: this.props.user,
            message: this.state.text,
            timestamp: new Date().toISOString() // 현재 시간을 타임스탬프로 추가
        };
        socket.emit('send:message', message); // 서버에 메시지 전송
        this.setState({ text: '' });
    },

    changeHandler(e) {
        this.setState({ text: e.target.value });
    },

    render() {
        return (
            <div className='message-form'>
                <form onSubmit={this.handleSubmit}>
                    <input
                        placeholder='메시지 입력'
                        className='textinput'
                        onChange={this.changeHandler}
                        value={this.state.text}
                    />
                    <button className='sendButton' type="submit">Send</button>
                </form>
            </div>
        );
    }
});

var ChatApp = React.createClass({
    getInitialState() {
        return {
            users: [],
            messages: [],
            text: '',
            searchQuery: '',
            showCreateDialog: false,
            showJoinDialog: false,
            currentRoom: null,
            user: this.props.user,
            chatRooms: [], // 새로운 state 추가
            showChatRooms: false // 채팅방 목록 표시 여부 state 추가
        };
    },

    componentDidMount() {
        socket.on('init', this._initialize);
        socket.on('send:message', this.handleMessageSubmit);
        socket.on('user:join', this._userJoined);
        socket.on('user:left', this._userLeft);
        socket.on('change:name', this._userChangedName);
    },

    handleMessageSubmit(message) {
        var { messages } = this.state;
        messages.push(message);
        this.setState({ messages });
    },

    handleChangeName(newName) {
        var oldName = this.state.user;
        socket.emit('change:name', { name: newName }, (result) => {
            if (!result) {
                return alert('There was an error changing your name');
            }
            var { users } = this.state;
            var index = users.indexOf(oldName);
            users.splice(index, 1, newName);
            this.setState({ users, user: newName });
        });
    },

    handleSearchChange(e) {
        this.setState({ searchQuery: e.target.value });
    },

    handleSearchSubmit(e) {
        e.preventDefault();
        const { searchQuery, currentRoom } = this.state;
    
        if (searchQuery.trim() === "") {
            alert("채팅방 이름을 입력하세요.");
            return;
        }
    
        if (currentRoom) {
            socket.emit('leave:room', currentRoom);
            this.setState({ messages: [] });
        }
    
        fetch(`/api/chatroom?name=${searchQuery}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    this.setState({ showCreateDialog: true });
                    throw new Error('채팅방을 찾을 수 없습니다.');
                }
            })
            .then(data => {
                this.setState({ showJoinDialog: true, currentRoom: data.name, showChatRooms: false });
            })
            .catch(error => {
                console.error('채팅방 검색 중 오류가 발생했습니다:', error);
            });
    },
    

    handleJoinRoom(confirm) {
        if (confirm) {
            const { currentRoom } = this.state;

            fetch(`/api/chatting?name=${currentRoom}`)
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    } else if (response.status === 404) {
                        return [];
                    } else {
                        throw new Error('채팅방 검색 중 오류가 발생했습니다.');
                    }
                })
                .then(messages => {
                    this.setState({ messages, showJoinDialog: false });
                    socket.emit('join:room', currentRoom);
                })
                .catch(error => {
                    console.error('채팅방 검색 중 오류가 발생했습니다:', error);
                });
        } else {
            this.setState({ showJoinDialog: false, currentRoom: null });
        }
    },

    handleCreateRoom(confirm) {
        if (confirm) {
            const { searchQuery } = this.state;

            fetch('/api/chatroom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: searchQuery })
            }).then(response => {
                if (response.ok) {
                    this.setState({ currentRoom: searchQuery, messages: [], showChatRooms: false });
                    socket.emit('join:room', searchQuery);
                } else {
                    throw new Error('채팅방 생성 오류');
                }
            }).catch(error => {
                console.error('채팅방 생성 중 오류가 발생했습니다:', error);
            });
        }
        this.setState({ showCreateDialog: false });
    },

    handleLeaveRoom() {
        const { currentRoom } = this.state;
        this.setState({ currentRoom: null, messages: [] });
        socket.emit('leave:room', currentRoom);
    },

    handleIconClick() {
        const { user } = this.state;
    
        this.setState({ currentRoom: null, messages: [] }, () => { // 기존 채팅방 없애기
            fetch(`/api/user/chatrooms?id=${user}`)
                .then(response => response.json())
                .then(data => {
                    this.setState({ chatRooms: data, showChatRooms: true });
                })
                .catch(error => {
                    console.error('채팅방 목록 조회 중 오류가 발생했습니다:', error);
                });
        });
    },

    handleRoomClick(roomName) {
        this.setState({ currentRoom: roomName, showChatRooms: false }, () => {
            socket.emit('join:room', roomName);
            fetch(`/api/chatting?name=${roomName}`)
                .then(response => response.json())
                .then(data => {
                    this.setState({ messages: data });
                })
                .catch(error => {
                    console.error('채팅방 메시지 로드 중 오류가 발생했습니다:', error);
                });
        });
    },    

    renderCreateRoomDialog() {
        return (
            <div className="dialog">
                <p>방이 존재하지 않습니다. 방을 개설하시겠습니까?</p>
                <button onClick={() => this.handleCreateRoom(true)}>네</button>
                <button onClick={() => this.handleCreateRoom(false)}>아니오</button>
            </div>
        );
    },

    renderJoinRoomDialog() {
        return (
            <div className="dialog">
                <p>이미 존재하는 방입니다. 입장하시겠습니까?</p>
                <button onClick={() => this.handleJoinRoom(true)}>네</button>
                <button onClick={() => this.handleJoinRoom(false)}>아니오</button>
            </div>
        );
    },

    renderChatRooms() {
        if (!this.state.showChatRooms) {
            return null; // 채팅방 목록이 숨겨진 경우 아무것도 렌더링하지 않음
        }
    
        return (
            <div className="chatrooms">
                <h2>My Chat Rooms</h2>
                <ul>
                    {this.state.chatRooms.map((room, index) => (
                        <li key={index} onClick={() => this.handleRoomClick(room.name)} className="chatroom-item">
                            <span>{room.name}</span> {room.unread_count > 0 && <span>({room.unread_count})</span>}
                        </li>
                    ))}
                </ul>
            </div>
        );
    },    

    render() {
        return (
            <div className='app-container'>
                <div className='sidebar'>
                    <img src="/INU.png" alt="INU Logo" className="logo" />
                    <form className='search-bar' onSubmit={this.handleSearchSubmit}>
                        <input 
                            type="text" 
                            placeholder="찾을 방" 
                            value={this.state.searchQuery}
                            onChange={this.handleSearchChange}
                        />
                        <button className='searchbutton' type="submit">Search</button>
                    </form>
                    <ul>
                        <div><img src="/user.png" alt="User Icon" /></div>
                        <div onClick={this.handleIconClick}><img src="/message.png" alt="Message Icon" /></div>
                        <div><img src="/notification.png" alt="Notification Icon" /></div>
                        <div><img src="/setting.png" alt="Settings Icon" /></div>
                    </ul>
                </div>
                <div className='main-content'>
                    {this.state.showCreateDialog && this.renderCreateRoomDialog()}
                    {this.state.showJoinDialog && this.renderJoinRoomDialog()}
                    {this.state.showChatRooms && this.renderChatRooms()}
                    {this.state.currentRoom && (
                        <div className="new-room-header">
                            <h2>{this.state.currentRoom}</h2>
                            <button onClick={this.handleLeaveRoom}>Leave Room</button>
                        </div>
                    )}
                    <MessageList messages={this.state.messages} currentUser={this.state.user} />
                    {this.state.currentRoom && (
                        <MessageForm onMessageSubmit={this.handleMessageSubmit} user={this.state.user} currentRoom={this.state.currentRoom} />
                    )}
                </div>
            </div>
        );
    }
});

module.exports = ChatApp;

var SignupApp = React.createClass({
    getInitialState: function() {
        return {
            username: '',
            password: '',
            confirmPassword: '',
            error: ''
        };
    },

    handleUsernameChange: function(e) {
        this.setState({ username: e.target.value });
    },

    handlePasswordChange: function(e) {
        this.setState({ password: e.target.value });
    },

    handleConfirmPasswordChange: function(e) {
        this.setState({ confirmPassword: e.target.value });
    },

    handleSubmit: function(e) {
        e.preventDefault();
        var username = this.state.username.trim();
        var password = this.state.password.trim();
        var confirmPassword = this.state.confirmPassword.trim();

        if (!username || !password || !confirmPassword) {
            this.setState({ error: '모든 필드를 입력하세요.' });
            return;
        }

        if (password !== confirmPassword) {
            this.setState({ error: '비밀번호가 일치하지 않습니다.' });
            return;
        }

        fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: username, pw: password })
        }).then(response => {
            if (response.status === 201) {
                alert('회원가입 성공');
                this.props.onSwitchToLogin();
            } else {
                response.text().then(text => {
                    this.setState({ error: text });
                });
            }
        }).catch(err => {
            this.setState({ error: '회원가입 중 오류가 발생했습니다.' });
        });
    },

    render: function() {
        return (
            <div className="form-container">
                <img src="/INU.png" alt="INU Logo" className="logo" />
                <h2>Signup</h2>
                <form onSubmit={this.handleSubmit}>
                    <div>
                        <label>Username:</label>
                        <input
                            type="text"
                            value={this.state.username}
                            onChange={this.handleUsernameChange}
                        />
                    </div>
                    <div>
                        <label>Password:</label>
                        <input
                            type="password"
                            value={this.state.password}
                            onChange={this.handlePasswordChange}
                        />
                    </div>
                    <div>
                        <label>Confirm Password:</label>
                        <input
                            type="password"
                            value={this.state.confirmPassword}
                            onChange={this.handleConfirmPasswordChange}
                        />
                    </div>
                    <button type="submit">Signup</button>
                </form>
                {this.state.error && <p className="error">{this.state.error}</p>}
                <p>Already have an account? <a href="#" onClick={this.props.onSwitchToLogin}>Login here</a></p>
            </div>
        );
    }
});

var LoginApp = React.createClass({
    getInitialState: function() {
        return {
            username: '',
            password: '',
            error: '',
            loggedIn: false,
            showSignup: false,
        };
    },

    handleUsernameChange: function(e) {
        this.setState({ username: e.target.value });
    },

    handlePasswordChange: function(e) {
        this.setState({ password: e.target.value });
    },

    handleSubmit: function(e) {
        e.preventDefault();
        var username = this.state.username.trim();
        var password = this.state.password.trim();

        if (!username || !password) {
            this.setState({ error: '아이디와 비밀번호를 입력하세요.' });
            return;
        }

        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: username, pw: password })
        }).then(response => {
            if (response.status === 200) {
                alert('로그인 성공');
                this.setState({ loggedIn: true, username: username });
            } else {
                response.text().then(text => {
                    this.setState({ error: text });
                });
            }
        }).catch(err => {
            this.setState({ error: '로그인 중 오류가 발생했습니다.' });
        });
    },

    handleSwitchToSignup: function() {
        this.setState({ showSignup: true });
    },

    handleSwitchToLogin: function() {
        this.setState({ showSignup: false });
    },

    render: function() {
        if (this.state.loggedIn) {
            return <ChatApp user={this.state.username} />;
        }

        if (this.state.showSignup) {
            return <SignupApp onSwitchToLogin={this.handleSwitchToLogin} />;
        }

        return (
            <div className="form-container">
                <img src="/INU.png" alt="INU Logo" className="logo" />
                <h2>Login</h2>
                <form onSubmit={this.handleSubmit}>
                    <div>
                        <label>Username:</label>
                        <input
                            type="text"
                            value={this.state.username}
                            onChange={this.handleUsernameChange}
                        />
                    </div>
                    <div>
                        <label>Password:</label>
                        <input
                            type="password"
                            value={this.state.password}
                            onChange={this.handlePasswordChange}
                        />
                    </div>
                    <button className='loginbutton' type="submit">Login</button>
                </form>
                {this.state.error && <p className="error">{this.state.error}</p>}
                <p>Don't have an account? <a href="#" onClick={this.handleSwitchToSignup}>Signup here</a></p>
            </div>
        );
    }
});

React.render(<LoginApp />, document.getElementById('app'));
