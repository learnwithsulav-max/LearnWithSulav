<?php
require __DIR__ . '/config.php';
$free = date('Y-m-d') <= FREE_UNTIL;   // free period: no payment needed, PIN issued immediately
$types = ['Life' => 'जीवन बीमा (Life)', 'Non-Life' => 'निर्जीवन बीमा (Non-Life)', 'Micro-Life' => 'लघु जीवन बीमा (Micro-Life)', 'Micro-Non-Life' => 'लघु निर्जीवन बीमा (Micro-Non-Life)', 'Reinsurance' => 'पुनर्बीमा (Reinsurance)'];
$companies = [
 'Life' => ['Rastriya Jeevan Beema Company Limited','National Life Insurance Company Limited','Nepal Life Insurance Company Limited','Prabhu Mahalaxmi Life Insurance Limited','Life Insurance Corporation (Nepal) Limited','MetLife (ALICO)','SuryaJyoti Life Insurance Company Limited','Himalayan Life Insurance Limited','Asian Life Insurance Company Limited','IME Life Insurance Company Limited','Reliable Nepal Life Insurance Company Limited','Sanima Reliance Life Insurance Limited','Citizen Life Insurance Limited','Sun Nepal Life Insurance Company Limited'],
 'Non-Life' => ['Nepal Insurance Company Limited','The Oriental Insurance Company Limited','National Insurance Company Limited','Himalayan Everest Insurance Company Limited','United Ajod Insurance Company Limited','Neco Insurance Limited','Sagarmatha Lumbini Insurance Company Limited','Prabhu Insurance Limited','IGI Prudential Insurance Limited','Shikhar Insurance Company Limited','NLG Insurance Limited','Siddhartha Premier Insurance Limited','Rastriya Beema Company Limited','Sanima GIC Insurance Limited'],
 'Reinsurance' => ['Nepal Reinsurance Company Limited','Himalayan Reinsurance Limited'],
 'Micro-Life' => ['Crest Micro Life Insurance Limited','Guardian Micro Life Insurance Limited','Liberty Micro Life Insurance Limited'],
 'Micro-Non-Life' => ['Nepal Micro Insurance Company Limited','Protective Insurance Company Limited','Star Micro Insurance Company Limited','Trust Micro Insurance Company Limited'],
];
$provinces = ['Koshi Province','Madhesh Province','Bagmati Province','Gandaki Province','Lumbini Province','Karnali Province','Sudurpashchim Province'];
$msg = ''; $done = null; $v = $_POST;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pdo = db();
    $name = trim($v['name'] ?? ''); $phone = substr(preg_replace('/\D/', '', $v['phone'] ?? ''), -10);
    $email = trim($v['email'] ?? ''); $type = $v['type'] ?? ''; $company = $v['company'] ?? ''; $branch = $v['branch'] ?? '';
    $txn = trim($v['txn'] ?? '');
    do {
        if ($name === '' || strlen($phone) !== 10 || !filter_var($email, FILTER_VALIDATE_EMAIL) || !isset($companies[$type])
            || !in_array($company, $companies[$type], true) || !in_array($branch, $provinces, true)) { $msg = 'कृपया सबै विवरण सही भर्नुहोस्।'; break; }
        $s = $pdo->prepare("SELECT 1 FROM students WHERE phone=?"); $s->execute([$phone]);
        if ($s->fetch()) { $msg = 'यो मोबाइल नम्बर पहिले नै दर्ता भइसकेको छ। कृपया Login गर्नुहोस्।'; break; }
        $shot = null;
        if (!$free) {
            if (!preg_match('/^[A-Za-z0-9]{6,30}$/', $txn)) { $msg = 'Transaction ID सही लेख्नुहोस्।'; break; }
            $s = $pdo->prepare("SELECT 1 FROM students WHERE txn_id=?"); $s->execute([$txn]);
            if ($s->fetch()) { $msg = 'यो Transaction ID पहिले नै प्रयोग भइसकेको छ।'; break; }
            $f = $_FILES['shot'] ?? null; $info = ($f && $f['error'] === UPLOAD_ERR_OK && $f['size'] <= 3 * 1024 * 1024) ? @getimagesize($f['tmp_name']) : false;
            $ext = $info ? ([IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'][$info[2]] ?? null) : null;
            if (!$ext) { $msg = 'भुक्तानीको रसिद (JPG/PNG, ३MB सम्म) अपलोड गर्नुहोस्।'; break; }
            if (!is_dir(__DIR__ . '/uploads')) { mkdir(__DIR__ . '/uploads', 0755); file_put_contents(__DIR__ . '/uploads/.htaccess', "Options -Indexes\n"); }
            $shot = 'uploads/' . bin2hex(random_bytes(12)) . '.' . $ext;
            move_uploaded_file($f['tmp_name'], __DIR__ . '/' . $shot);
        }
        $pin = (string)random_int(1000, 9999);
        $pdo->prepare("INSERT INTO students (name, phone, email, insurance_type, company, branch, txn_id, screenshot, pin, status) VALUES (?,?,?,?,?,?,?,?,?,?)")
            ->execute([$name, $phone, $email, $type, $company, $branch, $free ? null : $txn, $shot, $pin, $free ? 'Approved' : 'Pending']);
        if ($free) @mail($email, 'LearnWithSulav - Access PIN', "नमस्ते $name,\nतपाईंको Access PIN: $pin\nLogin: https://" . $_SERVER['HTTP_HOST'] . "/login.php", "From: noreply@" . $_SERVER['HTTP_HOST'] . "\r\nContent-Type: text/plain; charset=UTF-8");
        $done = ['pin' => $pin, 'free' => $free];
    } while (false);
}
?><!DOCTYPE html>
<html lang="ne"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>दर्ता - LearnWithSulav</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css"></head><body>
<div class="box">
<?php if ($done): ?>
  <h2>दर्ता सफल भयो!</h2>
  <?php if ($done['free']): ?>
    <p>तपाईंको Access PIN (यो सुरक्षित राख्नुहोस्; इमेलमा पनि पठाइएको छ):</p>
    <div class="pin"><?= h($done['pin']) ?></div>
    <a class="btn" style="display:block;text-align:center;text-decoration:none" href="login.php">Login गर्नुहोस्</a>
  <?php else: ?>
    <p>तपाईंको भुक्तानी जाँचका लागि पठाइयो। एडमिनले स्वीकृत गरेपछि Access PIN इमेलमा आउँछ।</p>
  <?php endif; ?>
<?php else: ?>
  <h2>दर्ता फारम</h2>
  <p class="sub">नेपाल बीमा प्राधिकरण अभिकर्ता परीक्षा अभ्यास पोर्टल</p>
  <?php if ($free): ?><div class="note">पहिलो १ महिना निःशुल्क: भुक्तानी चाहिँदैन, दर्ता गर्नासाथ PIN पाइन्छ।</div><?php endif; ?>
  <form method="post" enctype="multipart/form-data">
    <label>पूरा नाम</label><input type="text" name="name" value="<?= h($v['name'] ?? '') ?>" required>
    <label>मोबाइल / WhatsApp नम्बर</label><input type="text" name="phone" inputmode="numeric" value="<?= h($v['phone'] ?? '') ?>" required>
    <label>इमेल</label><input type="email" name="email" value="<?= h($v['email'] ?? '') ?>" required>
    <label>बीमा प्रकार</label>
    <select name="type" id="type" required><option value="">-- छान्नुहोस् --</option>
      <?php foreach ($types as $k => $t): ?><option value="<?= h($k) ?>" <?= ($v['type'] ?? '') === $k ? 'selected' : '' ?>><?= h($t) ?></option><?php endforeach; ?></select>
    <label>बीमा कम्पनी</label><select name="company" id="company" required><option value="">-- पहिले बीमा प्रकार छान्नुहोस् --</option></select>
    <label>प्रदेश / शाखा</label>
    <select name="branch" required><option value="">-- छान्नुहोस् --</option>
      <?php foreach ($provinces as $p): ?><option <?= ($v['branch'] ?? '') === $p ? 'selected' : '' ?>><?= h($p) ?></option><?php endforeach; ?></select>
    <?php if (!$free): ?>
      <label>भुक्तानीको रसिद (Screenshot)</label><input type="file" name="shot" accept="image/*" required>
      <label>Transaction ID</label><input type="text" name="txn" value="<?= h($v['txn'] ?? '') ?>" required>
    <?php endif; ?>
    <?php if ($msg): ?><div class="err"><?= h($msg) ?></div><?php endif; ?>
    <button class="btn">दर्ता बुझाउनुहोस्</button>
  </form>
  <p class="alt">पहिले नै दर्ता गर्नुभएको छ? <a class="lnk" href="login.php">Login</a> &middot; <a class="lnk" href="index.html">गृहपृष्ठ</a></p>
  <script>
  const C = <?= json_encode($companies, JSON_UNESCAPED_UNICODE) ?>, want = <?= json_encode($v['company'] ?? '') ?>;
  const t = document.getElementById('type'), c = document.getElementById('company');
  function fill() { c.innerHTML = '<option value="">-- बीमा कम्पनी छान्नुहोस् --</option>' + (C[t.value] || []).map(n => `<option ${n === want ? 'selected' : ''}>${n}</option>`).join(''); }
  t.addEventListener('change', fill); fill();
  </script>
<?php endif; ?>
</div></body></html>
