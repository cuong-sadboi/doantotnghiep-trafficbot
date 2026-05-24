CREATE TABLE IF NOT EXISTS websites (
  id CHAR(36) PRIMARY KEY,
  owner_user_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  primary_domain VARCHAR(255) NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  timezone VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_websites_primary_domain (primary_domain),
  KEY idx_websites_owner (owner_user_id),
  KEY idx_websites_status (status),
  CONSTRAINT fk_websites_owner FOREIGN KEY (owner_user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS website_domains (
  id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_website_domains (website_id, domain),
  KEY idx_website_domains_website (website_id),
  CONSTRAINT fk_website_domains_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tracking_keys (
  id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  public_key VARCHAR(64) NOT NULL,
  secret_hash VARCHAR(255) NOT NULL,
  script_version VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  UNIQUE KEY uk_tracking_keys_public (public_key),
  KEY idx_tracking_keys_website (website_id),
  CONSTRAINT fk_tracking_keys_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  PRIMARY KEY (user_id, role_id),
  KEY idx_user_roles_role (role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id)
    REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_auth_sessions_token (token_hash),
  KEY idx_auth_sessions_user (user_id),
  KEY idx_auth_sessions_expires (expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_password_reset_token (token_hash),
  KEY idx_password_reset_user (user_id),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email_verification_token (token_hash),
  KEY idx_email_verification_user (user_id),
  CONSTRAINT fk_email_verification_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  provider ENUM('google') NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  expires_at DATETIME NULL,
  UNIQUE KEY uk_oauth_provider_user (provider, provider_user_id),
  KEY idx_oauth_user (user_id),
  CONSTRAINT fk_oauth_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS traffic_sessions (
  id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  visitor_id VARCHAR(64) NOT NULL,
  ip VARCHAR(64) NOT NULL,
  user_agent VARCHAR(512) NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  pageviews INT NOT NULL DEFAULT 0,
  is_bot TINYINT(1) NOT NULL DEFAULT 0,
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  KEY idx_traffic_sessions_website_time (website_id, started_at),
  KEY idx_traffic_sessions_ip (ip),
  CONSTRAINT fk_traffic_sessions_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS traffic_requests (
  id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  session_id CHAR(36) NULL,
  ip VARCHAR(64) NOT NULL,
  method VARCHAR(12) NOT NULL,
  path VARCHAR(2048) NOT NULL,
  status INT NOT NULL,
  response_time_ms INT NOT NULL DEFAULT 0,
  size INT NOT NULL DEFAULT 0,
  referer VARCHAR(1024) NULL,
  user_agent VARCHAR(512) NOT NULL,
  logged_at DATETIME NOT NULL,
  KEY idx_traffic_requests_website_time (website_id, logged_at),
  KEY idx_traffic_requests_ip (ip),
  KEY idx_traffic_requests_status (status),
  KEY idx_traffic_requests_session (session_id),
  CONSTRAINT fk_traffic_requests_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_traffic_requests_session FOREIGN KEY (session_id)
    REFERENCES traffic_sessions(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS traffic_stats_hourly (
  website_id CHAR(36) NOT NULL,
  hour_bucket DATETIME NOT NULL,
  total_requests INT NOT NULL DEFAULT 0,
  unique_ips INT NOT NULL DEFAULT 0,
  bot_requests INT NOT NULL DEFAULT 0,
  error_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  avg_response_time_ms INT NOT NULL DEFAULT 0,
  PRIMARY KEY (website_id, hour_bucket),
  CONSTRAINT fk_traffic_stats_hourly_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS traffic_stats_daily (
  website_id CHAR(36) NOT NULL,
  day_bucket DATE NOT NULL,
  total_requests INT NOT NULL DEFAULT 0,
  unique_ips INT NOT NULL DEFAULT 0,
  bot_requests INT NOT NULL DEFAULT 0,
  error_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  avg_response_time_ms INT NOT NULL DEFAULT 0,
  PRIMARY KEY (website_id, day_bucket),
  CONSTRAINT fk_traffic_stats_daily_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS report_jobs (
  id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  report_type ENUM('traffic') NOT NULL,
  format ENUM('csv','json','pdf') NOT NULL,
  filter_json JSON NOT NULL,
  status ENUM('queued','running','failed','completed') NOT NULL DEFAULT 'queued',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  error_message TEXT NULL,
  KEY idx_report_jobs_website (website_id),
  KEY idx_report_jobs_user (user_id),
  KEY idx_report_jobs_status (status),
  CONSTRAINT fk_report_jobs_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_report_jobs_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS report_files (
  id CHAR(36) PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  checksum VARCHAR(128) NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_report_files_job (job_id),
  CONSTRAINT fk_report_files_job FOREIGN KEY (job_id)
    REFERENCES report_jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity ENUM('low','medium','high','critical') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('new','acknowledged','resolved') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  resolved_by CHAR(36) NULL,
  KEY idx_anomaly_alerts_website (website_id),
  KEY idx_anomaly_alerts_status (status),
  CONSTRAINT fk_anomaly_alerts_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_anomaly_alerts_resolved_by FOREIGN KEY (resolved_by)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS suspicious_ips (
  id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  ip VARCHAR(64) NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  reason VARCHAR(255) NULL,
  first_seen DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  status ENUM('watch','blocked','whitelisted') NOT NULL DEFAULT 'watch',
  UNIQUE KEY uk_suspicious_ips (website_id, ip),
  KEY idx_suspicious_ips_website (website_id),
  CONSTRAINT fk_suspicious_ips_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ml_models (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  algorithm VARCHAR(50) NOT NULL,
  framework VARCHAR(50) NOT NULL,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ml_models_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ml_model_versions (
  id CHAR(36) PRIMARY KEY,
  model_id CHAR(36) NOT NULL,
  version VARCHAR(50) NOT NULL,
  metrics_json JSON NULL,
  trained_at DATETIME NOT NULL,
  storage_uri VARCHAR(1024) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uk_ml_model_versions (model_id, version),
  KEY idx_ml_model_versions_model (model_id),
  CONSTRAINT fk_ml_model_versions_model FOREIGN KEY (model_id)
    REFERENCES ml_models(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ml_training_jobs (
  id CHAR(36) PRIMARY KEY,
  model_version_id CHAR(36) NOT NULL,
  status ENUM('queued','running','failed','completed') NOT NULL DEFAULT 'queued',
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  log_path VARCHAR(1024) NULL,
  KEY idx_ml_training_jobs_model_version (model_version_id),
  CONSTRAINT fk_ml_training_jobs_model_version FOREIGN KEY (model_version_id)
    REFERENCES ml_model_versions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feature_store (
  id CHAR(36) PRIMARY KEY,
  entity_type ENUM('request','session','ip') NOT NULL,
  entity_id CHAR(36) NOT NULL,
  feature_vector_json JSON NOT NULL,
  window_start DATETIME NOT NULL,
  window_end DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_feature_store_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bot_predictions (
  id CHAR(36) PRIMARY KEY,
  website_id CHAR(36) NOT NULL,
  request_id CHAR(36) NULL,
  session_id CHAR(36) NULL,
  model_version_id CHAR(36) NOT NULL,
  score DECIMAL(6,4) NOT NULL,
  is_bot TINYINT(1) NOT NULL DEFAULT 0,
  predicted_at DATETIME NOT NULL,
  KEY idx_bot_predictions_website (website_id),
  KEY idx_bot_predictions_time (predicted_at),
  KEY idx_bot_predictions_request (request_id),
  KEY idx_bot_predictions_session (session_id),
  CONSTRAINT fk_bot_predictions_website FOREIGN KEY (website_id)
    REFERENCES websites(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bot_predictions_request FOREIGN KEY (request_id)
    REFERENCES traffic_requests(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_bot_predictions_session FOREIGN KEY (session_id)
    REFERENCES traffic_sessions(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_bot_predictions_model_version FOREIGN KEY (model_version_id)
    REFERENCES ml_model_versions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS system_logs (
  id CHAR(36) PRIMARY KEY,
  level ENUM('debug','info','warn','error') NOT NULL,
  source VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  meta_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_system_logs_level (level),
  KEY idx_system_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  actor_user_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  old_value_json JSON NULL,
  new_value_json JSON NULL,
  ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_logs_actor (actor_user_id),
  KEY idx_audit_logs_action (action),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS api_keys (
  id CHAR(36) PRIMARY KEY,
  owner_user_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  scopes VARCHAR(255) NOT NULL,
  status ENUM('active','revoked') NOT NULL DEFAULT 'active',
  last_used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  UNIQUE KEY uk_api_keys_hash (key_hash),
  KEY idx_api_keys_owner (owner_user_id),
  CONSTRAINT fk_api_keys_owner FOREIGN KEY (owner_user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
