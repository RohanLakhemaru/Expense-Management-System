<?php
require_once __DIR__ . '/api/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'GET':
        if ($action === 'categories') {
            $result = $conn->query("SELECT id, name, budget_limit as budgetLimit, type FROM categories");
            $out = [];
            while($row = $result->fetch_assoc()) {
                $row['budgetLimit'] = (float)$row['budgetLimit'];
                $out[] = $row;
            }
            echo json_encode($out);
        } 
        elseif ($action === 'transactions') {
            $result = $conn->query("SELECT id, user_id as userId, category_id as categoryId, amount, description, date, type, receipt_path as receiptPath, created_at as createdAt FROM transactions ORDER BY date DESC");
            $out = [];
            while($row = $result->fetch_assoc()) {
                $row['amount'] = (float)$row['amount'];
                $out[] = $row;
            }
            echo json_encode($out);
        }
        elseif ($action === 'audits') {
            $result = $conn->query("SELECT id, expense_id as expenseId, risk_score as riskScore, flag_reason as flagReason, flag_date as flagDate, details FROM audit_logs ORDER BY risk_score DESC");
            $out = [];
            while($row = $result->fetch_assoc()) {
                $row['riskScore'] = (int)$row['riskScore'];
                $out[] = $row;
            }
            echo json_encode($out);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        
        if ($action === 'transactions') {
            $stmt = $conn->prepare("INSERT INTO transactions (id, user_id, category_id, amount, description, date, type, receipt_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $receipt = isset($data['receiptPath']) ? $data['receiptPath'] : null;
            $stmt->bind_param("ssssssss", $data['id'], $data['userId'], $data['categoryId'], $data['amount'], $data['description'], $data['date'], $data['type'], $receipt);
            
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
        } 
        elseif ($action === 'categories') {
            $stmt = $conn->prepare("INSERT INTO categories (id, name, budget_limit, type) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssds", $data['id'], $data['name'], $data['budgetLimit'], $data['type']);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
        }
        elseif ($action === 'audits') {
            $stmt = $conn->prepare("INSERT INTO audit_logs (id, expense_id, risk_score, flag_reason, flag_date, details) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssisss", $data['id'], $data['expenseId'], $data['riskScore'], $data['flagReason'], $data['flagDate'], $data['details']);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
            else http_response_code(500);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        
        if ($action === 'categories') {
            $stmt = $conn->prepare("UPDATE categories SET budget_limit = ? WHERE id = ?");
            $stmt->bind_param("ds", $data['budgetLimit'], $data['id']);
            if($stmt->execute()) echo json_encode(["status" => "success"]);
        }
        elseif ($action === 'transactions') {
             $stmt = $conn->prepare("UPDATE transactions SET amount=?, description=?, date=?, category_id=? WHERE id=?");
             $stmt->bind_param("dssss", $data['amount'], $data['description'], $data['date'], $data['categoryId'], $data['id']);
             if($stmt->execute()) echo json_encode(["status" => "success"]);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? $_GET['id'] : '';
        if ($action === 'transactions' && $id) {
             $stmt = $conn->prepare("DELETE FROM transactions WHERE id=?");
             $stmt->bind_param("s", $id);
             if($stmt->execute()) echo json_encode(["status" => "success"]);
        }
        break;
}

$conn->close();
?>