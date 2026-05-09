<?php
/**
 * Database Initialization Script
 * Creates all necessary tables with proper schema
 */

require_once __DIR__ . '/db_connect.php';

try {

    // Add missing columns to existing tables (for backward compatibility)
    // These won't fail if columns already exist
    @$conn->query("ALTER TABLE categories ADD COLUMN is_durable BOOLEAN DEFAULT 0 COMMENT 'Flag for durable goods' AFTER type");
    @$conn->query("ALTER TABLE transactions ADD COLUMN expense_type ENUM('recurring', 'irregular') COMMENT 'Classification for expenses' AFTER type");

    // Create users table
    $conn->query("CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Create categories table with new is_durable field
    $conn->query("CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      budget_limit DECIMAL(10, 2) DEFAULT 0,
      type ENUM('expense', 'income') NOT NULL,
      is_durable BOOLEAN DEFAULT 0 COMMENT 'Flag for durable goods (appliances, electronics)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    // Create transactions table with new expense_type field
    $conn->query("CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      category_id VARCHAR(50) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      description VARCHAR(255),
      date DATE NOT NULL,
      type ENUM('expense', 'income') NOT NULL,
      expense_type ENUM('recurring', 'irregular') COMMENT 'NEW: Classification for expenses',
      receipt_path VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )");

    // Create audit_logs table
    $conn->query("CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(50) PRIMARY KEY,
      expense_id VARCHAR(50) NOT NULL,
      risk_score INT,
      flag_reason VARCHAR(255),
      flag_date TIMESTAMP,
      details VARCHAR(500),
      FOREIGN KEY (expense_id) REFERENCES transactions(id) ON DELETE CASCADE
    )");

    // Create saving_goals table (NEW)
    $conn->query("CREATE TABLE IF NOT EXISTS saving_goals (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      goal_name VARCHAR(100) NOT NULL,
      target_amount DECIMAL(10, 2) NOT NULL,
      deadline DATE NOT NULL,
      type ENUM('purchase', 'general') NOT NULL,
      status ENUM('active', 'completed', 'failed') DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    // Create saving_progress table (NEW)
    $conn->query("CREATE TABLE IF NOT EXISTS saving_progress (
      id VARCHAR(50) PRIMARY KEY,
      goal_id VARCHAR(50) NOT NULL,
      month VARCHAR(7) NOT NULL COMMENT 'YYYY-MM format',
      amount_saved DECIMAL(10, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE
    )");

    echo json_encode([
      "status" => "success",
      "message" => "All tables created/verified successfully"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      "status" => "error",
      "message" => $e->getMessage()
    ]);
}

$conn->close();
?>
