import fs from 'fs';
import csv from 'csv';
import _ from 'lodash';

var salaryCents = 375;
var eveningCompensation = 115;

export var timeToMinutes = function(time) {
  // Split string around colon and cast both sides to integer
  let [hours, minutes] = time.split(':').map(x => { return parseInt(x)|0; });
  return hours * 60 + minutes;
};

export var calculateDailyPays = function(employee) {
  // Step one: group shifts by date and sum up the minutes
  employee.shifts.forEach(shift => {
    let date = shift.date;

    employee.days[date] = employee.days[date] || {
      shifts: [],
      minutes: 0,
      overtimeMinutes: 0,
      eveningMinutes: 0,
      payCents: 0
    };

    let currentDate = employee.days[date];
    currentDate.shifts.push(shift);
    currentDate.minutes += shift.minutes;
    currentDate.eveningMinutes += calculateEveningMinutes(shift.start, shift.end);

  });

  _.forOwn(employee.days, (data, date) => {
    let currentDate = employee.days[date];
    // Add salary for the regular hours
    currentDate.payCents += data.minutes * salaryCents / 60;
    // Add salary for night shift
    currentDate.payCents += data.eveningMinutes * eveningCompensation / 60;
    // Calculate amount of overtime. Messy code - could probably be made
    // a lot more elegant with some recursion magic
    currentDate.overtimeMinutes = Math.max(0, data.minutes - 8 * 60);
    if (currentDate.overtimeMinutes > 0) {
      let overtime = currentDate.overtimeMinutes;
      // 25% for the first 2 hours
      currentDate.payCents += Math.min(120, overtime) * salaryCents / 60 * 0.25;
      overtime -= 120;
      if (overtime > 0) {
        // 50% for the next 2 hours
        currentDate.payCents += Math.min(120, overtime) * salaryCents / 60 * 0.50;
        overtime -= 120;
      }
      if (overtime > 0) {
        // 100% for the next 2 hours
        currentDate.payCents += overtime * salaryCents / 60;
      }
    }

    // Round to nearest integer
    currentDate.payCents = Math.round(currentDate.payCents);
  });

  return employee;
};

export var calculateShiftLength = function(shift) {
  let [startHours, startMinutes] = shift.start.split(':').map(x => { return parseInt(x)|0; });
  let [endHours, endMinutes] = shift.end.split(':').map(x => { return parseInt(x)|0; });

  let minutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  if (minutes <= 0) {
    // Compensate for date rollover
    minutes += 24 * 60;
  }

  return minutes;
};

export var calculateEveningMinutes = function(startTime, endTime) {
  // Convert times to minutes since midnight
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  let nightshiftStart = timeToMinutes('18:00');
  let nightshiftEnd   = timeToMinutes('6:00');
  let nightshiftEndAgain = nightshiftEnd + 24 * 60;

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

    // Case 2.2: Shift continues into the night but not until next day 6am
    if (endMinutes < nightshiftEndAgain) {
      return endMinutes - nightshiftStart;
    }

    // Case 2.3: Sick bastard worked all through the night and doesn't even
    // get a night shift bonus from the rest of their shift.
    return nightshiftEndAgain - nightshiftStart;
  }

  // Case 3: Shift started at evening
  // Case 3.1: All of the shift is night shift
  if (endMinutes < nightshiftEndAgain) {
    return endMinutes - startMinutes;
  }

  // Case 3.2: Shift continues over the end of night shift
  return nightshiftEndAgain - startMinutes;
};

export var loadData = function(filename) {

  return new Promise((resolve, reject) => {
    // Load the file from the file system
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) throw err; // This should be neater in a real project

      // Parse the CSV data to JSON
      csv.parse(data, (err, json) => {
        let data = json.reduce((previous, current, index) => {
          if (index === 0) return previous; // Header row is ignored

          let [name, id, date, start, end] = current;
          let shift = {
            date: date,
            start: start,
            end: end
          };

          shift.minutes = calculateShiftLength(shift);

          previous[id] = previous[id] || { name: name, shifts: [], days: {} };
          previous[id].shifts.push(shift);

          return previous;
        }, {});

        resolve(_.mapValues(data, calculateDailyPays));

      });

    });

  });

};