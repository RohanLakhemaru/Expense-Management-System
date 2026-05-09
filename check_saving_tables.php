<?php
$conn = new mysqli('localhost', 'root', '', 'pinnacle_db');
if ($conn->connect_error) die('Connection failed: ' . $conn->connect_error);

echo 'Saving goals count: ' . $conn->query('SELECT COUNT(*) as count FROM saving_goals')->fetch_assoc()['count'] . PHP_EOL;
echo 'Saving progress count: ' . $conn->query('SELECT COUNT(*) as count FROM saving_progress')->fetch_assoc()['count'] . PHP_EOL;

$result = $conn->query('SELECT * FROM saving_goals LIMIT 5');
if ($result->num_rows > 0) {
    echo 'Sample saving goals:' . PHP_EOL;
    while($row = $result->fetch_assoc()) {
        echo '  ' . json_encode($row) . PHP_EOL;
    }
} else {
    echo 'No saving goals found' . PHP_EOL;
}

$result = $conn->query('SELECT * FROM saving_progress LIMIT 5');
if ($result->num_rows > 0) {
    echo 'Sample saving progress:' . PHP_EOL;
    while($row = $result->fetch_assoc()) {
        echo '  ' . json_encode($row) . PHP_EOL;
    }
} else {
    echo 'No saving progress found' . PHP_EOL;
}

$conn->close();
?></content>
<parameter name="filePath">d:\xampp\htdocs\NewManagementSystem\Expense-Management-System\check_saving_tables.php