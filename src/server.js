import http from 'http';
import express from 'express';
import * as Shifts from './shift';

const port = process.env.PORT || 1337;
const dataFile = 'HourList201403.csv';

var data = Shifts.loadData(dataFile);
/*
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(port, '0.0.0.0');

console.log(`Server running at http://127.0.0.1:${ port }/`);
*/