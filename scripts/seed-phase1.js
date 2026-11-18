const { getDb, saveDb } = require('../src/lib/db/database.ts');

async function main() {
  const db = await getDb();

  // 1. Örnek Hazırbulunuşluk ve Başlangıç Seviye Testi
  db.run(`
    INSERT OR IGNORE INTO diagnostic_tests (id, teacher_id, title, description, grade_level, total_questions, duration_minutes, is_active)
    VALUES 
    ('diag-lgs-01', '170c1e8f-52b4-440e-b605-ec974fa1d56b', 'LGS Matematik Hazırbulunuşluk ve Başlangıç Seviye Tespit Sınavı', 
     'Öğrencinin 8. sınıf LGS matematik konularındaki temel işlem, akıl yürütme, grafik okuma ve problem çözme becerilerini ölçen kapsamlı tanılama testi.', 
     8, 20, 45, 1);
  `);

  // 2. Elif Yılmaz ve Burak Demir için Başlangıç Değerlendirme Sonuçları
  db.run(`
    INSERT OR REPLACE INTO student_diagnostic_results (
      id, test_id, student_id, overall_score, overall_level, is_provisional, confidence_rating,
      calc_skill_score, problem_solving_score, graphic_table_score, math_reasoning_score, new_gen_score, time_management_score,
      strong_topics_json, weak_topics_json, sub_outcome_deficits_json, suggested_start_plan_json
    ) VALUES (
      'diag-res-elif', 'diag-lgs-01', '50fa22f6-1021-4dde-8278-2339fa65030d', 72.5, 'orta', 1, 0.70,
      82.0, 68.0, 75.0, 70.0, 65.0, 78.0,
      '["Üslü İfadeler", "Veri Analizi", "Cebirsel İfadeler"]',
      '["Çarpanlar ve Katlar (EBOB-EKOK Problemleri)", "Kareköklü İfadeler (Gerçek Sayılar)"]',
      '["EBOB-EKOK problemlerinde ortak bölen adımı", "Kareköklü sayılarda yaklaşık değer tahmini"]',
      '{"focusTopic": "Çarpanlar ve Katlar", "weeklyTargetQuestions": 120, "dailyMinutes": 45, "recommendedLevel": "Orta Ağırlıklı"}'
    );
  `);

  db.run(`
    INSERT OR REPLACE INTO student_diagnostic_results (
      id, test_id, student_id, overall_score, overall_level, is_provisional, confidence_rating,
      calc_skill_score, problem_solving_score, graphic_table_score, math_reasoning_score, new_gen_score, time_management_score,
      strong_topics_json, weak_topics_json, sub_outcome_deficits_json, suggested_start_plan_json
    ) VALUES (
      'diag-res-burak', 'diag-lgs-01', '4685e009-c47e-4747-b986-f3d83f8b7eef', 64.0, 'gelismekte', 1, 0.65,
      70.0, 58.0, 62.0, 60.0, 55.0, 60.0,
      '["Doğrusal Denklemler", "Veri Analizi"]',
      '["Üçgenler (Pisagor Bağıntısı)", "Basit Olayların Olasılığı"]',
      '["Pisagor teoreminde dik kenar bağıntısı", "Olasılık hesaplamalarında örnek uzay tespiti"]',
      '{"focusTopic": "Üçgenler", "weeklyTargetQuestions": 90, "dailyMinutes": 35, "recommendedLevel": "Temel ve Orta"}'
    );
  `);

  // 3. Akıllı Yanlış Analizi Örnekleri (10 Hata Türü)
  db.run(`
    INSERT OR REPLACE INTO smart_mistake_analyses (
      id, student_id, question_id, topic_id, subtopic_id, student_answer, correct_answer,
      primary_error_type, ai_probability, ai_reasoning_explanation, verified_by_teacher, verified_by_student, teacher_note
    ) VALUES 
    (
      'mistake-1', '50fa22f6-1021-4dde-8278-2339fa65030d', 'q-ebob-1', 'top_carpanlar_katlar', 'sub_ebob_ekok_problemleri', 'B', 'D',
      'islem_hatasi', 0.88,
      'Öğrencinin EBOB mantığını kavradığı ancak 72 ve 96 sayılarının asal çarpan algoritmasında 3. adımda çıkarma/bölme işlem hatası yaptığı düşünülmektedir.',
      1, 1, 'Öğrenciyle derste incelendi; işlem basamaklarını acele yapmaktan kaynaklanmış.'
    ),
    (
      'mistake-2', '50fa22f6-1021-4dde-8278-2339fa65030d', 'q-uslu-1', 'top_uslu_ifadeler', 'sub_uslu_problemler', 'A', 'C',
      'yanlis_okuma', 0.82,
      'Soru kökündeki \"en az kaç kutu gereklidir\" ifadesi yerine kutuların toplam hacmine odaklanılmış; soruyu eksik okuma ihtimali yüksektir.',
      1, 0, 'Soru kökündeki olumsuz/şart ifadelerinin altını çizmesi hatırlatıldı.'
    ),
    (
      'mistake-3', '50fa22f6-1021-4dde-8278-2339fa65030d', 'q-karekok-1', 'top_karekoklu_ifadeler', 'sub_ondalik_karekok', 'C', 'B',
      'model_kuramama', 0.79,
      'Ondalık gösterimin kesir haline getirilmesi aşamasında kök dışına çıkarma kuralı doğru uygulanmış ancak geometri alan bağıntısıyla model kurulamamıştır.',
      0, 0, NULL
    );
  `);

  // 4. Aralıklı Tekrar ve Unutma Riski Örnekleri
  db.run(`
    INSERT OR REPLACE INTO spaced_repetition_items (
      id, student_id, topic_id, source_type, source_id, question_text,
      repetition_level, ease_factor, interval_days, next_review_at, last_performance, forgetting_risk, is_mastered
    ) VALUES 
    (
      'sr-1', '50fa22f6-1021-4dde-8278-2339fa65030d', 'top_carpanlar_katlar', 'mistake', 'q-ebob-1',
      'İki çuval pirinç ve mercimek poşetlere eşit ve hiç artmayacak şekilde paylaştırılacaktır...',
      2, 2.5, 3, datetime('now', '+1 day'), 'incorrect', 'dusuk', 0
    ),
    (
      'sr-2', '50fa22f6-1021-4dde-8278-2339fa65030d', 'top_uslu_ifadeler', 'outcome', 'sub_uslu_islemler',
      'Tabanları aynı üsleri farklı üslü sayılarda bölme ve çarpma kuralı uygulaması...',
      3, 2.6, 7, datetime('now', '+3 days'), 'correct', 'orta', 0
    ),
    (
      'sr-3', '50fa22f6-1021-4dde-8278-2339fa65030d', 'top_karekoklu_ifadeler', 'mistake', 'q-karekok-1',
      'Alanı 2,89 cm² olan karenin bir kenar uzunluğu ile alanı 1,44 cm² olan dairenin çapı...',
      1, 2.3, 1, datetime('now', '-2 days'), 'incorrect', 'yuksek', 0
    );
  `);

  // 5. Günlük Hedef Örneği
  const todayStr = new Date().toISOString().split('T')[0];
  const dailyItems = JSON.stringify([
    { id: 'item-1', type: 'topic_review', title: '10 dk: Üslü ifadeler özellikler konu özeti', durationMin: 10, questionCount: 0, completed: true },
    { id: 'item-2', type: 'medium_questions', title: '15 soru: Üslü ifadeler orta seviye test', durationMin: 20, questionCount: 15, completed: true },
    { id: 'item-3', type: 'topic_practice', title: '10 soru: Çarpanlar ve Katlar EBOB-EKOK pratik', durationMin: 15, questionCount: 10, completed: false },
    { id: 'item-4', type: 'spaced_repetition', title: '5 soru: Önceki yanlışların aralıklı tekrarı', durationMin: 10, questionCount: 5, completed: false },
    { id: 'item-5', type: 'new_gen', title: '5 soru: LGS formatında yeni nesil problem', durationMin: 15, questionCount: 5, completed: false }
  ]);

  db.run(`
    INSERT OR REPLACE INTO daily_student_goals (
      id, student_id, goal_date, title, items_json, total_minutes, total_questions, completed_minutes, completed_questions, is_fully_completed, rolled_over_to_next_day
    ) VALUES (
      'goal-elif-today', '50fa22f6-1021-4dde-8278-2339fa65030d', '${todayStr}',
      'Bugünkü LGS Matematik Çalışma Planım',
      '${dailyItems.replace(/'/g, "''")}',
      70, 35, 30, 15, 0, 0
    );
  `);

  // 6. Ders Takvimi & Ders Kaydı
  db.run(`
    INSERT OR REPLACE INTO teacher_lesson_schedules (
      id, teacher_id, student_id, lesson_date, start_time, duration_minutes, status, topic_id, planned_goals
    ) VALUES 
    (
      'sched-1', '170c1e8f-52b4-440e-b605-ec974fa1d56b', '50fa22f6-1021-4dde-8278-2339fa65030d',
      '${todayStr}', '17:00', 60, 'completed', 'top_carpanlar_katlar',
      'EBOB-EKOK yeni nesil problem çözme stratejileri ve soru kökü analizi.'
    ),
    (
      'sched-2', '170c1e8f-52b4-440e-b605-ec974fa1d56b', '50fa22f6-1021-4dde-8278-2339fa65030d',
      datetime('now', '+3 days'), '16:30', 60, 'scheduled', 'top_uslu_ifadeler',
      'Bilimsel gösterim ve çok büyük/küçük sayılarda üs dönüşümleri.'
    );
  `);

  db.run(`
    INSERT OR REPLACE INTO lesson_history_records (
      id, schedule_id, teacher_id, student_id, lesson_date, topic_id, subtopics_covered, questions_solved_count,
      student_performance_rating, teacher_private_notes, teacher_parent_notes, assigned_homework, next_lesson_goals
    ) VALUES (
      'hist-1', 'sched-1', '170c1e8f-52b4-440e-b605-ec974fa1d56b', '50fa22f6-1021-4dde-8278-2339fa65030d',
      '${todayStr}', 'top_carpanlar_katlar', 'EBOB-EKOK problemleri, ortak bölen analizi', 18, 4,
      'Öğrencinin dikkati gayet iyiydi; yalnızca çarpan algoritmasında acele etmemesi gerekiyor.',
      'Elif bugün EBOB-EKOK yeni nesil sorularında oldukça başarılı bir ilerleme kaydetti. Çözüm adımlarını sakin şekilde yazması konusunda mutabık kaldık.',
      'Soru bankasından 15 adet orta seviye EBOB-EKOK testi.',
      'Bir sonraki derste Üslü İfadeler bilimsel gösterim ve modelleme çalışacağız.'
    );
  `);

  // 7. Ödev Takip Örnekleri
  db.run(`
    INSERT OR REPLACE INTO student_homework_assignments (
      id, teacher_id, student_id, title, description, topic_id, question_count, difficulty_level,
      start_date, due_date, status, completed_question_count, correct_count, wrong_count, completion_percentage, share_with_parent
    ) VALUES 
    (
      'hw-1', '170c1e8f-52b4-440e-b605-ec974fa1d56b', '50fa22f6-1021-4dde-8278-2339fa65030d',
      'Çarpanlar ve Katlar Pekiştirme Ödevi',
      'EBOB-EKOK ve aralarında asal sayılar 15 soruluk haftalık hedef ödevi.',
      'top_carpanlar_katlar', 15, 3, '${todayStr}', datetime('now', '+4 days'),
      'started', 10, 8, 2, 66.6, 1
    ),
    (
      'hw-2', '170c1e8f-52b4-440e-b605-ec974fa1d56b', '50fa22f6-1021-4dde-8278-2339fa65030d',
      'Üslü Sayılar Bilimsel Gösterim Testi',
      'Yeni nesil grafikli ve modellemeli 12 soru.',
      'top_uslu_ifadeler', 12, 4, '${todayStr}', datetime('now', '+7 days'),
      'assigned', 0, 0, 0, 0.0, 1
    );
  `);

  // 8. Konu Anlatımı / Mini Ders
  db.run(`
    INSERT OR REPLACE INTO mini_lesson_topics (
      id, topic_id, title, summary_text, formulas_json, solved_examples_json, video_url, is_active
    ) VALUES (
      'mini-ebob-ekok', 'top_carpanlar_katlar',
      'EBOB ve EKOK Stratejileri ile Yeni Nesil Problem Çözümü',
      'İki veya daha fazla doğal sayının ortak bölenlerinin en büyüğüne EBOB; ortak katlarının en küçüğüne EKOK denir. Parçadan bütüne gidiliyorsa (küçük kutulardan büyük kutu) EKOK; bütünden parçaya gidiliyorsa (büyük çuvallardan küçük poşetler) EBOB kullanılır.',
      '["a · b = EBOB(a, b) · EKOK(a, b)", "Aralarında asal iki sayının EBOB''u 1, EKOK''u çarpımlarına eşittir."]',
      '[{"question": "Kenarları 24 m ve 36 m olan dikdörtgen şeklindeki bir bahçenin etrafına köşelere de gelmek şartıyla eşit aralıklarla en az kaç ağaç dikilir?", "solution": "Bütünden eşit parçalara bölündüğü için EBOB(24, 36) = 12 metredir. Çevre = 2 · (24 + 36) = 120 m. Ağaç sayısı = 120 / 12 = 10 ağaç."}]',
      'https://www.youtube.com/watch?v=sample-ebob', 1
    );
  `);

  // 9. Başarı Rozetleri
  db.run(`
    INSERT OR REPLACE INTO student_achievement_badges (
      id, student_id, badge_code, badge_title, badge_description, icon, category
    ) VALUES 
    ('b-1', '50fa22f6-1021-4dde-8278-2339fa65030d', 'first_100', 'İlk Adım', 'İlk 100 matematik sorusunu başarıyla tamamladı.', '🚀', 'milestone'),
    ('b-2', '50fa22f6-1021-4dde-8278-2339fa65030d', 'consistent_worker', 'Düzenli Çalışan', '7 gün üst üste günlük matematik hedefine ulaştı.', '🔥', 'streak'),
    ('b-3', '50fa22f6-1021-4dde-8278-2339fa65030d', 'problem_solver', 'Problem Çözücü', 'LGS yeni nesil problem testinde %80 üzeri başarı gösterdi.', '🧩', 'mastery'),
    ('b-4', '50fa22f6-1021-4dde-8278-2339fa65030d', 'review_master', 'Tekrar Ustası', 'Aralıklı tekrar sorularının tamamını gününde çözdü.', '🔁', 'habit');
  `);

  // 10. LGS Geri Sayımı ve Hedefleri
  db.run(`
    INSERT OR REPLACE INTO exam_countdown_settings (id, exam_title, target_date)
    VALUES ('lgs-target', '2027 LGS Matematik Sınavı', '2027-06-06');
  `);

  await saveDb();
  console.log('Phase 1 seed data successfully injected into SQLite database!');
}

main().catch(console.error);
