DROP DATABASE IF EXISTS chatdb;
DROP USER IF EXISTS '202201482user'@'localhost';
create user '202201482user'@'localhost' IDENTIFIED WITH mysql_native_password BY '202201482pw';
create database chatdb;
grant all privileges on chatdb.* to '202201482user'@'localhost' with grant option;
commit;

use chatdb;

CREATE TABLE Login (
	id VARCHAR(20) PRIMARY KEY,
    pw VARCHAR(20)
);

CREATE TABLE chatroom (
	name VARCHAR(20) PRIMARY KEY
);

CREATE TABLE chatting (
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    name VARCHAR(20),
    id VARCHAR(20),
    message VARCHAR(200),
    PRIMARY KEY (timestamp),
    FOREIGN KEY (id) REFERENCES Login(id),
    FOREIGN KEY (name) REFERENCES chatroom(name)
);