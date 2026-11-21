import sqlite3
import json
import os
from datetime import datetime

db_path = r'c:\Users\user\OneDrive\Desktop\Ali Metin\data\app.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

# Ensure Muhammed Talha exists in users and students
conn.execute("""
INSERT OR REPLACE INTO users (id, email, password, name, role)
VALUES ('student_muhammed_talha', 'muhammedtalha@matematikakademi.internal', 'hash', 'Muhammed Talha', 'student')
""")

conn.execute("""
INSERT OR REPLACE INTO students (id, user_id, teacher_id, grade, school, status)
VALUES ('student_muhammed_talha', 'student_muhammed_talha', '170c1e8f-52b4-440e-b605-ec974fa1d56b', 8, 'Atatürk Ortaokulu', 'active')
""")

# 1. Exam 1: LGS Sayısal Matematik Konu Tarama Denemesi
exam_id_1 = 'exam_lgs_sample_2'
exam_title_1 = 'LGS Sayısal Matematik Konu Tarama Denemesi'
res_id_1 = f'result_{exam_id_1}_student_muhammed_talha'
sess_id_1 = f'sess_{exam_id_1}_student_muhammed_talha'

conn.execute("""
INSERT OR REPLACE INTO exams (id, title, teacher_id, question_count, duration_minutes, status, created_at)
VALUES (?, ?, '170c1e8f-52b4-440e-b605-ec974fa1d56b', 20, 40, 'active', datetime('now', '-2 hours'))
""", (exam_id_1, exam_title_1))

conn.execute("""
INSERT OR REPLACE INTO exam_assignments (id, exam_id, student_id, assigned_by, status, duration_min, assigned_at, due_at)
VALUES (?, ?, 'student_muhammed_talha', 'system', 'completed', 40, datetime('now', '-3 hours'), datetime('now', '-1 hour'))
""", (f'assign_{exam_id_1}_student_muhammed_talha', exam_id_1))

conn.execute("""
INSERT OR REPLACE INTO exam_sessions (id, exam_id, student_id, started_at, deadline, submitted_at, current_q)
VALUES (?, ?, 'student_muhammed_talha', datetime('now', '-2 hours'), datetime('now', '-1 hour'), datetime('now', '-80 minutes'), 20)
""", (sess_id_1, exam_id_1))

conn.execute("""
INSERT OR REPLACE INTO exam_results (id, exam_id, student_id, correct_count, wrong_count, blank_count, net_score, total_duration_seconds, created_at, completed_at)
VALUES (?, ?, 'student_muhammed_talha', 14, 4, 2, 12.67, 1920, datetime('now', '-80 minutes'), datetime('now', '-80 minutes'))
""", (res_id_1, exam_id_1))

# Delete old answers for this result if any
conn.execute("DELETE FROM exam_answers WHERE session_id = ? OR exam_result_id = ?", (sess_id_1, res_id_1))

# Sample 20 questions for exam 1
questions_exam1 = [
    (1, "Bir marangoz uzunlukları 144 cm ve 180 cm olan iki tahta çıtayı hiç parça artmayacak şekilde eşit uzunlukta en büyük parçalara ayırmak istiyor...", "B", "B", 1, "Çarpanlar ve Katlar"),
    (2, "Aşağıda üzerlerinde 1'den 20'ye kadar tam sayıların yazılı olduğu 20 adet kart verilmiştir...", "D", "D", 1, "Çarpanlar ve Katlar"),
    (3, "Bir çiftçi yaptırdığı toprak analizi sonucunda tarlasının ihtiyacı olan azot miktarını belirliyor...", "B", "B", 1, "Çarpanlar ve Katlar"),
    (4, "Uzunluğu 360 cm ile 400 cm arasında olan AB doğru parçası verilmiştir...", "C", "A", 0, "Çarpanlar ve Katlar"), # Yanlış
    (5, "Kare dik prizma şeklindeki koliler üst üste konularak soğuk hava deposuna yerleştirilmektedir...", "B", "B", 1, "Çarpanlar ve Katlar"),
    (6, "Bir toplantı salonuna koltuklar yerleştirilmiştir...", "B", "B", 1, "Çarpanlar ve Katlar"),
    (7, "Belediye görevlileri kaldırımlara sarı renkli kabartmalı taşlar yerleştirmiştir...", "C", "D", 0, "Çarpanlar ve Katlar"), # Yanlış
    (8, "Merdivenlerin basamaklarının yüksekliği belli standartlara göre yapılmaktadır...", "C", "C", 1, "Çarpanlar ve Katlar"),
    (9, "Laboratuvar ortamındaki bir bakteri türünün sayısı her 20 dakikada bir 2 katına çıkmaktadır...", "A", "A", 1, "Üslü İfadeler"),
    (10, "Güneş sistemi içerisindeki bir uzay sondasının bilimsel gösterimi...", "C", "C", 1, "Üslü İfadeler"),
    (11, "Bir kenar uzunluğu 8^4 mm olan kare biçimindeki levha 4 eş parçaya bölünmüştür...", "B", "C", 0, "Üslü İfadeler"), # Yanlış
    (12, "4a² - 12ab + 9b² ifadesi bir tam kare açılımıdır...", "D", "D", 1, "Cebirsel İfadeler"),
    (13, "Koordinat sisteminde A(2, 5) ve B(6, 13) noktalarından geçen doğrunun eğimi...", "A", "A", 1, "Doğrusal Denklemler"),
    (14, "Bir su deposunda başlangıçta 120 litre su vardır...", "C", "C", 1, "Doğrusal Denklemler"),
    (15, "Kenar uzunluğu (3x + 4) cm olan kare şeklindeki panodan 4 adet kare çıkarılıyor...", "B", "B", 1, "Cebirsel İfadeler"),
    (16, "3(x - 2) ≤ 2x + 5 eşitsizliğini sağlayan en büyük tam sayı...", "D", "D", 1, "Eşitsizlikler"),
    (17, "ABC üçgeninde |AB| = 7 cm ve |AC| = 12 cm olduğuna göre [BC] kenarı...", "A", "B", 0, "Üçgenler"), # Yanlış
    (18, "Hipotenüs uzunluğu 25 cm ve dik kenarlarından biri 15 cm olan dik üçgen...", "C", "C", 1, "Üçgenler"),
    (19, "Benzerlik oranı 2/3 olan iki benzer çokgenden küçüğünün alanı 36 cm²...", "B", None, None, "Eşlik ve Benzerlik"), # Boş
    (20, "Taban yarıçapı 4 cm ve yüksekliği 10 cm olan silindirin yanal alanı...", "D", None, None, "Geometrik Cisimler") # Boş
]

for q_no, q_text, c_ans, s_ans, is_corr, top in questions_exam1:
    ans_id = f'ans_{res_id_1}_{q_no}'
    opts = json.dumps({"A": "Seçenek A", "B": "Seçenek B", "C": "Seçenek C", "D": "Seçenek D"})
    conn.execute("""
    INSERT INTO exam_answers (
      id, session_id, exam_result_id, question_no, student_answer, answer, is_correct,
      question_text, options_json, correct_answer, topic_name, solution_explanation, duration_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ans_id, sess_id_1, res_id_1, q_no, s_ans, s_ans, is_corr,
        q_text, opts, c_ans, top, f"{top} kuralı uygulanır. Doğru cevap {c_ans} seçeneğidir.", 95
    ))

    # Yanlış soruları smart_mistake_analyses ve questions tablosuna ekle
    if is_corr == 0:
        mistake_id = f'sma_talha_exam1_q{q_no}'
        conn.execute("""
        INSERT OR REPLACE INTO smart_mistake_analyses (
          id, student_id, question_id, exam_id, topic_id, student_answer, correct_answer,
          primary_error_type, ai_probability, ai_reasoning_explanation, teacher_note, verified_by_teacher, created_at
        ) VALUES (?, 'student_muhammed_talha', ?, ?, 'top_carpanlar_katlar', ?, ?, 'dikkat_eksikligi', 0.88, ?, ?, 1, datetime('now', '-80 minutes'))
        """, (
            mistake_id, ans_id, exam_id_1, s_ans, c_ans,
            f"{top} konusunda doğru yanıt {c_ans} iken {s_ans} işaretlendi. Çözüm adımlarını tekrar inceleyiniz.",
            f"Deneme: {exam_title_1} (Soru {q_no})"
        ))

        conn.execute("""
        INSERT OR REPLACE INTO questions (
          id, student_id, question_number, difficulty, question_type,
          correct_answer, student_answer, solution, teacher_note, student_note, learning_status, created_at, updated_at
        ) VALUES (?, 'student_muhammed_talha', ?, 'medium', 'wrong', ?, ?, ?, ?, ?, 'new', datetime('now', '-80 minutes'), datetime('now', '-80 minutes'))
        """, (
            f'wrong_talha_exam1_q{q_no}', q_no, c_ans, s_ans,
            f"{top} sorusunda doğru seçenek {c_ans}'dir.",
            f"Deneme Sınavı: {exam_title_1}",
            q_text
        ))

# Post exam eval for exam 1
conn.execute("""
INSERT OR REPLACE INTO post_exam_evaluations (
  id, exam_id, student_id, teacher_id, summary_json, topics_json, difficulty_json,
  strengths_text, priorities_text, study_recommendations, ai_evaluation_text,
  teacher_approved, approved_at, created_at, updated_at
) VALUES (?, ?, 'student_muhammed_talha', '170c1e8f-52b4-440e-b605-ec974fa1d56b', ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now', '-80 minutes'), datetime('now', '-80 minutes'))
""", (
    f'eval_{exam_id_1}_student_muhammed_talha', exam_id_1,
    json.dumps({"correct": 14, "wrong": 4, "empty": 2, "net": 12.67, "score": 70, "timeSpentMinutes": 32, "totalDuration": 40}),
    json.dumps([
        {"topic": "Çarpanlar ve Katlar", "total": 8, "correct": 6, "wrong": 2, "empty": 0, "net": 5.33, "accuracy": 75},
        {"topic": "Üslü İfadeler", "total": 3, "correct": 2, "wrong": 1, "empty": 0, "net": 1.67, "accuracy": 67},
        {"topic": "Cebirsel İfadeler", "total": 2, "correct": 2, "wrong": 0, "empty": 0, "net": 2.0, "accuracy": 100},
        {"topic": "Doğrusal Denklemler", "total": 2, "correct": 2, "wrong": 0, "empty": 0, "net": 2.0, "accuracy": 100},
        {"topic": "Eşitsizlikler", "total": 1, "correct": 1, "wrong": 0, "empty": 0, "net": 1.0, "accuracy": 100},
        {"topic": "Üçgenler", "total": 2, "correct": 1, "wrong": 1, "empty": 0, "net": 0.67, "accuracy": 50},
        {"topic": "Eşlik ve Benzerlik", "total": 1, "correct": 0, "wrong": 0, "empty": 1, "net": 0.0, "accuracy": 0},
        {"topic": "Geometrik Cisimler", "total": 1, "correct": 0, "wrong": 0, "empty": 1, "net": 0.0, "accuracy": 0}
    ]),
    json.dumps({"easy": {"total": 6, "correct": 6, "accuracy": 100}, "medium": {"total": 10, "correct": 7, "accuracy": 70}, "hard": {"total": 4, "correct": 1, "accuracy": 25}}),
    "Cebirsel ifadeler, doğrusal denklemler ve temel EBOB-EKOK sorularında yüksek doğruluk sağlandı.",
    "Şekilli üçgen eşitsizliği ve üslü sayılarda bölme işlemlerinde dikkat hataları giderilmeli.",
    "Özellikle 4. ve 17. sorulardaki soru köküne dikkat edilerek benzer yeni nesil sorular çözülmelidir.",
    "Muhammed Talha, 20 soruluk LGS Sayısal Matematik denemesini 12.67 net ile başarıyla tamamladı. 14 doğru, 4 yanlış ve 2 boş bulunmaktadır."
))

# 2. Exam 2: Bana Özel Matematik Çalışmam (plan_talha_1)
exam_id_2 = 'plan_talha_1'
exam_title_2 = 'Bana Özel Matematik Çalışmam: Üçgenler ve Pisagor Pekiştirme'
res_id_2 = f'result_{exam_id_2}_student_muhammed_talha'
sess_id_2 = f'sess_{exam_id_2}_student_muhammed_talha'

conn.execute("""
INSERT OR REPLACE INTO exams (id, title, teacher_id, question_count, duration_minutes, status, created_at)
VALUES (?, ?, '170c1e8f-52b4-440e-b605-ec974fa1d56b', 12, 30, 'active', datetime('now', '-1 day'))
""", (exam_id_2, exam_title_2))

conn.execute("""
INSERT OR REPLACE INTO exam_assignments (id, exam_id, student_id, assigned_by, status, duration_min, assigned_at, due_at)
VALUES (?, ?, 'student_muhammed_talha', 'system', 'completed', 30, datetime('now', '-1 day'), datetime('now', '-20 hours'))
""", (f'assign_{exam_id_2}_student_muhammed_talha', exam_id_2))

conn.execute("""
INSERT OR REPLACE INTO exam_sessions (id, exam_id, student_id, started_at, deadline, submitted_at, current_q)
VALUES (?, ?, 'student_muhammed_talha', datetime('now', '-21 hours'), datetime('now', '-20 hours'), datetime('now', '-20 hours'), 12)
""", (sess_id_2, exam_id_2))

conn.execute("""
INSERT OR REPLACE INTO exam_results (id, exam_id, student_id, correct_count, wrong_count, blank_count, net_score, total_duration_seconds, created_at, completed_at)
VALUES (?, ?, 'student_muhammed_talha', 9, 2, 1, 8.33, 1440, datetime('now', '-20 hours'), datetime('now', '-20 hours'))
""", (res_id_2, exam_id_2))

# Topic performance for Muhammed Talha
conn.execute("""
INSERT OR REPLACE INTO student_topic_performance (id, student_id, topic_id, mastery_score, solved_count, correct_count, wrong_count, status, last_tested_at)
VALUES ('perf_talha_top_carpanlar_katlar', 'student_muhammed_talha', 'top_carpanlar_katlar', 75, 8, 6, 2, 'good', datetime('now'))
""")
conn.execute("""
INSERT OR REPLACE INTO student_topic_performance (id, student_id, topic_id, mastery_score, solved_count, correct_count, wrong_count, status, last_tested_at)
VALUES ('perf_talha_top_ucgenler', 'student_muhammed_talha', 'top_ucgenler', 78, 14, 10, 3, 'good', datetime('now'))
""")
conn.execute("""
INSERT OR REPLACE INTO student_topic_performance (id, student_id, topic_id, mastery_score, solved_count, correct_count, wrong_count, status, last_tested_at)
VALUES ('perf_talha_top_cebirsel_ifadeler', 'student_muhammed_talha', 'top_cebirsel_ifadeler', 100, 2, 2, 0, 'mastered', datetime('now'))
""")

conn.commit()
print("Muhammed Talha completed exam results, questions, mistakes, and post-exam evaluations successfully seeded!")

# Export to data/database_export.json
tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
db_data = {t: [dict(r) for r in conn.execute(f"SELECT * FROM {t}").fetchall()] for t in tables}
json.dump({'tables': db_data}, open(r'c:\Users\user\OneDrive\Desktop\Ali Metin\data\database_export.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print("Updated database_export.json successfully!")
conn.close()
