// 순수 Node 문법 연습할 땐 외부 패키지 설치 자체가 필요 없어요. Node 자체에 내장된 모듈(http, fs, path 등)만 쓸 거니까요.

const http = require('http');

console.log('test')

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('hello world');
})

server.listen(3000, () => {
  console.log('Server is running on port 3000');
})