-- T11: Training Certificates
CREATE TABLE IF NOT EXISTS training_certificates (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  cert_code     VARCHAR(64) UNIQUE NOT NULL,
  course_id     INT NOT NULL,
  trainee_id    INT NOT NULL,
  issued_by     INT NOT NULL,
  final_score   DECIMAL(5,2) DEFAULT NULL,
  status        VARCHAR(32) DEFAULT 'issued',
  pdf_path      VARCHAR(255) DEFAULT NULL,
  issued_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_tc_trainee_course (trainee_id, course_id),
  INDEX idx_tc_code (cert_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
