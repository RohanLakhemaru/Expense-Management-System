<?php
require_once __DIR__ . '/api/db_connect.php';

echo json_encode([
    "categories_columns" => getTableColumns($conn, "categories"),
    "transactions_columns" => getTableColumns($conn, "transactions"),
    "audit_logs_columns" => getTableColumns($conn, "audit_logs"),
], JSON_PRETTY_PRINT);

function getTableColumns($conn, $table) {
    $result = $conn->query("DESCRIBE $table");
    if (!$result) {
        return ["error" => $conn->error];
    }
    $columns = [];
    while ($row = $result->fetch_assoc()) {
        $columns[] = [
            "name" => $row['Field'],
            "type" => $row['Type'],
            "null" => $row['Null'],
            "key" => $row['Key'],
            "default" => $row['Default']
        ];
    }
    return $columns;
}
?>
