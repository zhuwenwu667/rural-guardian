const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'rural_guardian.db');

function checkUser() {
  const db = new Database(DB_PATH);

  // 查询 gov_admin 用户
  const user = db.prepare("SELECT id, username, password_hash, role, status FROM sys_user WHERE username = 'gov_admin'").get();

  if (!user) {
    console.log('User gov_admin not found!');
    db.close();
    return;
  }

  console.log('User data:');
  console.log('  id:', user.id);
  console.log('  username:', user.username);
  console.log('  password_hash:', user.password_hash);
  console.log('  role:', user.role);
  console.log('  status:', user.status);

  // 测试密码
  const match = bcrypt.compareSync('admin123', user.password_hash);
  console.log('\nPassword "admin123" match:', match);

  // 生成新的密码哈希
  const newHash = bcrypt.hashSync('admin123', 10);
  console.log('\nNew hash for "admin123":', newHash);

  // 更新密码
  db.prepare("UPDATE sys_user SET password_hash = ? WHERE username = 'gov_admin'").run(newHash);
  console.log('\nPassword updated successfully!');

  db.close();
}

checkUser();
