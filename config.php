<?php
// Fill these from your hosting control panel (MySQL Databases section).
const DB_HOST = 'localhost';
const DB_NAME = 'CHANGE_ME';
const DB_USER = 'CHANGE_ME';
const DB_PASS = 'CHANGE_ME';

// Exam rules
const EXAM_MINUTES = 90;
const QUESTIONS    = 50;
const MARKS_EACH   = 2;
const PASS_MARKS   = 50;   // 50 marks or more = pass
const PER_PAGE     = 10;   // questions per page (50 / 10 = 5 pages)

// Free period: registrations until this date (YYYY-MM-DD) need no payment and are approved instantly.
// After it, register.php asks for a receipt + Transaction ID and the student waits for approval.
const FREE_UNTIL   = '2026-11-04';

date_default_timezone_set('Asia/Kathmandu');

function db(): PDO {
    static $p = null;
    if (!$p) {
        $p = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $p;
}
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
