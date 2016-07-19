import test from 'ava';
import _ from 'lodash';
import * as Shifts from '../src/shift';

var data;

test.before(async t => {
  data = await Shifts.loadData('../HourList201403.csv');
  t.pass();
});

test('has three employees', t => {
  t.is(Object.keys(data).length, 3);
});

test('turn time to minutes since midnight', t => {
  t.is(Shifts.timeToMinutes('8:30'), 8 * 60 + 30);
});

test('calculate shift length', t => {
  t.is(Shifts.calculateShiftLength({ start: '8:00', end: '9:00'}), 60);
  t.is(Shifts.calculateShiftLength({ start: '23:00', end: '0:00'}), 60);
  t.is(Shifts.calculateShiftLength({ start: '23:00', end: '1:15'}), 135);
  t.is(Shifts.calculateShiftLength({ start: '01:00', end: '22:00'}), 21 * 60);
  // Corner case - if start and end times are the same, is it a 24 or 0 hour shift?
  // We'll go with 24 even though it's inhuman because 0 length shifts shouldn't
  // be in the system at all.
  t.is(Shifts.calculateShiftLength({ start: '04:00', end: '04:00'}), 24 * 60);
});

test('calculate evening minutes', t => {
  t.is(Shifts.calculateEveningMinutes('8:00', '16:00'), 0);
  t.is(Shifts.calculateEveningMinutes('8:00', '18:00'), 0);
  t.is(Shifts.calculateEveningMinutes('8:00', '19:00'), 60);
  t.is(Shifts.calculateEveningMinutes('5:00', '19:00'), 120);
  t.is(Shifts.calculateEveningMinutes('23:00', '0:00'), 60);
  t.is(Shifts.calculateEveningMinutes('23:00', '12:00'), 7 * 60);
  t.is(Shifts.calculateEveningMinutes('16:00', '15:00'), 12 * 60);
});

//  let fauxData = { shifts: [{ date: '1.1.2016', start: '8:00', end: '16:00' }], days: {}};
