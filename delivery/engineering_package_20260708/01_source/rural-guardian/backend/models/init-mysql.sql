-- ============================================================
-- 乡村守护者 — MySQL 数据库初始化脚本
-- 将 SQLite 语法迁移到 MySQL 8.4
-- ============================================================

CREATE DATABASE IF NOT EXISTS rural_guardian
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE rural_guardian;

-- ==================== 建表 ====================

CREATE TABLE IF NOT EXISTS sys_user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(64),
  role VARCHAR(32) NOT NULL DEFAULT 'FAMILY_MEMBER',
  phone VARCHAR(20),
  village_id INT,
  status INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS elderly_info (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  gender VARCHAR(8),
  birth_date DATE,
  id_card VARCHAR(18),
  phone VARCHAR(20),
  address VARCHAR(255),
  village_id INT,
  emergency_contact VARCHAR(64),
  emergency_phone VARCHAR(20),
  health_status VARCHAR(32) DEFAULT 'GOOD',
  living_alone TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS health_record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  elderly_id INT NOT NULL,
  heart_rate INT,
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  blood_oxygen DECIMAL(5,1),
  temperature DECIMAL(4,1),
  sleep_hours DECIMAL(3,1),
  steps INT,
  record_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (elderly_id) REFERENCES elderly_info(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alert_record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  elderly_id INT NOT NULL,
  type VARCHAR(64) NOT NULL,
  level VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  description TEXT,
  handler_id INT,
  handled_at DATETIME,
  current_handler_id INT,
  escalation_level INT DEFAULT 0,
  family_confirmed TINYINT DEFAULT 0,
  family_confirm_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (elderly_id) REFERENCES elderly_info(id),
  FOREIGN KEY (handler_id) REFERENCES sys_user(id),
  FOREIGN KEY (current_handler_id) REFERENCES sys_user(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_order (
  id INT PRIMARY KEY AUTO_INCREMENT,
  elderly_id INT NOT NULL,
  type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
  description TEXT,
  provider_id INT,
  village_staff_id INT,
  family_id INT,
  priority VARCHAR(16) DEFAULT 'NORMAL',
  appointment_time DATETIME,
  created_by INT,
  assigned_by INT,
  assigned_at DATETIME,
  started_at DATETIME,
  completed_at DATETIME,
  rating INT,
  review_id INT,
  dispatch_type VARCHAR(16) DEFAULT 'MANUAL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (elderly_id) REFERENCES elderly_info(id),
  FOREIGN KEY (village_staff_id) REFERENCES sys_user(id),
  FOREIGN KEY (family_id) REFERENCES sys_user(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS device_info (
  id INT PRIMARY KEY AUTO_INCREMENT,
  elderly_id INT NOT NULL,
  device_sn VARCHAR(64) UNIQUE NOT NULL,
  type VARCHAR(32) NOT NULL,
  battery_level INT DEFAULT 100,
  status VARCHAR(16) DEFAULT 'ONLINE',
  last_heartbeat DATETIME,
  firmware_version VARCHAR(16),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (elderly_id) REFERENCES elderly_info(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS village_info (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  town VARCHAR(64),
  district VARCHAR(64),
  population INT,
  elderly_count INT DEFAULT 0,
  staff_count INT DEFAULT 0,
  service_point_address VARCHAR(255),
  contact_phone VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS provider_info (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  name VARCHAR(128) NOT NULL,
  service_types VARCHAR(255),
  contact_person VARCHAR(64),
  contact_phone VARCHAR(20),
  service_area VARCHAR(128),
  rating DECIMAL(3,2) DEFAULT 0,
  status VARCHAR(16) DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS family_member (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  elderly_id INT NOT NULL,
  relationship VARCHAR(32),
  phone VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES sys_user(id),
  FOREIGN KEY (elderly_id) REFERENCES elderly_info(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(128) UNIQUE NOT NULL,
  config_value TEXT,
  config_group VARCHAR(64),
  description VARCHAR(255),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_call_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_group VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'success',
  request_data TEXT,
  response_data TEXT,
  error_msg TEXT,
  duration_ms INT,
  token_used INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS message_template (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(32) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  variables TEXT,
  status INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS geo_fence (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  radius INT NOT NULL DEFAULT 500,
  village_id INT,
  status INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sms_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'sent',
  ip VARCHAR(45),
  used_at DATETIME,
  expires_at DATETIME,
  verified INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alert_flow (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_id INT NOT NULL,
  action VARCHAR(64) NOT NULL,
  operator_id INT,
  operator_role VARCHAR(32),
  from_status VARCHAR(32),
  to_status VARCHAR(32),
  remark TEXT,
  location VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alert_id) REFERENCES alert_record(id),
  FOREIGN KEY (operator_id) REFERENCES sys_user(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alert_notification (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_id INT NOT NULL,
  channel VARCHAR(32) NOT NULL,
  recipient_id INT NOT NULL,
  recipient_role VARCHAR(32) NOT NULL,
  status VARCHAR(16) DEFAULT 'PENDING',
  sent_at DATETIME,
  delivered_at DATETIME,
  read_at DATETIME,
  error_msg TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alert_id) REFERENCES alert_record(id),
  FOREIGN KEY (recipient_id) REFERENCES sys_user(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS family_binding_approval (
  id INT PRIMARY KEY AUTO_INCREMENT,
  elderly_id INT NOT NULL,
  user_id INT NOT NULL,
  relationship VARCHAR(32),
  relationship_proof TEXT,
  status VARCHAR(16) DEFAULT 'PENDING',
  applicant_id INT,
  approver_id INT,
  approve_remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (elderly_id) REFERENCES elderly_info(id),
  FOREIGN KEY (user_id) REFERENCES sys_user(id),
  FOREIGN KEY (approver_id) REFERENCES sys_user(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS device_binding_approval (
  id INT PRIMARY KEY AUTO_INCREMENT,
  device_id INT NOT NULL,
  elderly_id INT NOT NULL,
  operator_id INT NOT NULL,
  bind_type VARCHAR(16) DEFAULT 'BIND',
  reason TEXT,
  status VARCHAR(16) DEFAULT 'PENDING',
  approver_id INT,
  approve_remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (device_id) REFERENCES device_info(id),
  FOREIGN KEY (elderly_id) REFERENCES elderly_info(id),
  FOREIGN KEY (operator_id) REFERENCES sys_user(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS provider_certification (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL,
  cert_type VARCHAR(64) NOT NULL,
  cert_number VARCHAR(64),
  cert_image TEXT,
  business_license TEXT,
  service_qualification TEXT,
  status VARCHAR(16) DEFAULT 'PENDING',
  submitter_id INT,
  reviewer_id INT,
  review_remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  FOREIGN KEY (provider_id) REFERENCES provider_info(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_flow (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  action VARCHAR(64) NOT NULL,
  operator_id INT,
  operator_role VARCHAR(32),
  from_status VARCHAR(32),
  to_status VARCHAR(32),
  remark TEXT,
  attachment TEXT,
  location VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES service_order(id),
  FOREIGN KEY (operator_id) REFERENCES sys_user(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS device_realtime (
  device_id INT PRIMARY KEY,
  elderly_id INT,
  heart_rate INT,
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  blood_oxygen DECIMAL(5,1),
  temperature DECIMAL(4,1),
  steps INT,
  battery INT,
  status VARCHAR(16) DEFAULT 'ONLINE',
  last_report_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  FOREIGN KEY (device_id) REFERENCES device_info(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alert_rule (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  metric VARCHAR(64) NOT NULL,
  `condition` VARCHAR(16) NOT NULL,
  threshold DECIMAL(10,2) NOT NULL,
  level VARCHAR(8) DEFAULT 'P1',
  enabled TINYINT DEFAULT 1,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS device_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  device_id INT NOT NULL,
  elderly_id INT,
  heart_rate INT,
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  blood_oxygen DECIMAL(5,1),
  temperature DECIMAL(4,1),
  steps INT,
  battery INT,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES device_info(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_review (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  service_attitude INT,
  service_quality INT,
  timeliness INT,
  content TEXT,
  images TEXT,
  is_anonymous TINYINT DEFAULT 0,
  reply TEXT,
  reply_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES service_order(id),
  FOREIGN KEY (reviewer_id) REFERENCES sys_user(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sys_menu (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_id INT DEFAULT 0,
  name VARCHAR(64) NOT NULL,
  path VARCHAR(128),
  component VARCHAR(128),
  icon VARCHAR(64),
  permission VARCHAR(64),
  menu_type INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  visible INT DEFAULT 1,
  status INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sys_role_menu (
  role VARCHAR(32) NOT NULL,
  menu_id INT NOT NULL,
  PRIMARY KEY (role, menu_id),
  FOREIGN KEY (menu_id) REFERENCES sys_menu(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cs_call_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  elderly_id INT NOT NULL,
  elderly_name VARCHAR(64) NOT NULL,
  village_name VARCHAR(64),
  phone VARCHAR(20),
  reason VARCHAR(255),
  status VARCHAR(16) DEFAULT 'pending',
  cs_id INT,
  cs_name VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME,
  ended_at DATETIME,
  ended_by VARCHAR(32),
  FOREIGN KEY (elderly_id) REFERENCES elderly_info(id),
  FOREIGN KEY (cs_id) REFERENCES sys_user(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cs_chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id INT NOT NULL,
  from_id INT NOT NULL,
  from_name VARCHAR(64),
  to_id INT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES cs_call_records(id)
) ENGINE=InnoDB;

-- ==================== 索引 ====================
CREATE INDEX idx_user_username ON sys_user(username);
CREATE INDEX idx_user_role ON sys_user(role);
CREATE INDEX idx_user_village ON sys_user(village_id);
CREATE INDEX idx_elderly_village ON elderly_info(village_id);
CREATE INDEX idx_elderly_health_status ON elderly_info(health_status);
CREATE INDEX idx_health_elderly ON health_record(elderly_id);
CREATE INDEX idx_health_date ON health_record(record_date);
CREATE INDEX idx_alert_elderly ON alert_record(elderly_id);
CREATE INDEX idx_alert_status ON alert_record(status);
CREATE INDEX idx_alert_level ON alert_record(level);
CREATE INDEX idx_alert_created ON alert_record(created_at);
CREATE INDEX idx_order_elderly ON service_order(elderly_id);
CREATE INDEX idx_order_status ON service_order(status);
CREATE INDEX idx_order_provider ON service_order(provider_id);
CREATE INDEX idx_device_sn ON device_info(device_sn);
CREATE INDEX idx_device_elderly ON device_info(elderly_id);
CREATE INDEX idx_device_status ON device_info(status);
CREATE INDEX idx_family_user ON family_member(user_id);
CREATE INDEX idx_family_elderly ON family_member(elderly_id);
CREATE INDEX idx_sms_phone ON sms_log(phone);
CREATE INDEX idx_sms_created ON sms_log(created_at);
CREATE INDEX idx_config_group ON system_config(config_group);
CREATE INDEX idx_config_key ON system_config(config_key);
CREATE INDEX idx_flow_alert ON alert_flow(alert_id);
CREATE INDEX idx_flow_operator ON alert_flow(operator_id);
CREATE INDEX idx_flow_created ON alert_flow(created_at);
CREATE INDEX idx_notif_alert ON alert_notification(alert_id);
CREATE INDEX idx_notif_recipient ON alert_notification(recipient_id);
CREATE INDEX idx_notif_status ON alert_notification(status);
CREATE INDEX idx_bind_elderly ON family_binding_approval(elderly_id);
CREATE INDEX idx_bind_user ON family_binding_approval(user_id);
CREATE INDEX idx_bind_status ON family_binding_approval(status);
CREATE INDEX idx_devbind_device ON device_binding_approval(device_id);
CREATE INDEX idx_devbind_elderly ON device_binding_approval(elderly_id);
CREATE INDEX idx_devbind_status ON device_binding_approval(status);
CREATE INDEX idx_cert_provider ON provider_certification(provider_id);
CREATE INDEX idx_cert_status ON provider_certification(status);
CREATE INDEX idx_oflow_order ON order_flow(order_id);
CREATE INDEX idx_oflow_operator ON order_flow(operator_id);
CREATE INDEX idx_review_order ON order_review(order_id);
CREATE INDEX idx_review_reviewer ON order_review(reviewer_id);
CREATE INDEX idx_menu_parent ON sys_menu(parent_id);
CREATE INDEX idx_menu_permission ON sys_menu(permission);
CREATE INDEX idx_rolemenu_role ON sys_role_menu(role);
CREATE INDEX idx_rolemenu_menu ON sys_role_menu(menu_id);
CREATE INDEX idx_realtime_elderly ON device_realtime(elderly_id);
CREATE INDEX idx_realtime_status ON device_realtime(status);
CREATE INDEX idx_alert_rule_metric ON alert_rule(metric);
CREATE INDEX idx_alert_rule_enabled ON alert_rule(enabled);
CREATE INDEX idx_history_device ON device_history(device_id);
CREATE INDEX idx_history_recorded ON device_history(recorded_at);
CREATE INDEX idx_call_status ON cs_call_records(status);
CREATE INDEX idx_call_elderly ON cs_call_records(elderly_id);
CREATE INDEX idx_call_cs ON cs_call_records(cs_id);
CREATE INDEX idx_call_created ON cs_call_records(created_at);
CREATE INDEX idx_chat_call ON cs_chat_messages(call_id);
CREATE INDEX idx_chat_from ON cs_chat_messages(from_id);
CREATE INDEX idx_chat_created ON cs_chat_messages(created_at);
