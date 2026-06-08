-- Seed quiz: Професії в ІТ
-- Run after docs/supabase-schema.sql.

insert into public.quizzes (slug, title, description, default_question_count, is_active)
values (
  'it-professions',
  'Професії в ІТ',
  'Міні-квіз про те, хто чим займається в ІТ-команді.',
  10,
  true
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  default_question_count = excluded.default_question_count,
  is_active = excluded.is_active,
  updated_at = now();

create or replace function pg_temp.add_it_professions_question(
  p_quiz_id uuid,
  p_question_text text,
  p_question_type text,
  p_visual_type text,
  p_difficulty text,
  p_tags text[],
  p_explanation text,
  p_sort_order int,
  p_answers text[],
  p_correct_index int
)
returns void
language plpgsql
as $seed_function$
declare
  question_id_value uuid;
  answer_index int;
begin
  insert into public.quiz_questions (
    quiz_id, question_text, question_type, visual_type, difficulty, tags, explanation, is_active, sort_order
  ) values (
    p_quiz_id, p_question_text, p_question_type, p_visual_type, p_difficulty, p_tags, p_explanation, true, p_sort_order
  ) returning id into question_id_value;

  for answer_index in 1..4 loop
    insert into public.quiz_answers (question_id, answer_text, is_correct, tags, sort_order)
    values (question_id_value, p_answers[answer_index], answer_index = p_correct_index, p_tags, answer_index);
  end loop;
end;
$seed_function$;

do $seed_block$
declare
  quiz_id_value uuid;
begin
  select id into quiz_id_value from public.quizzes where slug = 'it-professions';
  delete from public.quiz_questions where quiz_id = quiz_id_value;

  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто в ІТ-команді найчастіше відповідає за видиму частину сайту?', 'role', 'frontend', 'easy', array['frontend','ui'], 'Frontend-розробник створює інтерфейси, з якими взаємодіє користувач.', 1, array['Frontend-розробник','Системний адміністратор','DevOps Engineer','Database Specialist'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Яке завдання найближче до роботи Frontend-розробника?', 'task', 'frontend', 'easy', array['html','css'], 'Адаптивна сторінка, HTML, CSS і поведінка інтерфейсу належать до frontend.', 2, array['Налаштувати маршрутизатор','Зверстати адаптивну сторінку','Створити резервну копію сервера','Навчити ML-модель'], 2);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто зазвичай створює API та серверну логіку?', 'role', 'backend', 'easy', array['backend','api'], 'Backend-розробник відповідає за логіку, API, дані та серверну частину.', 3, array['Backend-розробник','UI/UX Designer','Network Engineer','Game Developer'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Що найчастіше використовує Backend-розробник?', 'tool', 'backend', 'medium', array['api','database'], 'Backend часто працює з базами даних, API та серверними фреймворками.', 4, array['SQL і серверні фреймворки','Figma-прототипи','HDMI-кабелі','Текстури для персонажів'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто може працювати і з інтерфейсом, і з серверною логікою?', 'role', 'fullstack', 'easy', array['frontend','backend'], 'Fullstack-розробник поєднує frontend і backend-задачі.', 5, array['Fullstack-розробник','QA Engineer','System Administrator','Data Analyst'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Команді потрібен прототип сайту з формою, API та базою даних. Хто може швидко зібрати все разом?', 'situation', 'fullstack', 'medium', array['product','web'], 'Fullstack найкраще підходить для швидкого створення повного web-прототипу.', 6, array['Fullstack-розробник','Network Engineer','Cybersecurity Specialist','UI/UX Designer'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто шукає помилки й перевіряє якість продукту?', 'role', 'qa', 'easy', array['testing','quality'], 'QA Engineer перевіряє сценарії, знаходить помилки та допомагає підвищити якість.', 7, array['QA Engineer','AI/ML Engineer','Database Specialist','Product Manager'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Що є типовим результатом роботи QA Engineer?', 'task', 'qa', 'medium', array['testing','bug-report'], 'Баг-репорт описує помилку, кроки, фактичний і очікуваний результат.', 8, array['Баг-репорт із кроками відтворення','Логотип продукту','Налаштований DNS','Навчена нейромережа'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто досліджує потреби користувачів і проєктує зручність?', 'role', 'ux', 'easy', array['design','users'], 'UI/UX Designer думає про сценарії, зрозумілість і зручність продукту.', 9, array['UI/UX Designer','Backend-розробник','DevOps Engineer','Embedded Engineer'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Який інструмент найчастіше асоціюється з UI/UX-дизайном?', 'tool', 'ux', 'easy', array['figma','prototype'], 'Figma часто використовується для макетів, прототипів і дизайн-систем.', 10, array['Figma','PostgreSQL','Wireshark','Docker'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто аналізує таблиці, графіки та допомагає приймати рішення на основі даних?', 'role', 'data', 'easy', array['analytics','data'], 'Data Analyst перетворює дані на висновки, звіти й візуалізації.', 11, array['Data Analyst','Game Developer','Network Engineer','System Administrator'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Яке завдання найближче до Data Analyst?', 'task', 'data', 'medium', array['dashboard','sql'], 'Аналітик створює звіти, dashboard-и та висновки на основі даних.', 12, array['Побудувати dashboard за даними','Намалювати іконку','Прокласти кабель','Налаштувати CI/CD'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто працює з моделями машинного навчання?', 'role', 'ai', 'easy', array['ai','machine-learning'], 'AI/ML Engineer створює, навчає та оцінює ML-моделі.', 13, array['AI/ML Engineer','QA Engineer','Sysadmin','Product Manager'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Яке твердження про AI/ML є міфом?', 'myth', 'ai', 'medium', array['ai','myth'], 'AI не працює магічно: потрібні дані, постановка задачі й перевірка результатів.', 14, array['AI завжди сам розуміє задачу без даних','Якість даних впливає на модель','Модель треба тестувати','Python часто використовують в AI'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто відповідає за захист акаунтів, систем і даних?', 'role', 'cybersecurity', 'easy', array['security','access'], 'Фахівець із кібербезпеки шукає ризики та захищає доступи, мережі й дані.', 15, array['Cybersecurity Specialist','Frontend-розробник','Data Analyst','Game Developer'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Користувачі отримали підозрілий лист із посиланням. Який напрям допоможе оцінити ризик?', 'situation', 'cybersecurity', 'medium', array['passwords','phishing'], 'Фішинг і безпека пошти належать до кібербезпеки.', 16, array['Cybersecurity','Gamedev','UX writing','Database indexing'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто автоматизує запуск, деплой і стабільність сервісів?', 'role', 'devops', 'easy', array['deploy','infrastructure'], 'DevOps поєднує автоматизацію, інфраструктуру, CI/CD і стабільність сервісів.', 17, array['DevOps Engineer','UI/UX Designer','QA Engineer','Data Analyst'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Який інструмент часто використовує DevOps Engineer?', 'tool', 'devops', 'medium', array['docker','ci-cd'], 'Docker допомагає запускати сервіси в контейнерах і є типовим DevOps-інструментом.', 18, array['Docker','Figma','Scratch','Excel для діаграм'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто налаштовує компʼютери, доступи та робоче середовище?', 'role', 'sysadmin', 'easy', array['systems','support'], 'System Administrator підтримує компʼютери, облікові записи, програми й інфраструктуру.', 19, array['System Administrator','AI/ML Engineer','Frontend-розробник','Product Manager'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'У кабінеті не працює доступ до спільної папки. Хто найімовірніше допоможе?', 'situation', 'sysadmin', 'medium', array['windows','support'], 'Доступи, робочі станції й спільні ресурси часто підтримує системний адміністратор.', 20, array['System Administrator','Game Developer','Data Analyst','UI Designer'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто проєктує таблиці, звʼязки та запити до даних?', 'role', 'database', 'easy', array['database','sql'], 'Database Specialist відповідає за структуру, цілісність і ефективність роботи з даними.', 21, array['Database Specialist','Embedded Engineer','Network Engineer','QA Engineer'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Що найбільше схоже на задачу Database Specialist?', 'task', 'database', 'medium', array['postgresql','schema'], 'Оптимізація SQL і схема даних є типовими задачами фахівця з баз даних.', 22, array['Оптимізувати SQL-запит','Підібрати палітру кольорів','Зробити 3D-персонажа','Налаштувати Wi-Fi канал'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто налаштовує мережі, маршрутизацію та зʼєднання пристроїв?', 'role', 'network', 'easy', array['network','internet'], 'Network Engineer працює з мережами, IP-адресами, маршрутизацією та стабільним звʼязком.', 23, array['Network Engineer','Frontend-розробник','AI/ML Engineer','Product Manager'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Який інструмент допомагає аналізувати мережевий трафік?', 'tool', 'network', 'medium', array['wireshark','protocols'], 'Wireshark використовується для перегляду пакетів і діагностики мережі.', 24, array['Wireshark','Figma','Unity','Pandas'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто програмує пристрої, датчики або роботів?', 'role', 'embedded', 'easy', array['robotics','hardware'], 'Embedded/Robotics Engineer пише код для пристроїв, контролерів і датчиків.', 25, array['Embedded/Robotics Engineer','Data Analyst','UI/UX Designer','DevOps Engineer'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Яке завдання найближче до Embedded/Robotics Engineer?', 'task', 'embedded', 'medium', array['arduino','sensors'], 'Робота з датчиками та контролерами належить до embedded/robotics.', 26, array['Зчитати дані з датчика температури','Створити рекламний банер','Перевірити орфографію','Побудувати фінансовий dashboard'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто створює ігрову логіку, сцени та взаємодію в грі?', 'role', 'gamedev', 'easy', array['games','unity'], 'Game Developer працює з механіками, сценами, правилами гри й інтерактивністю.', 27, array['Game Developer','Database Specialist','Network Engineer','Cybersecurity Specialist'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Який інструмент часто повʼязаний із GameDev?', 'tool', 'gamedev', 'medium', array['unity','csharp'], 'Unity часто використовують для створення 2D/3D ігор і симуляцій.', 28, array['Unity','PostgreSQL','Supabase Auth','Cisco Packet Tracer'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Хто координує команду, пріоритети та цілі продукту?', 'role', 'manager', 'easy', array['product','team'], 'Product/Project Manager допомагає команді рухатися до цілей, узгоджує задачі та пріоритети.', 29, array['Product/Project Manager','Backend-розробник','System Administrator','QA Engineer'], 1);
  perform pg_temp.add_it_professions_question(quiz_id_value, 'Команда має багато ідей, але треба визначити пріоритети релізу. Хто допоможе організувати рішення?', 'situation', 'manager', 'medium', array['planning','communication'], 'Менеджер допомагає визначати пріоритети, планувати роботу та синхронізувати команду.', 30, array['Product/Project Manager','Embedded Engineer','Network Engineer','Game Developer'], 1);
end $seed_block$;
