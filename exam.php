<?php
require __DIR__ . '/config.php';
session_start();
$pdo = db(); $msg = '';
$act = $_POST['action'] ?? $_GET['action'] ?? '';
function nowts(): string { return date('Y-m-d H:i:s'); }

function finalize(PDO $p, int $aid): void {
    $n = $p->prepare("SELECT COUNT(*) FROM attempt_items ai JOIN questions q ON q.qid=ai.qid WHERE ai.attempt_id=? AND ai.answer=q.correct");
    $n->execute([$aid]);
    $score = (int)$n->fetchColumn() * MARKS_EACH;
    $p->prepare("UPDATE attempts SET submitted_at=?, score=?, passed=? WHERE id=? AND submitted_at IS NULL")
      ->execute([nowts(), $score, $score >= PASS_MARKS ? 1 : 0, $aid]);
}
function openAttempt(PDO $p, int $sid): ?array {
    $s = $p->prepare("SELECT * FROM attempts WHERE student_id=? AND submitted_at IS NULL ORDER BY id DESC LIMIT 1");
    $s->execute([$sid]); $a = $s->fetch();
    if (!$a) return null;
    if (strtotime($a['ends_at']) <= time()) { finalize($p, (int)$a['id']); return null; }
    return $a;
}
function startAttempt(PDO $p, int $sid): void {
    // Questions this student has not seen yet come first; repeats only when the pool runs out.
    $q = $p->prepare("SELECT qid FROM questions WHERE qid NOT IN (SELECT ai.qid FROM attempt_items ai JOIN attempts a ON a.id=ai.attempt_id WHERE a.student_id=?) ORDER BY RAND() LIMIT " . QUESTIONS);
    $q->execute([$sid]); $ids = $q->fetchAll(PDO::FETCH_COLUMN);
    if (count($ids) < QUESTIONS) {
        $o = $p->prepare("SELECT ai.qid FROM attempt_items ai JOIN attempts a ON a.id=ai.attempt_id WHERE a.student_id=? GROUP BY ai.qid ORDER BY MAX(a.started_at) ASC, RAND() LIMIT " . (QUESTIONS - count($ids)));
        $o->execute([$sid]); $ids = array_merge($ids, $o->fetchAll(PDO::FETCH_COLUMN));
    }
    if (count($ids) < QUESTIONS) throw new RuntimeException('Not enough questions in the bank.');
    shuffle($ids);
    $in = implode(',', array_fill(0, count($ids), '?'));
    $f = $p->prepare("SELECT qid, flags FROM questions WHERE qid IN ($in)"); $f->execute($ids);
    $flags = $f->fetchAll(PDO::FETCH_KEY_PAIR);
    $p->beginTransaction();
    $p->prepare("INSERT INTO attempts (student_id, started_at, ends_at) VALUES (?,?,?)")
      ->execute([$sid, nowts(), date('Y-m-d H:i:s', time() + EXAM_MINUTES * 60)]);
    $aid = (int)$p->lastInsertId();
    $ins = $p->prepare("INSERT INTO attempt_items (attempt_id, pos, qid, opt_order) VALUES (?,?,?,?)");
    foreach ($ids as $i => $qid) {
        $anch = strpos((string)($flags[$qid] ?? ''), 'ANCHORED') !== false;   // "both/none of the above" keep their order
        $ins->execute([$aid, $i + 1, $qid, $anch ? 'ABCD' : str_shuffle('ABCD')]);
    }
    $p->commit();
}

if ($act === 'logout') { session_destroy(); header('Location: login.php'); exit; }
$sid = $_SESSION['sid'] ?? 0; $stu = null;
if ($sid) {
    $s = $pdo->prepare("SELECT * FROM students WHERE id=? AND status='Approved'"); $s->execute([$sid]); $stu = $s->fetch();
    if (!$stu) { session_destroy(); }
}
if (!$stu) { header('Location: login.php'); exit; }
if ($stu) {
    if ($act === 'start') { if (!openAttempt($pdo, $sid)) startAttempt($pdo, $sid); header('Location: exam.php'); exit; }
    if ($act === 'save') {
        header('Content-Type: application/json'); $a = openAttempt($pdo, $sid);
        $ans = $_POST['answer'] ?? '';
        if ($a && preg_match('/^[ABCD]$/', $ans)) $pdo->prepare("UPDATE attempt_items SET answer=? WHERE attempt_id=? AND pos=?")->execute([$ans, $a['id'], (int)($_POST['pos'] ?? 0)]);
        echo json_encode(['ok' => (bool)$a]); exit;
    }
    if ($act === 'submit') {
        $a = openAttempt($pdo, $sid);
        if ($a) {
            $u = $pdo->prepare("UPDATE attempt_items SET answer=? WHERE attempt_id=? AND pos=?");
            foreach ((array)($_POST['q'] ?? []) as $pos => $ans) if (preg_match('/^[ABCD]$/', (string)$ans)) $u->execute([$ans, $a['id'], (int)$pos]);
            finalize($pdo, (int)$a['id']);
        }
        header('Location: exam.php'); exit;
    }
}
$open = $stu ? openAttempt($pdo, $sid) : null;
$last = null;
if ($stu && !$open) { $s = $pdo->prepare("SELECT * FROM attempts WHERE student_id=? AND submitted_at IS NOT NULL ORDER BY id DESC LIMIT 1"); $s->execute([$sid]); $last = $s->fetch(); }
?><!DOCTYPE html>
<html lang="ne"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LearnWithSulav - परीक्षा पोर्टल</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0B192C;--card:#1E3E62;--acc:#FF6500;--txt:#F1F5F9;--mut:#94A3B8;--ok:#10B981}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:19px/1.75 'Noto Sans Devanagari',Arial,sans-serif;padding:16px}
.box{max-width:820px;margin:0 auto;background:var(--card);border-radius:14px;padding:24px}
h2{color:var(--acc);margin:0 0 8px}input[type=text],input[type=password]{width:100%;padding:14px;font-size:20px;border-radius:8px;border:1px solid #475569;background:#0B192C;color:#fff;margin:8px 0 14px}
button,.btn{background:var(--acc);color:#fff;border:0;border-radius:8px;padding:13px 22px;font:700 18px inherit;cursor:pointer}button:disabled{opacity:.4}
.err{color:#FCA5A5;margin:8px 0}.bar{position:sticky;top:0;background:var(--card);padding:10px 0;display:flex;justify-content:space-between;align-items:center;z-index:5;border-bottom:1px solid #334e73}
#t{font-size:24px;font-weight:700;color:var(--acc)}.q{margin:22px 0;padding-bottom:10px;border-bottom:1px solid #334e73}.qt{font-weight:600;font-size:21px;margin:0 0 10px}
.opt{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;margin:8px 0;border-radius:10px;background:#0B192C;cursor:pointer}.opt:has(input:checked){outline:2px solid var(--acc)}.opt input{margin-top:9px;transform:scale(1.4)}
.nav{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.nav button{background:#0B192C;padding:8px 16px}.nav .on{background:var(--acc)}.nav .done{border:2px solid var(--ok)}
.row{display:flex;justify-content:space-between;gap:10px;margin-top:16px}.score{font-size:46px;font-weight:700;color:var(--ok)}
</style></head><body><div class="box">
<?php if (!$open): ?>
  <h2>नमस्ते, <?= h($stu['name']) ?></h2>
  <?php if ($last): $ok = (int)$last['passed'] === 1; ?>
    <p>पछिल्लो नतिजा:</p><div class="score"><?= (int)$last['score'] ?> / <?= QUESTIONS * MARKS_EACH ?></div>
    <p><?= $ok ? '🎉 बधाई छ, तपाईं उत्तीर्ण हुनुभयो!' : 'हार नमान्नुहोस्! अलि अझै अभ्यास गर्नुहोस्, अर्को प्रयासमा अवश्य सफल हुनुहुन्छ। शुभकामना!' ?></p>
  <?php endif; ?>
  <p>परीक्षा: <?= QUESTIONS ?> प्रश्न, प्रत्येक सही उत्तरको <?= MARKS_EACH ?> अंक, समय <?= EXAM_MINUTES ?> मिनेट। उत्तीर्ण अंक: <?= PASS_MARKS ?>।</p>
  <form method="post"><input type="hidden" name="action" value="start"><button><?= $last ? 'नयाँ परीक्षा सुरु गर्नुहोस्' : 'परीक्षा सुरु गर्नुहोस्' ?></button></form>
  <p><a href="?action=logout" style="color:var(--mut)">Logout</a></p>
<?php else:
  $it = $pdo->prepare("SELECT ai.pos, ai.opt_order, ai.answer, q.question, q.option_a, q.option_b, q.option_c, q.option_d FROM attempt_items ai JOIN questions q ON q.qid=ai.qid WHERE ai.attempt_id=? ORDER BY ai.pos");
  $it->execute([$open['id']]); $items = $it->fetchAll(); $pages = array_chunk($items, PER_PAGE); $remain = max(0, strtotime($open['ends_at']) - time()); ?>
  <div class="bar"><b>LearnWithSulav</b><span id="t">--:--</span></div>
  <form id="f" method="post"><input type="hidden" name="action" value="submit">
  <?php foreach ($pages as $pi => $chunk): ?><section class="page" <?= $pi ? 'hidden' : '' ?>>
    <?php foreach ($chunk as $r): ?><div class="q"><p class="qt"><?= (int)$r['pos'] ?>. <?= h($r['question']) ?></p>
      <?php foreach (str_split($r['opt_order']) as $k => $key): ?>
      <label class="opt"><input type="radio" name="q[<?= (int)$r['pos'] ?>]" value="<?= $key ?>" <?= $r['answer'] === $key ? 'checked' : '' ?>><span><b><?= chr(65 + $k) ?>.</b> <?= h($r['option_' . strtolower($key)]) ?></span></label>
      <?php endforeach; ?></div>
    <?php endforeach; ?></section>
  <?php endforeach; ?>
  <div class="nav"><?php foreach ($pages as $pi => $_): ?><button type="button" data-go="<?= $pi ?>"><?= $pi + 1 ?></button><?php endforeach; ?></div>
  <div class="row"><button type="button" id="prev">← अघिल्लो</button><button type="button" id="next">अर्को →</button><button id="sub" hidden>परीक्षा बुझाउनुहोस्</button></div>
  </form>
  <script>
  const F=document.getElementById('f'),P=[...F.querySelectorAll('.page')],N=[...document.querySelectorAll('[data-go]')];let cur=0,end=Date.now()+<?= $remain ?>*1000;
  function go(n){cur=Math.max(0,Math.min(P.length-1,n));P.forEach((p,i)=>p.hidden=i!==cur);N.forEach((b,i)=>b.classList.toggle('on',i===cur));prev.disabled=cur===0;next.hidden=cur===P.length-1;sub.hidden=cur!==P.length-1;scrollTo(0,0)}
  function mark(){P.forEach((p,i)=>N[i].classList.toggle('done',[...p.querySelectorAll('.q')].every(q=>q.querySelector('input:checked'))))}
  N.forEach((b,i)=>b.onclick=()=>go(i));prev.onclick=()=>go(cur-1);next.onclick=()=>go(cur+1);
  F.addEventListener('change',e=>{if(e.target.type!=='radio')return;const d=new FormData();d.append('pos',e.target.name.match(/\d+/)[0]);d.append('answer',e.target.value);fetch('exam.php?action=save',{method:'POST',body:d});mark()});
  F.addEventListener('submit',e=>{const left=F.querySelectorAll('.q').length-F.querySelectorAll('input:checked').length;if(!confirm(left?left+' प्रश्न बाँकी छन्। बुझाउने हो?':'परीक्षा बुझाउने हो?'))e.preventDefault()});
  setInterval(()=>{const s=Math.max(0,Math.round((end-Date.now())/1000));t.textContent=Math.floor(s/3600)+':'+String(Math.floor(s/60)%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0');if(s<=0){F.onsubmit=null;F.submit()}},500);
  go(0);mark();
  </script>
<?php endif; ?>
</div></body></html>
