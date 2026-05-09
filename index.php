<?php
require_once __DIR__ . '/api/db_connect.php';

// Configure session with proper cookie settings
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');  // Prevent JS access for security
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.cookie_lifetime', 86400 * 7);  // 7 days
    ini_set('session.gc_maxlifetime', 86400 * 7);   // Match cookie lifetime
    session_start();
}

// Set JSON content type for all responses
header('Content-Type: application/json');

// Initialize database schema on first load
if (!function_exists('initializeDatabase')) {
    function initializeDatabase($conn) {
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
          is_durable BOOLEAN DEFAULT 0,
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
          expense_type ENUM('recurring', 'irregular') COMMENT 'recurring or irregular',
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

        // Create saving_goals table
        $conn->query("CREATE TABLE IF NOT EXISTS saving_goals (
          id VARCHAR(50) PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          goal_name VARCHAR(100) NOT NULL,
          target_amount DECIMAL(10, 2) NOT NULL,
          deadline DATE NOT NULL,
          type ENUM('purchase', 'general') NOT NULL DEFAULT 'general',
          status ENUM('active', 'completed', 'failed') DEFAULT 'active',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        // Create saving_progress table
        $conn->query("CREATE TABLE IF NOT EXISTS saving_progress (
          id VARCHAR(50) PRIMARY KEY,
          goal_id VARCHAR(50) NOT NULL,
          month VARCHAR(7) NOT NULL,
          amount_saved DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE
        )");
    }
}

initializeDatabase($conn);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// If no action specified, serve the HTML application
if (empty($action)) {
    include 'index.html';
    exit();
}

switch ($method) {
    case 'GET':
        if ($action === 'currentUser') {
            if (!isset($_SESSION['user'])) {
                error_log("❌ [Backend] currentUser: No session user found");
                http_response_code(401);
                echo json_encode(["error" => "Not authenticated"]);
                exit();
            }

            error_log("✅ [Backend] currentUser: Session user found - " . $_SESSION['user']['username']);
            echo json_encode($_SESSION['user']);
            break;
        }

        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            echo json_encode(["error" => "Not authenticated"]);
            exit();
        }
        $userId = $_SESSION['user']['id'];
        error_log("🔐 [Backend] GET request - User ID: " . $userId . ", Action: " . $action);
        
        if ($action === 'categories') {
            try {
                $query = "SELECT id, name, budget_limit as budgetLimit, type, COALESCE(is_durable, 0) as isDurable FROM categories WHERE user_id = ?";
                error_log("🔍 [Backend] Categories query: " . $query);
                $stmt = $conn->prepare($query);
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . $conn->error);
                }
                $stmt->bind_param("s", $userId);
                if (!$stmt->execute()) {
                    throw new Exception("Execute failed: " . $stmt->error);
                }
                $result = $stmt->get_result();
                $out = [];
                while($row = $result->fetch_assoc()) {
                    $row['budgetLimit'] = (float)$row['budgetLimit'];
                    $row['isDurable'] = (bool)$row['isDurable'];
                    $out[] = $row;
                }
                error_log("✅ [Backend] Categories for user " . $userId . ": " . count($out) . " rows");
                header('Content-Type: application/json');
                echo json_encode($out);
            } catch (Exception $e) {
                error_log("❌ [Backend] Categories error: " . $e->getMessage());
                header('Content-Type: application/json');
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        } 
        elseif ($action === 'transactions') {
            try {
                $query = "SELECT id, user_id as userId, category_id as categoryId, amount, description, date, type, COALESCE(expense_type, 'irregular') as expenseType, receipt_path as receiptPath, created_at as createdAt FROM transactions WHERE user_id = ? ORDER BY date DESC";
                error_log("🔍 [Backend] Transactions query: " . $query);
                $stmt = $conn->prepare($query);
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . $conn->error);
                }
                $stmt->bind_param("s", $userId);
                if (!$stmt->execute()) {
                    throw new Exception("Execute failed: " . $stmt->error);
                }
                $result = $stmt->get_result();
                $out = [];
                $rowCount = 0;
                while($row = $result->fetch_assoc()) {
                    $row['amount'] = (float)$row['amount'];
                    $out[] = $row;
                    $rowCount++;
                }
                error_log("✅ [Backend] Transactions for user " . $userId . ": " . $rowCount . " rows");
                header('Content-Type: application/json');
                echo json_encode($out);
            } catch (Exception $e) {
                error_log("❌ [Backend] Transactions error: " . $e->getMessage());
                header('Content-Type: application/json');
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
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
                error_log("🔍 [Backend] currentUser check - Session ID: " . session_id());
                error_log("🔍 [Backend] Session data: " . json_encode($_SESSION));
                
                if (!isset($_SESSION['user'])) {
                    error_log("❌ [Backend] currentUser: No session user found");
                    http_response_code(401);
                    echo json_encode(["error" => "Not authenticated"]);
                    exit();
                }

                error_log("✅ [Backend] currentUser: Session user found - " . $_SESSION['user']['username']);
                echo json_encode($_SESSION['user']);
        }
        elseif ($action === 'test_queries') {
                // Test endpoint to diagnose query issues
                if (!isset($_SESSION['user'])) {
                    http_response_code(401);
                    echo json_encode(["error" => "Not authenticated"]);
                    exit();
                }
                
                $currentUserId = $_SESSION['user']['id'];
                $diagnostics = [
                    "userId" => $currentUserId,
                    "tests" => []
                ];
                
                // Test 1: Simple category count
                $result = $conn->query("SELECT COUNT(*) as count FROM categories WHERE user_id = '" . $conn->real_escape_string($currentUserId) . "'");
                if ($result) {
                    $row = $result->fetch_assoc();
                    $diagnostics["tests"][] = ["name" => "Category count", "status" => "ok", "result" => $row['count']];
                } else {
                    $diagnostics["tests"][] = ["name" => "Category count", "status" => "error", "error" => $conn->error];
                }
                
                // Test 2: Simple transaction count
                $result = $conn->query("SELECT COUNT(*) as count FROM transactions WHERE user_id = '" . $conn->real_escape_string($currentUserId) . "'");
                if ($result) {
                    $row = $result->fetch_assoc();
                    $diagnostics["tests"][] = ["name" => "Transaction count", "status" => "ok", "result" => $row['count']];
                } else {
                    $diagnostics["tests"][] = ["name" => "Transaction count", "status" => "error", "error" => $conn->error];
                }
                
                // Test 3: List categories with full details
                $result = $conn->query("SELECT * FROM categories WHERE user_id = '" . $conn->real_escape_string($currentUserId) . "' LIMIT 1");
                if ($result) {
                    $row = $result->fetch_assoc();
                    $diagnostics["tests"][] = ["name" => "Category sample", "status" => "ok", "columns" => array_keys($row ?? [])];
                } else {
                    $diagnostics["tests"][] = ["name" => "Category sample", "status" => "error", "error" => $conn->error];
                }
                
                echo json_encode($diagnostics);
        }
        elseif ($action === 'debug_data') {
                // Debug endpoint - shows all data
                if (!isset($_SESSION['user'])) {
                    http_response_code(401);
                    echo json_encode(["error" => "Not authenticated"]);
                    exit();
                }
                
                $currentUserId = $_SESSION['user']['id'];
                
                // Count transactions for current user
                $stmt = $conn->prepare("SELECT COUNT(*) as count FROM transactions WHERE user_id = ?");
                $stmt->bind_param("s", $currentUserId);
                $stmt->execute();
                $currentUserTxns = $stmt->get_result()->fetch_assoc()['count'];
                
                // Count total transactions
                $totalTxns = $conn->query("SELECT COUNT(*) as count FROM transactions")->fetch_assoc()['count'];
                
                // Count all users
                $userCount = $conn->query("SELECT COUNT(*) as count FROM users")->fetch_assoc()['count'];
                
                // Get all users (for debugging)
                $users = [];
                $userResult = $conn->query("SELECT id, username FROM users");
                while($u = $userResult->fetch_assoc()) {
                    $users[] = $u;
                }
                
                echo json_encode([
                    "currentUserId" => $currentUserId,
                    "transactionsForCurrentUser" => $currentUserTxns,
                    "totalTransactionsInDB" => $totalTxns,
                    "totalUsers" => $userCount,
                    "allUsers" => $users
                ]);
        }
        elseif ($action === 'migrate_categories') {
                // For existing users: create initial categories if they have none
                if (!isset($_SESSION['user'])) {
                    http_response_code(401);
                    echo json_encode(["error" => "Not authenticated"]);
                    exit();
                }
                
                $currentUserId = $_SESSION['user']['id'];
                
                // Check if user already has categories
                $stmt = $conn->prepare("SELECT COUNT(*) as count FROM categories WHERE user_id = ?");
                $stmt->bind_param("s", $currentUserId);
                $stmt->execute();
                $catCount = $stmt->get_result()->fetch_assoc()['count'];
                
                if ($catCount > 0) {
                    echo json_encode(["status" => "already_has_categories", "count" => $catCount]);
                    exit();
                }
                
                // Create initial categories
                $categories = [
                    ['cat_1_' . $currentUserId, 'Food & Dining', 15000, 'expense', 0],
                    ['cat_2_' . $currentUserId, 'Transportation', 5000, 'expense', 0],
                    ['cat_3_' . $currentUserId, 'Rent & Housing', 25000, 'expense', 0],
                    ['cat_4_' . $currentUserId, 'Entertainment', 8000, 'expense', 0],
                    ['cat_5_' . $currentUserId, 'Utilities', 4000, 'expense', 0],
                    ['cat_6_' . $currentUserId, 'Education', 10000, 'expense', 0],
                    ['cat_7_' . $currentUserId, 'Electronics & Appliances', 0, 'expense', 1],
                    ['inc_1_' . $currentUserId, 'Salary', 0, 'income', 0],
                    ['inc_2_' . $currentUserId, 'Freelance', 0, 'income', 0]
                ];
                
                $catStmt = $conn->prepare("INSERT INTO categories (id, user_id, name, budgetLimit, type, is_durable) VALUES (?, ?, ?, ?, ?, ?)");
                $created = 0;
                foreach ($categories as $cat) {
                    $catStmt->bind_param("sssdsi", $cat[0], $currentUserId, $cat[1], $cat[2], $cat[3], $cat[4]);
                    if ($catStmt->execute()) {
                        $created++;
                    }
                }
                
                error_log("✅ [Backend] Migrated " . $created . " categories to user: " . $currentUserId);
                echo json_encode([
                    "status" => "success", 
                    "categories_created" => $created
                ]);
        }
        
        elseif ($action === 'saving_goals') {
            $stmt = $conn->prepare("SELECT id, goal_name as goalName, target_amount as targetAmount, deadline, type, status, notes, created_at as createdAt, updated_at as updatedAt FROM saving_goals WHERE user_id = ? ORDER BY deadline ASC");
            $stmt->bind_param("s", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $out = [];
            while($row = $result->fetch_assoc()) {
                $row['targetAmount'] = (float)$row['targetAmount'];
                $out[] = $row;
            }
            echo json_encode($out);
        }
        elseif ($action === 'saving_progress') {
            $goalId = isset($_GET['goalId']) ? $_GET['goalId'] : '';
            if ($goalId) {
                $stmt = $conn->prepare("SELECT id, goal_id as goalId, month, amount_saved as amountSaved, created_at as createdAt FROM saving_progress WHERE goal_id = ? ORDER BY month DESC");
                $stmt->bind_param("s", $goalId);
            } else {
                $stmt = $conn->prepare("SELECT sp.id, sp.goal_id as goalId, sp.month, sp.amount_saved as amountSaved, sp.created_at as createdAt FROM saving_progress sp JOIN saving_goals sg ON sp.goal_id = sg.id WHERE sg.user_id = ? ORDER BY sp.month DESC");
                $stmt->bind_param("s", $userId);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            $out = [];
            while($row = $result->fetch_assoc()) {
                $row['amountSaved'] = (float)$row['amountSaved'];
                $out[] = $row;
            }
            echo json_encode($out);
        }
        elseif ($action === 'smart_suggestion') {
            // Calculate smart suggestion for saving goal
            $goalId = isset($_GET['goalId']) ? $_GET['goalId'] : null;
            
            // Get user's past 6 months data
            $sixMonthsAgo = date('Y-m-d', strtotime('-6 months'));
            
            // Calculate average income
            $stmt = $conn->prepare("SELECT SUM(amount) as totalIncome FROM transactions WHERE user_id = ? AND type = 'income' AND date >= ?");
            $stmt->bind_param("ss", $userId, $sixMonthsAgo);
            $stmt->execute();
            $incomeResult = $stmt->get_result()->fetch_assoc();
            $totalIncome = $incomeResult['totalIncome'] ?? 0;
            $avgMonthlyIncome = $totalIncome / 6;
            
            // Calculate recurring expenses (exclude irregular and durable)
            $stmt = $conn->prepare("
                SELECT SUM(t.amount) as totalExpenses 
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = ? AND t.type = 'expense' AND date >= ? 
                AND (t.expense_type = 'recurring' OR t.expense_type IS NULL)
                AND c.is_durable = 0
            ");
            $stmt->bind_param("ss", $userId, $sixMonthsAgo);
            $stmt->execute();
            $expenseResult = $stmt->get_result()->fetch_assoc();
            $totalRecurringExpenses = $expenseResult['totalExpenses'] ?? 0;
            $avgMonthlyRecurringExpenses = $totalRecurringExpenses / 6;
            
            // Calculate monthly possible savings
            $monthlyCapacity = max(0, $avgMonthlyIncome - $avgMonthlyRecurringExpenses);
            
            $suggestion = [
                "avgMonthlyIncome" => round($avgMonthlyIncome, 2),
                "avgMonthlyRecurringExpenses" => round($avgMonthlyRecurringExpenses, 2),
                "monthlyCapacity" => round($monthlyCapacity, 2),
                "dataPoints" => 6
            ];
            
            echo json_encode($suggestion);
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
            $stmt = $conn->prepare("INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, expense_type, receipt_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $receipt = isset($data['receiptPath']) ? $data['receiptPath'] : null;
            $expenseType = isset($data['expenseType']) ? $data['expenseType'] : null;
            $stmt->bind_param("sssdsssss", $data['id'], $userId, $data['categoryId'], $data['amount'], $data['description'], $data['date'], $data['type'], $expenseType, $receipt);
            
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
        } 
        elseif ($action === 'categories') {
            $isDurable = isset($data['isDurable']) ? ($data['isDurable'] ? 1 : 0) : 0;
            $stmt = $conn->prepare("INSERT INTO categories (id, name, budget_limit, type, user_id, is_durable) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssdsei", $data['id'], $data['name'], $data['budgetLimit'], $data['type'], $userId, $isDurable);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
        }
        elseif ($action === 'audits') {
            $stmt = $conn->prepare("INSERT INTO audit_logs (id, expense_id, risk_score, flag_reason, flag_date, details) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssisss", $data['id'], $data['expenseId'], $data['riskScore'], $data['flagReason'], $data['flagDate'], $data['details']);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
        }
        elseif ($action === 'saving_goals') {
            try {
                error_log("💾 [Backend] POST saving_goals: " . json_encode($data));
                error_log("👤 [Backend] User ID: " . $userId);

                $stmt = $conn->prepare("INSERT INTO saving_goals (id, user_id, goal_name, target_amount, deadline, type, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . $conn->error);
                }

                // Log the data being bound
                error_log("🔗 [Backend] Binding params: id={$data['id']}, userId={$userId}, goalName={$data['goalName']}, targetAmount={$data['targetAmount']}, deadline={$data['deadline']}, type={$data['type']}, status={$data['status']}, notes={$data['notes']}");

                // Types: s=string, d=double
                $stmt->bind_param("sssdssss", $data['id'], $userId, $data['goalName'], $data['targetAmount'], $data['deadline'], $data['type'], $data['status'], $data['notes']);
                if (!$stmt->execute()) {
                    throw new Exception("Execute failed: " . $stmt->error);
                }
                error_log("✅ [Backend] Saving goal saved: " . $data['id']);
                header('Content-Type: application/json');
                echo json_encode(["status" => "success"]);
            } catch (Exception $e) {
                error_log("❌ [Backend] Saving goals error: " . $e->getMessage());
                header('Content-Type: application/json');
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        elseif ($action === 'saving_progress') {
            try {
                error_log("💾 [Backend] POST saving_progress: " . json_encode($data));
                error_log("👤 [Backend] User ID: " . $userId);

                $stmt = $conn->prepare("INSERT INTO saving_progress (id, goal_id, month, amount_saved) VALUES (?, ?, ?, ?)");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . $conn->error);
                }

                // Log the data being bound
                error_log("🔗 [Backend] Binding params: id={$data['id']}, goalId={$data['goalId']}, month={$data['month']}, amountSaved={$data['amountSaved']}");

                // Types: s=string, d=double
                $stmt->bind_param("sssd", $data['id'], $data['goalId'], $data['month'], $data['amountSaved']);
                if (!$stmt->execute()) {
                    throw new Exception("Execute failed: " . $stmt->error);
                }
                error_log("✅ [Backend] Saving progress saved: " . $data['id']);
                header('Content-Type: application/json');
                echo json_encode(["status" => "success"]);
            } catch (Exception $e) {
                error_log("❌ [Backend] Saving progress error: " . $e->getMessage());
                header('Content-Type: application/json');
                http_response_code(500);
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        elseif ($action === 'login') {
            try {
                error_log("🔐 [Backend] Login attempt for user: " . $data['username']);
                $stmt = $conn->prepare("SELECT id, username, email, password_hash FROM users WHERE username = ?");
                if (!$stmt) {
                    throw new Exception("Prepare failed: " . $conn->error);
                }
                $stmt->bind_param("s", $data['username']);
                if (!$stmt->execute()) {
                    throw new Exception("Execute failed: " . $stmt->error);
                }
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
                        error_log("✅ [Backend] Login successful for user: " . $user['username']);
                        
                        // Manually set session cookie to ensure it's sent
                        $sessionName = session_name();
                        $sessionId = session_id();
                        setcookie($sessionName, $sessionId, [
                            'expires' => time() + 86400 * 7,
                            'path' => '/NewManagementSystem/Expense-Management-System/',
                            'domain' => 'localhost',
                            'secure' => false,
                            'httponly' => true,
                            'samesite' => 'Lax'
                        ]);
                        
                        header('Content-Type: application/json');
                        echo json_encode($user);
                        session_write_close(); // Ensure session is written
                    } else {
                        error_log("❌ [Backend] Invalid password for user: " . $data['username']);
                        http_response_code(401);
                        header('Content-Type: application/json');
                        echo json_encode(["error" => "Invalid credentials"]);
                    }
                } else {
                    error_log("❌ [Backend] User not found: " . $data['username']);
                    http_response_code(401);
                    header('Content-Type: application/json');
                    echo json_encode(["error" => "User not found"]);
                }
            } catch (Exception $e) {
                error_log("❌ [Backend] Login error: " . $e->getMessage());
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode(["error" => $e->getMessage()]);
            }
        }
        elseif ($action === 'register') {
            $userId = 'user_' . time() . '_' . rand(100, 999);
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $userId, $data['username'], $data['email'], $hashedPassword);
            if($stmt->execute()) {
                // Create initial categories for the new user
                $categories = [
                    ['cat_1_' . $userId, 'Food & Dining', 15000, 'expense', 0],
                    ['cat_2_' . $userId, 'Transportation', 5000, 'expense', 0],
                    ['cat_3_' . $userId, 'Rent & Housing', 25000, 'expense', 0],
                    ['cat_4_' . $userId, 'Entertainment', 8000, 'expense', 0],
                    ['cat_5_' . $userId, 'Utilities', 4000, 'expense', 0],
                    ['cat_6_' . $userId, 'Education', 10000, 'expense', 0],
                    ['cat_7_' . $userId, 'Electronics & Appliances', 0, 'expense', 1],
                    ['inc_1_' . $userId, 'Salary', 0, 'income', 0],
                    ['inc_2_' . $userId, 'Freelance', 0, 'income', 0]
                ];
                
                $catStmt = $conn->prepare("INSERT INTO categories (id, user_id, name, budgetLimit, type, is_durable) VALUES (?, ?, ?, ?, ?, ?)");
                foreach ($categories as $cat) {
                    $catStmt->bind_param("sssdsi", $cat[0], $userId, $cat[1], $cat[2], $cat[3], $cat[4]);
                    $catStmt->execute();
                }
                error_log("✅ [Backend] Created 9 initial categories for new user: " . $userId);
                
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
             $stmt = $conn->prepare("UPDATE transactions SET amount=?, description=?, date=?, category_id=?, expense_type=? WHERE id=? AND user_id=?");
             $expenseType = isset($data['expenseType']) ? $data['expenseType'] : null;
             $stmt->bind_param("dssssss", $data['amount'], $data['description'], $data['date'], $data['categoryId'], $expenseType, $data['id'], $userId);
             if($stmt->execute()) echo json_encode(["status" => "success"]);
        }
        elseif ($action === 'saving_goals') {
            $stmt = $conn->prepare("UPDATE saving_goals SET goal_name=?, target_amount=?, deadline=?, type=?, status=?, notes=? WHERE id=? AND user_id=?");
            $stmt->bind_param("sdsssss", $data['goalName'], $data['targetAmount'], $data['deadline'], $data['type'], $data['status'], $data['notes'], $data['id'], $userId);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
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
        elseif ($action === 'saving_goals' && $id) {
            $stmt = $conn->prepare("DELETE FROM saving_goals WHERE id=? AND user_id=?");
            $stmt->bind_param("ss", $id, $userId);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
        }
        break;
    
    default:
        http_response_code(400);
        echo json_encode(["error" => "Unknown action: " . $action]);
        break;
}

$conn->close();
?>