const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'rural_guardian.db');

function checkData() {
  const db = new Database(DB_PATH);

  // 检查老人数据
  const elderly = db.prepare('SELECT * FROM elderly_info LIMIT 5').all();
  if (elderly.length > 0) {
    console.log('elderly_info columns:', Object.keys(elderly[0]));
    console.log('elderly_info data:', elderly);
  } else {
    console.log('No data in elderly_info table');
  }

  // 检查村庄数据
  const villages = db.prepare('SELECT * FROM village_info LIMIT 3').all();
  if (villages.length > 0) {
    console.log('village_info columns:', Object.keys(villages[0]));
    console.log('village_info data:', villages);
  } else {
    console.log('No data in village_info table');
  }

  db.close();
}

checkData();
