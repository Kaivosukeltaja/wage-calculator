import http from 'http';
import express from 'express';
import csv from 'csv';
import fs from 'fs';

const port = process.env.PORT || 1337;
const dataFile = 'HourList201403.csv';

var data = {};

var calculateShiftLength = function(shift) {
  let [startHours, startMinutes] = shift.start.split(':').map((x) => { return parseInt(x)|0; });
  let [endHours, endMinutes] = shift.end.split(':').map((x) => { return parseInt(x)|0; });

  let minutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  if (minutes < 0) {
    // Compensate for date rollover
    minutes += 24 * 60;
  }

  return minutes;
};

var loadData = function(filename) {
  // Load the file from the file system
  fs.readFile(filename, 'utf8', (err, data) => {
    if (err) throw err; // This should be neater in a real project
    
    // Parse the CSV data to JSON
    csv.parse(data, (err, json) => {
      data = json.reduce((previous, current, index) => {
        if (index === 0) return previous; // Header row is ignored
        
        let [name, id, date, start, end] = current;
        let shift = {
          date: date,
          start: start,
          end: end
        };

        shift.minutes = calculateShiftLength(shift);

        previous[id] = previous[id] || { name: name, shifts: [] };
        previous[id].shifts.push(shift);

        return previous;
      }, {});

      console.log(JSON.stringify(data, null, 4));
    });

  });
};

loadData(dataFile);
/*
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(port, '0.0.0.0');

console.log(`Server running at http://127.0.0.1:${ port }/`);
*/