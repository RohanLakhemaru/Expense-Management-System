<?php
$conn = new mysqli('localhost', 'root', '', 'pinnacle_db');
$result = $conn->query('SELECT COUNT(*) as count FROM users');
echo 'Users count: ' . $result->fetch_assoc()['count'] . PHP_EOL;
$result = $conn->query('SELECT username FROM users LIMIT 5');
while($row = $result->fetch_assoc()) {
    echo 'User: ' . $row['username'] . PHP_EOL;
}
$conn->close();
?></content>
<parameter name="filePath">d:\xampp\htdocs\NewManagementSystem\Expense-Management-System\check_users.php