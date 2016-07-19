import http from 'http';
import express from 'express';
import * as Shifts from './shift';

const port = process.env.PORT || 1337;
const dataFile = 'HourList201403.csv';

Shifts.loadData(dataFile).then(data => {
  console.log('Monthly Wages 03/2014:')
  Object.keys(data).forEach(index => {
    let employee = data[index];
    console.log(`${ index }, ${ employee.name }, \$${ employee.monthlyTotal / 100 }`);
  });
});

/*
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(port, '0.0.0.0');

console.log(`Server running at http://127.0.0.1:${ port }/`);
*/