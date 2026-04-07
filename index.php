<?php
require_once __DIR__ . '/api/db_connect.php';

session_start();

// Create users table if not exists
$conn->query("CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'GET':
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            echo json_encode(["error" => "Not authenticated"]);
            exit();
        }
        $userId = $_SESSION['user']['id'];
        
        if ($action === 'categories') {
            $stmt = $conn->prepare("SELECT id, name, budget_limit as budgetLimit, type FROM categories WHERE user_id = ?");
            $stmt->bind_param("s", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $out = [];
            while($row = $result->fetch_assoc()) {
                $row['budgetLimit'] = (float)$row['budgetLimit'];
                $out[] = $row;
            }
            echo json_encode($out);
        } 
        elseif ($action === 'transactions') {
            $stmt = $conn->prepare("SELECT id, user_id as userId, category_id as categoryId, amount, description, date, type, receipt_path as receiptPath, created_at as createdAt FROM transactions WHERE user_id = ? ORDER BY date DESC");
            $stmt->bind_param("s", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $out = [];
            while($row = $result->fetch_assoc()) {
                $row['amount'] = (float)$row['amount'];
                $out[] = $row;
            }
            echo json_encode($out);
        }
        elseif ($action === 'audits') {
            $stmt = $conn->prepare("SELECT id, expense_id as expenseId, risk_score as riskScore, flag_reason as flagReason, flag_date as flagDate, details FROM audit_logs WHERE expense_id IN (SELECT id FROM transactions WHERE user_id = ?) ORDER BY risk_score DESC");
            $stmt->bind_param("s", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $out = [];
            while($row = $result->fetch_assoc()) {
                $row['riskScore'] = (int)$row['riskScore'];
                $out[] = $row;
            }
            echo json_encode($out);
        }
        elseif ($action === 'currentUser') {
            echo json_encode($_SESSION['user']);
        }
        break;

    case 'POST':
        if (!isset($_SESSION['user']) && !in_array($action, ['login', 'register'])) {
            http_response_code(401);
            echo json_encode(["error" => "Not authenticated"]);
            exit();
        }
        $userId = isset($_SESSION['user']) ? $_SESSION['user']['id'] : null;
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        if ($action === 'transactions') {
            $stmt = $conn->prepare("INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, receipt_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $receipt = isset($data['receiptPath']) ? $data['receiptPath'] : null;
            $stmt->bind_param("ssssssss", $data['id'], $userId, $data['categoryId'], $data['amount'], $data['description'], $data['date'], $data['type'], $receipt);
            
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
        } 
        elseif ($action === 'categories') {
            $stmt = $conn->prepare("INSERT INTO categories (id, name, budget_limit, type, user_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("ssdss", $data['id'], $data['name'], $data['budgetLimit'], $data['type'], $userId);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
        }
        elseif ($action === 'audits') {
            $stmt = $conn->prepare("INSERT INTO audit_logs (id, expense_id, risk_score, flag_reason, flag_date, details) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssisss", $data['id'], $data['expenseId'], $data['riskScore'], $data['flagReason'], $data['flagDate'], $data['details']);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
        }
        elseif ($action === 'login') {
            $stmt = $conn->prepare("SELECT id, username, email, password_hash FROM users WHERE username = ?");
            $stmt->bind_param("s", $data['username']);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($user = $result->fetch_assoc()) {
                $passwordValid = false;
                if (password_get_info($user['password_hash'])['algo'] !== 0) {
                    // Hashed password
                    $passwordValid = password_verify($data['password'], $user['password_hash']);
                } else {
                    // Plain text (upgrade to hashed)
                    if ($data['password'] === $user['password_hash']) {
                        $passwordValid = true;
                        // Upgrade to hashed
                        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
                        $updateStmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
                        $updateStmt->bind_param("ss", $hashedPassword, $user['id']);
                        $updateStmt->execute();
                        $user['password_hash'] = $hashedPassword;
                    }
                }
                if ($passwordValid) {
                    unset($user['password_hash']);
                    $_SESSION['user'] = $user;
                    echo json_encode($user);
                } else {
                    http_response_code(401);
                    echo json_encode(["error" => "Invalid credentials"]);
                }
            } else {
                http_response_code(401);
                echo json_encode(["error" => "User not found"]);
            }
        }
        elseif ($action === 'register') {
            $userId = 'user_' . time() . '_' . rand(100, 999);
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $userId, $data['username'], $data['email'], $hashedPassword);
            if($stmt->execute()) {
                $user = [
                    'id' => $userId,
                    'username' => $data['username'],
                    'email' => $data['email']
                ];
                $_SESSION['user'] = $user;
                echo json_encode($user);
            } else {
                http_response_code(400);
                echo json_encode(["error" => "Registration failed"]);
            }
        }
        elseif ($action === 'logout') {
            session_destroy();
            echo json_encode(["status" => "logged out"]);
        }
        break;

    case 'PUT':
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            echo json_encode(["error" => "Not authenticated"]);
            exit();
        }
        $userId = $_SESSION['user']['id'];
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        if ($action === 'categories') {
            $stmt = $conn->prepare("UPDATE categories SET budget_limit = ? WHERE id = ? AND user_id = ?");
            $stmt->bind_param("dss", $data['budgetLimit'], $data['id'], $userId);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
        }
        elseif ($action === 'transactions') {
             $stmt = $conn->prepare("UPDATE transactions SET amount=?, description=?, date=?, category_id=? WHERE id=? AND user_id=?");
             $stmt->bind_param("dsssss", $data['amount'], $data['description'], $data['date'], $data['categoryId'], $data['id'], $userId);
             if($stmt->execute()) echo json_encode(["status" => "success"]);
        }
        break;

    case 'DELETE':
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            echo json_encode(["error" => "Not authenticated"]);
            exit();
        }
        $userId = $_SESSION['user']['id'];
        
        $id = isset($_GET['id']) ? $_GET['id'] : '';
        if ($action === 'transactions' && $id) {
             $stmt = $conn->prepare("DELETE FROM transactions WHERE id=? AND user_id=?");
             $stmt->bind_param("ss", $id, $userId);
             if($stmt->execute()) echo json_encode(["status" => "success"]);
        }
        elseif ($action === 'audits') {
            // For audits, delete all for current user's transactions
            $stmt = $conn->prepare("DELETE FROM audit_logs WHERE expense_id IN (SELECT id FROM transactions WHERE user_id = ?)");
            $stmt->bind_param("s", $userId);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
        }
        break;
}

$conn->close();
?>