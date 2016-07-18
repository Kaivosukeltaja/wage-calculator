import http from 'http';
import express from 'express';
import csv from 'csv';
import fs from 'fs';

const port = process.env.PORT || 1337;
const dataFile = 'HourList201403.csv';

const nightshiftStart = timeToMinutes('18:00');
const nightshiftEnd   = timeToMinutes('6:00');

var data = {};

var timeToMinutes = function(time) {
  // Split string around colon and cast both sides to integer
  let [hours, minutes] = time.split(':').map((x) => { return parseInt(x)|0; });
  return hours * 60 + minutes;
};

var countEveningHours = function(startTime, endTime) {
  // Convert times to minutes since midnight
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  if (endMinutes < startMinutes) {
    // Adjust for date rollover
    endMinutes += 24 * 60;
  }

  // Case 1: shift started before 6am
  if (startMinutes < nightshiftEnd) {
    // Case 1.1: Shift ends before night shift starts
    if (endMinutes < nightshiftStart) {
      return Math.min(endMinutes, nightshiftEnd) - startMinutes;
    }

    // Case 1.2: Sick bastard worked over 12 hours. Easier to just count the
    // total worked minutes and substract the length of the day shift.
    // Example: 5:00 - 19:00 = (14 hours - 12 hours) = 2 hours night shift
    return endMinutes - startMinutes - (nightshiftStart - nightshiftEnd);
  }

  // Case 2: shift started at daytime
  if (startMinutes >= nightshiftEnd && startMinutes < nightshiftStart) {
    // Case 2.1: Shift ends before night shift starts - normal day shift
    if (endMinutes < nightshiftStart) {
      return 0;
    }

    // Case 2.2: TODO
  }
};

var calculateDailyPays = function(employee) {
  // Step one: group shifts by date and sum up the minutes
  employee.shifts.forEach((shift) => {
    let date = shift.date;

    employee.days[date] = employee.days[date] || { 
      shifts: [], 
      minutes: 0,  
      overtimeMinutes: 0,
      eveningMinutes: 0
    };

    let currentDate = employee.days[date];
    currentDate.shifts.push(shift);
    currentDate.minutes += shift.minutes;

  });

  employee.days.forEach((date) => {

  });

  return employee;
};

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

        previous[id] = previous[id] || { name: name, shifts: [], days: [] };
        previous[id].shifts.push(shift);

        return previous;
      }, {});

      data = data.map(calculateDailyPays);

      console.log(JSON.stringify(data, null, 4));
      return data;
    });

  });
};

data = loadData(dataFile);
/*
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(port, '0.0.0.0');

console.log(`Server running at http://127.0.0.1:${ port }/`);
*/